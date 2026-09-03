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

**Operational finding surfaced by this work:** the two instances behind HAProxy read **separate config directories** (`~/.zeroclaw-cerveau` and `~/.zeroclaw-cerveau-b`) and had already drifted 72 lines apart before any of this — instance B was missing the `obscura` MCP server, `parallel_tools`, two auto-approve entries, and had one `enabled` flag inverted. Delegation was applied to both so the feature is deterministic across the load balancer; **the pre-existing drift is untouched and still open.**

### Phase 2 — Synthesis step (small Rust)

Add the missing half of LobeHub's Agent Team: when a caller fans out to multiple delegates, merge the results through one explicit synthesis pass instead of concatenating them into the caller's context.

**Exit gate:** a two-delegate fan-out returns one coherent answer, with the synthesis visible as its own step in logs; token usage lower than raw concatenation on the same task.

### Phase 3 — `verifier_brain` + A2A task vocabulary (Rust)

- New agent whose only job is to review a *pending* `Irreversible` action and attach a structured finding (`verdict`, `reasoning`, `confidence`) to the approval row.
- Extend `BackgroundTaskStatus` to the A2A 7-state set; surface `InputRequired` through the existing tenant-scoped approval/notification path (it is the same UX as an approval prompt).
- Cheap layer unchanged: the risk gate still fires on 100% of traffic.

**Exit gate:** a real `finance_invoice_ops` money-touching call produces a pending approval *with* a verifier finding attached, resolvable through the existing tenant-scoped route; verifier cannot resolve it itself (proved by test); measured added latency and cost on flagged actions only; a sampled `Reversible` action also gets a finding, proving the sampling path.

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
