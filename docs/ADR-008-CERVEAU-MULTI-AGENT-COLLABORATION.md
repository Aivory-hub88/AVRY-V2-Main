# ADR-008 — Cerveau multi-agent collaboration: agents that delegate to and check each other

**Status:** Phase 1 deployed 2026-09-03; Phases 2-5 proposed
**Date:** 2026-09-02 (Phase 1 outcome appended 2026-09-03)
**Context:** The ask was "make Cerveau more like LobeHub / Grok, make Mission Control as capable as LobeHub's, and let agents talk to and check each other — it's Rust, but it should be *more* advanced, not less." This ADR answers that with a landscape scan (what LobeHub/Grok/the A2A standard actually do in 2026), an honest audit of what Cerveau already has, and a phased build that starts from the parts that are already written and dormant.

Related: [ADR-002](ADR-002-CERVEAU-TENANT-DESIGN.md) (tenant isolation), [ADR-006](ADR-006-CERVEAU-CLIENT-DEPLOYMENT-API.md) (client deployment + tenant custom MCP), [ADR-007](ADR-007-CERVEAU-COGNEE-INTEGRATION.md) (graph memory), `CERVEAU-WORKING-OFFICE-PLANNING.md` (Mission Control).

---

## 0. The headline finding

**Cerveau already has a full agent-delegation engine, and it is switched off in production.**

`crates/zeroclaw-runtime/src/tools/delegate.rs` is **8,193 lines**. It implements:

- a `delegate` tool that lets one agent hand a task to another named agent;
- **two execution modes** (`zeroclaw-config/src/schema.rs`, `DelegateExecutionMode`):
  - `bounded` — the target runs *through* the caller: shares the caller's budgets, and its agentic tools are capped by the caller's own tool envelope;
  - `independent` — the target runs under its own policy/tool envelope, "like opening a new chat with that agent";
- **background delegation** with a real task lifecycle — `BackgroundDelegateResult { task_id, agent, status, output, error, started_at, finished_at }` over `BackgroundTaskStatus::{Running, Completed, Failed}`;
- per-target model provider, risk profile, runtime profile and skill-bundle selection;
- and a **capability-containment model** (`zeroclaw-config/src/policy.rs`) that refuses any subagent whose autonomy, `allowed_roots`, `allowed_commands`, `shell_env_passthrough`, `max_actions_per_hour`, `max_cost_per_day_cents`, `shell_timeout_secs` or approval requirements exceed its parent's. A child can only ever be *narrower* than its parent.

The config surface is `[agents.<alias>].delegates = [{ agent = "<alias>", mode = "bounded" | "independent" }]`.

The live config on the VPS (`/home/ubuntu/.zeroclaw-cerveau/config.toml`) declares six agents — `workflow_brain`, `diagnostic_brain`, `analyst_brain`, `builder_brain`, `security_brain`, `comms_brain` — and **not one `delegates` entry**. Every one of them is an island. The engine is fully built, tested, and inert.

That reframes the whole request: this is mostly a **wiring and product-surface** problem, not a "build multi-agent in Rust" problem.

---

## 1. What the field actually does in 2026

### 1.1 LobeHub

The mechanism worth copying is **Agent Team**: a *supervisor* decomposes a task and dispatches to member agents that run **in parallel with shared context**, then a dedicated **Synthesis Agent** merges the parallel outputs. (Their marketing claims ~70% faster completion on complex tasks; unverified, treat as directional.) Around it sits an agent marketplace, an MCP marketplace with one-click install, "Pages" holding shared context across parallel threads, and chain-of-thought visualisation.

Note their docs for `agent-team` and `agent-market` are currently JS-rendered migration stubs, so feature names are directionally accurate, not spec-verified.

**Delta for us:** Cerveau has the dispatch half (`delegate`, both modes, background tasks). It has **no synthesis/merge step** and **no team grouping**. Those are the two concrete things to take.

### 1.2 Grok / xAI

Publicly: OpenAI-compatible tool calling (parallel tool calls, up to 128 tools/request, 1M context), server-side built-ins (`web_search`, `x_search`, `code_interpreter`), and **Grok Skills** — account-level, persistent, slash-invoked, shareable bundles of instructions/workflow, closer to a saved macro than to an agent.

**There is no publicly documented agent-to-agent or sub-agent delegation in Grok.** Its architecture is explicitly single-agent-with-tools.

**Delta for us:** on delegation Cerveau is *ahead* of Grok, not behind. The one idea worth taking is **Skills as a first-class, user-visible, shareable artifact** — Cerveau has `skill_bundles` in config, but they are an operator-only concept today, invisible to tenants.

### 1.3 The A2A standard — and why we should *not* implement it yet

A2A (Agent2Agent) is at **v1.0**, governed by the **Agentic AI Foundation** under the Linux Foundation since 2026-08-17 — the same body where **Anthropic's MCP** is a founding project. IBM's ACP was merged into it in 2025; 150+ organisations support it; it ships in Azure AI Foundry and Amazon Bedrock AgentCore.

Its data model (normative source is `spec/a2a.proto`):

- **Agent Card** — signed JSON-LD identity document: provider, declared `skills`, endpoints, `securitySchemes` (API key / OAuth2 / mTLS / OIDC), capability flags (`streaming`, `pushNotifications`, `extendedAgentCard`);
- **Task lifecycle** — `SUBMITTED → WORKING → {COMPLETED | FAILED | CANCELED | REJECTED}`, plus the interrupt states `INPUT_REQUIRED` and `AUTH_REQUIRED`;
- **Message vs Artifact** — messages carry the conversation (`role`, `Part[]` of text/file/structured-data, `contextId`/`taskId`), artifacts carry the deliverables;
- **Transports** — JSON-RPC 2.0 + SSE, gRPC bidi streaming, or HTTP+REST with webhooks, all bound to the same protobuf model.

The clean division of labour: **MCP is agent→tool** (deterministic, call/return). **A2A is agent→agent** (negotiated, stateful, long-lived, can come back with `INPUT_REQUIRED`).

**Decision: adopt A2A's *shapes*, defer A2A's *wire protocol*.** Everything Aivory needs today is delegation *inside one Cerveau instance between agents we own* — that is a function call, and paying for HTTP + Agent Card signing + task polling to do it would be pure overhead. What we should take now is its **vocabulary**: the 7-state task lifecycle (our `BackgroundTaskStatus` has only 3 and is missing exactly the interesting ones — `InputRequired`, `Rejected`, `Canceled`), and the message-vs-artifact split. Implementing the wire protocol becomes worthwhile only when we want *cross-instance* or *third-party* agents to participate (see §4, Phase 4). No Rust crate implements A2A today, so that would be ours to write against `a2a.proto`.

Adjacent: **AGNTCY** (Linux Foundation, Cisco-originated) is the registry/identity layer — OASF schema for skills-based agent discovery, verifiable agent credentials. Relevant only in the Phase 4 world.

### 1.4 Orchestration and verification patterns that actually ship

- **Supervisor / orchestrator-worker is the 2026 default** — OpenAI Agents SDK "handoffs" (successor to Swarm), Claude Agent SDK subagents (**hard-capped at one level deep — subagents cannot spawn subagents**), LangGraph Supervisor, CrewAI.
- **Fan-out + aggregate**: latency bound by the slowest branch, needs explicit partial-failure handling.
- **Pipeline**: cheapest to reason about; one bad mid-stage output poisons everything downstream, so per-stage validation matters.
- **Debate / council**: ~**2.5×** the cost of a single call for full council-style debate, ~**20%** premium for a lighter critique variant. Reserve for genuinely high-stakes decisions.
- **Swarm / dynamic spawning**: justified only at extreme scale (100–300 sub-agents). Not our scale; high infra cost (race conditions, population lifecycle).
- **LLM-as-judge**, and this is the important one for the "agents check each other" half of the ask: production 2026 shape is **layered, not uniform** — cheap distilled evaluators on **100%** of traffic as guardrails, expensive agent-as-judge/debate-grade verification only on **sampled (1–10%) or anomaly-flagged** cases, humans only on what that flags. Peer-reviewed caveats are real: documented LLM-judge blind spots in multi-turn transactional agents and rubric-verification failures in agentic settings.

**Delta for us:** a checker agent on *every* action is the expensive, evidence-discouraged design. Cerveau already has the correct hook for the cheap layer — the **risk-tier/approval gate** (`Irreversible` tools already stop for approval). The right build is "checker agent runs on the actions the gate already flags," not "checker agent runs on everything."

---

## 2. Where Cerveau genuinely stands

| Capability | LobeHub | Grok | Cerveau today | Verdict |
|---|---|---|---|---|
| Agent→tool via MCP | ✅ marketplace | ✅ built-ins + custom fns | ✅ stdio/SSE/HTTP client, tenant-registered servers (ADR-006) | **at parity or ahead** |
| Deferred tool loading (token bloat) | — | — | ✅ `mcp_deferred.rs` + `tool_search.rs` | **ahead** |
| Agent→agent delegation | ✅ Agent Team | ❌ none public | ⚠️ **built (8k lines, 2 modes, background tasks) but zero config** | **dormant** |
| Capability containment for subagents | not documented | n/a | ✅ parent-envelope containment in `policy.rs` | **ahead** |
| Synthesis/merge of parallel results | ✅ Synthesis Agent | n/a | ❌ | **gap** |
| Agent checks another's work | debate mode (thin) | ❌ | ⚠️ approval gate exists; no critic agent | **gap** |
| Multi-tenant isolation of all of the above | n/a (single-user) | n/a | ✅ tenant-scoped memory/tools/approvals | **well ahead** |
| Mission Control activity surface | CoT visualisation | ❌ | ⚠️ Mission Control + Notification Centre shipped, single-agent view | **gap** |

The honest summary: **Cerveau's runtime is more capable than its product surface admits.** Nothing here requires new Rust primitives before Phase 3.

---

## 3. Design decisions

1. **Use the native `delegate` engine for intra-instance agent-to-agent. Do not implement A2A wire protocol yet.** In-process delegation is a function call; A2A's value is crossing an ownership boundary we do not cross today.
2. **Adopt A2A's task vocabulary now, so a later A2A adapter is a mapping and not a migration.** Extend `BackgroundTaskStatus` from 3 states to A2A's 7 (`Submitted`, `Working`, `InputRequired`, `AuthRequired`, `Completed`, `Failed`, `Canceled`, `Rejected`). `InputRequired` is the one with immediate product value: it is exactly "the sub-agent needs the tenant to answer something," which today has nowhere to go.
3. **Default every delegation to `bounded`.** `independent` escapes the caller's tool envelope; it should be an explicit, reviewed choice per pair, never the default.
4. **Cap delegation depth at one level, matching Claude Agent SDK.** A delegate may not itself delegate. This is the single cheapest defence against runaway cost and cyclic delegation, and the containment model in `policy.rs` already makes each hop strictly narrower.
5. **Verification is layered, not uniform.** The existing risk-tier gate stays the 100%-traffic cheap layer. A `verifier_brain` runs only on actions the gate already marks `Irreversible` (and on a small sample of `Reversible` ones for calibration). Never on every message — the evidence says that is ~2.5× cost for benefit concentrated in high-stakes cases.
6. **The verifier must never be able to approve.** It produces a finding attached to the pending approval; a human still resolves it. An agent that can both propose and bless an irreversible action defeats ADR-006 §B5's whole point.
7. **Tenant-visible Skills, borrowed from Grok.** Promote `skill_bundles` from operator-only config to a tenant-visible, per-agent listing in the dashboard. Read-only first; authoring later.

---

## 4. Phasing

Each phase is independently shippable and independently valuable. Exit gates are live-verifiable, in the style of ADR-006.

### Phase 1 — Wake the engine (config only, no Rust) — ✅ **DEPLOYED 2026-09-03**

> **The pairings first sketched here were wrong, and the gate count was wrong.** Both are corrected below from what the live system actually does. Kept visible rather than silently rewritten, because the mistake is the instructive part.

**Correction 1 — bounded mode intersects tools, so a target broader than its caller runs crippled, not refused.** `bounded_agentic_tools_are_capped_by_caller_policy` (`delegate.rs`) is explicit: a tool in the target's own profile but absent from the caller's yields *nothing*. Measured against the live envelopes:

| Agent | tools | agentic |
|---|---|---|
| `workflow_brain` | 2 (`tool_search`, `http_request`) | yes |
| `comms_brain` | 5 | **no** |
| `diagnostic_brain` | 10 | yes |
| `security_brain` | 10 (incl. `shell`) | yes |
| `analyst_brain` | 12 | yes |
| `builder_brain` | 14 (incl. `shell`, `git_operations`) | yes |

So the original `workflow_brain → builder_brain` would have handed `builder_brain` two tools — no `file_write`, no `shell` — an expensive model call that cannot build anything. And `comms_brain → analyst_brain` put a non-agentic agent in the caller seat, where there is no tool loop to run a delegation from.

**Correction 2 — waking delegation takes four gates, not one.** `delegates` alone changes nothing; the tool never even registers:

1. `agents.<caller>.delegates` — the reachability allow-list.
2. `risk_profiles.<profile>.allowed_tools` must contain `"delegate"` — it is allow-listed like any other tool.
3. `risk_profiles.<profile>.delegation_policy.mode = "allow"` — **defaults to `forbidden`**, fail-closed. This is the gate that silently keeps everything off.
4. `"delegate"` in `auto_approve` — the profiles are `supervised` with `require_approval_for_medium_risk`, and the webhook/Console path has no interactive approver, so the hop is denied fail-closed. Auto-approving it is sound because the hop grants no new capability: bounded mode caps the target at the caller's own ceiling, depth is 1, and every risky action *inside* the sub-agent still hits its own per-tool gate.

**What shipped** (on the user's call to enable it for every agent): a full mesh — all six agents may delegate to all five others, `bounded` everywhere, `max_delegation_depth = 1` everywhere so no chains or cycles can form.

**Exit gate — met.** Verified almost entirely without spending tokens, via `config get` and `GET /api/tools?agent=<alias>`, which exposes the delegate tool's advertised target list:

- each agent advertises exactly its five peers and correctly excludes itself;
- before wiring, an untouched agent showed `(delegate tool not registered)` — the control;
- one real hop executed end-to-end: `diagnostic_brain` → `analyst_brain` returned `analyst_brain replied: PONG`.

Total spend for the whole exercise: **five short model calls.**

**Cost characteristics.** The hop is opt-in per turn — the model only pays when it chooses to delegate. The measured round trip was ~65s wall clock for two model calls, so latency, not just spend, is the thing to watch on interactive paths.

**Operational finding surfaced by this work:** the two instances behind HAProxy read **separate config directories** (`~/.zeroclaw-cerveau` and `~/.zeroclaw-cerveau-b`). A raw `diff` of the two files showed ~72 differing lines, but almost all of it is line-ordering noise and per-instance-correct paths (`obscura`/`pdf-oxide`'s `command`/`tenant_workspace_root` legitimately differ, one path per instance). Compared **semantically** (resolved `config get` values, not file text) instead, the real drift is five settings: `browser.enabled` (A `false`/B `true`), `capability_graph.enabled` (A `true`/B `false`), `agent_analyst_brain.parallel_tools` (A on/B unset), and two tools missing from B's `agent_analyst_brain.auto_approve`/`tool_risk_tiers.reversible` (`enrich_lead_contact`, `pdfoxide_fill_form`). Delegation was applied to both instances so the feature is deterministic across the load balancer; **these five pre-existing differences are untouched and still open** — the two `enabled` flags in particular look like a real behavioral fork worth a deliberate decision, not an oversight to silently reconcile.

### Phase 2 — Parallel fan-out + synthesis — ✅ **already exists, verified live 2026-09-03, no Rust needed**

**This phase turned out to already be built.** `DelegateTool::execute_parallel` (`delegate.rs`) spawns every named agent concurrently via `parallel=[...]` and `await_sessions` for the background variant — the fan-out half of LobeHub's Agent Team was never missing. What was genuinely unclear was the synthesis half: whether results reach the caller as raw concatenated blocks it has to make sense of unaided, or whether something merges them first.

**Verified live:** `diagnostic_brain` was asked to fan out to `analyst_brain` and `builder_brain` in parallel (trivial prompt, "reply with only PONG") and asked for one combined sentence, not the raw outputs. It correctly reported *"Both the analyst and builder agents responded successfully, each returning exactly 'PONG' as requested"* — a real synthesis, not a dump of two `--- agent (success=true) ---\nPONG` blocks. Reading `execute_parallel`'s own code confirms why: results ARE returned to the caller as raw concatenated blocks (no dedicated merge step in Rust), and the caller's own next completion synthesizes them — the same shape OpenAI's own parallel-tool-call pattern uses, not a separate "Synthesis Agent" role.

**Revised assessment:** a dedicated synthesis agent (LobeHub's literal design) would earn its cost mainly at a fan-out size where raw concatenation would overwhelm the caller's own context — meaningfully more than the 2-5 delegates realistic at Aivory's current agent count. At this scale, "the caller synthesizes in its own next turn" is not a missing feature; it is the feature, and it already works. No Rust change is needed for Phase 2. Revisit only if a future fan-out width makes raw concatenation itself the bottleneck.

### Phase 3a — `verifier_brain` second-opinion sweep — ✅ **DEPLOYED + live-verified on both instances, 2026-09-03**

Rejected the originally-planned inline hook in `approval_gate.rs`: that function runs inside `TurnCtx`, which has no `Config` in scope (only a resolved `ApprovalManager` and borrowed turn state) — threading one through would touch every turn in the system for a feature that only matters on the rare `Pending` path. Built as a decoupled periodic sweep instead, modelled on `control_plane::reaper`'s own spawn/interval shape and spawned from `daemon::boot` (where a live `Config` already exists, same as the reaper and the F-1 goal-resume drive):

- `pending_approvals.rs`: new nullable `verifier_finding` column; `list_unverified_pending()` / `attach_verifier_finding()`.
- `verifier_sweep.rs` (new): every 20s, loads unverified pending rows, runs `verifier_brain` per row through the same `agent::loop_::run` entry point cron jobs already use, with `allowed_tools: Some(vec![])` — structurally zero tools, not a policy convention — and writes back a `{"verdict","reasoning","confidence"}` finding. Fails open: a spawn/LLM/parse failure becomes a visible `"error"`-verdict finding, never a silent gap.
- `api_approvals.rs` / `api_tenant_approvals.rs`: `verifier_finding` now surfaces in the approval JSON on both the operator and tenant-scoped routes (they share one serializer).
- VPS config (`~/.zeroclaw-cerveau{,-b}/config.toml`, both backed up first): `[agents.verifier_brain]` with `risk_profiles.agent_verifier_brain.allowed_tools = []` and `delegation_policy.mode = "forbidden"`. Deliberately **not** added to any other agent's `delegates` list — unreachable via the `delegate` tool, invocable only by the sweep.

**Why it can't approve its own finding:** approval resolution is an HTTP-only surface (`api_approvals`/`api_tenant_approvals`) with no corresponding runtime `Tool` — a model with zero tools cannot reach an HTTP route no matter what it decides to do. This is the same non-negotiable property as decision 6, just enforced by the agent having no tools at all rather than by a narrower allow-list.

**Not yet started (split out of the original Phase 3 scope):** the `BackgroundTaskStatus` → A2A 7-state extension and `InputRequired` surfacing. Bundling it into this change would have coupled an orthogonal dashboard-facing vocabulary change to the verifier's storage/sweep plumbing; tracked as Phase 3b below.

**Exit gate — met on both instances:** CI (`cerveau-build`/`cerveau-quick`, both green on `2325e1f9`) built and published the rolling `cerveau-cd` release; binary swapped on both `zeroclaw-cerveau` (`:3100`) and `zeroclaw-cerveau-b` (`:3101`) after a sha256-verified download (both old binaries backed up first — they share one `/usr/local/bin/zeroclaw-cerveau` path, so the swap needed a brief coordinated stop/start of both, not a rolling one). Both came back healthy (`/health` on `:3100`, `:3101`, and the `:3105` HAProxy front all report every component `ok`), zero warnings/errors in the journal post-restart.

Live-verified per instance with a synthetic Irreversible-tier row inserted directly into each instance's own `pending_approvals` table (a real Gmail-send / Slack-notify approval, never actually executed — inserted, observed, then deleted, so no fake approval was left sitting where a human could mistakenly act on it):
- **Instance A:** `GMAIL_SEND_EMAIL` row → finding attached in 22s: `{"verdict":"ok","confidence":0.85,"reasoning":"Legitimate email sending operation via Gmail integration..."}`.
- **Instance B:** `SLACK_SEND_MESSAGE` row → finding attached in 18s: `{"verdict":"ok","confidence":0.95,"reasoning":"Standard deployment notification to an operations Slack channel..."}`.

Both well inside the 20s sweep interval's first tick, both coherent and correctly scoped to the tool actually being reviewed. The "cannot resolve its own approval" property was not re-tested live (there is nothing to click — approval resolution is an HTTP route with no matching `Tool`, and `verifier_brain`'s `allowed_tools` is `[]` in both live configs, confirmed by parsing both TOML files after the edit); that is a structural guarantee, not a behavioral one, so static confirmation is the correct proof, not a second LLM call to watch it fail to do something it has no way to attempt.

### Phase 3b — A2A task vocabulary (Rust) — investigated 2026-09-03, deliberately NOT started

- Extend `BackgroundTaskStatus` to the A2A 7-state set; surface `InputRequired` through the existing tenant-scoped approval/notification path (it is the same UX as an approval prompt).
- Cheap layer unchanged: the risk gate still fires on 100% of traffic.

**Why this stopped at investigation instead of proceeding straight into code, unlike Phase 3a:** `BackgroundTaskStatus` is not one enum with one call site — it is the on-disk JSON format for every background delegate task's result file (`#[derive(Serialize, Deserialize)]`, `#[serde(rename_all = "snake_case")]`, 4 variants: `Running`/`Completed`/`Failed`/`Cancelled`), which a *second*, richer runtime-only enum (`BackgroundResultState`, 6 variants — adds `Lost`/`TimedOut` for reaper-detected orphans) derives from via `from_file_status`, which itself gets mapped to a *third* enum (`crate::control_plane::TaskStatus`, the SQLite-persisted task-registry status) at task completion — all three kept in sync by hand across roughly 30 call sites in one 8,000-line file (`delegate.rs`). Extending to A2A's 7 states (`submitted`/`working`/`input-required`/`completed`/`canceled`/`failed`/`rejected`) means deciding a compatibility story for all three representations at once, including whatever background delegate task result files are sitting on disk *right now* in production with the current 4-variant format — a live-data-format change, not an additive one. Phase 3a's `verifier_finding` column was purely additive (new nullable column, new independent module, zero changes to any existing serialization format), which is why it was safe to design-and-ship in one pass; this is not that shape of change, and doing it well needs a real design pass (three-enum unification strategy, on-disk migration/tolerance plan, and an honest answer to whether `InputRequired` even makes sense for a background delegate task today, since nothing currently pauses one mid-flight for approval) rather than a plausible-looking patch applied overnight with no one available to review the trade-offs. Deferred until that design pass happens, not abandoned.

### Phase 4 — Mission Control as a real multi-agent surface (dashboard)

Only meaningful once Phases 1–3 produce something to show: live delegation graph (who called whom, per turn), background task list with the 7 states, verifier findings inline on approvals, per-agent cost/latency, and a read-only Skills listing per agent.

**Exit gate:** a logged-in tenant can watch a delegation happen live and see the resulting verifier finding without reading a log file.

### Phase 5 (deferred, only on a real trigger) — A2A wire protocol

Implement Agent Card + JSON-RPC/SSE task transport against `a2a.proto`, so agents on *different* Cerveau instances — or a client's own A2A-speaking agent — can participate. **Trigger:** a concrete customer or partner requirement, not internal aesthetics. Would likely build on `rig` (`rig-core`/`rig-agent`'s `AgentRun` state machine, `rig-rmcp` for MCP) since no Rust crate implements A2A today, and would sit naturally on AGNTCY's directory/identity layer.

---

## 5. What this deliberately does not do

- **No swarm / dynamic agent spawning.** Justified at 100–300 sub-agents; we have six. Race conditions and population lifecycle are real costs with no matching benefit at our scale.
- **No debate/council by default.** ~2.5× cost, and the LLM-judge literature this year documents real blind spots in exactly our setting (multi-turn transactional agents). Phase 3's targeted verifier is the defensible version of the same idea.
- **No unbounded delegation depth.** One level, matching the Claude Agent SDK's own hard cap.
- **No agent that can approve its own irreversible action.** Non-negotiable; see decision 6.

---

## 6. Sources

- A2A specification — https://a2a-protocol.org/latest/specification/
- A2A → Agentic AI Foundation (Linux Foundation) — https://www.techzine.eu/news/devops/143659/google-transfers-a2a-to-the-agentic-ai-foundation/
- A2A adoption (150+ orgs) — https://www.linuxfoundation.org/press/a2a-protocol-surpasses-150-organizations-lands-in-major-cloud-platforms-and-sees-enterprise-production-use-in-first-year
- AGNTCY (registry/identity) — https://www.linuxfoundation.org/press/linux-foundation-welcomes-the-agntcy-project-to-standardize-open-multi-agent-system-infrastructure-and-break-down-ai-agent-silos
- xAI tools / Grok Skills — https://docs.x.ai/developers/tools/overview · https://www.infoq.com/news/2026/05/xai-grok-skills/
- LobeHub Agent Team — https://lobehub.com/docs/usage/features/agent-team (migration stub) · https://blog.brightcoding.dev/2026/04/07/lobehub-build-ai-agent-teams-that-actually-collaborate
- Orchestration patterns — https://www.digitalapplied.com/blog/multi-agent-orchestration-5-patterns-that-work · https://www.morphllm.com/openai-swarm
- LLM-as-judge economics and limits — https://futureagi.com/blog/llm-as-a-judge/ · https://arxiv.org/pdf/2606.10315 · https://arxiv.org/pdf/2606.29920
- Rust prior art — https://github.com/0xPlaygrounds/rig · https://github.com/bosun-ai/swiftide
