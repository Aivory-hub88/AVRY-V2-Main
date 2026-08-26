# Cerveau ERP Scaling Plan — Eval Harness, SAP/OData, Generic Adapter

**Status:** draft — awaiting user approval of scope, nothing executed yet
**Created:** 2026-08-23
**Related:** `CERVEAU-ERP-INTEGRATION-PLAN.md` (ERPNext, the precedent this plan extends), `CERVEAU-APPROVAL-UX-PLAN.md` (F-1 approval surface the eval harness must simulate), `ADR-007-INTEGRATION-OAUTH-DIRECTORY.md` (Composio-vs-self-hosted decision pattern), `WORKFLOW-VERSIONING-AND-FIXTURES-OVERVIEW.md` (dashboard's existing fixture/replay system — a different layer, referenced for what to reuse and what not to copy)

## Goal

Three gaps identified against the current ERP surface (ERPNext-only, live since 2026-08-22) that all need closing before scaling further:

1. **No eval harness with deterministic replay** for multi-tool ERP scenarios (e.g. "quote in HubSpot → approve in Slack → sales order in ERPNext"). Today every proof in `CERVEAU-ERP-INTEGRATION-PLAN.md` Phase 6 was a manual, hand-run, one-off webhook call. That doesn't scale to a second connector or to the autonomous-mode flip without a real regression net.
2. **No SAP/OData connector.** ERPNext is one ERP; enterprise prospects run SAP. OData first (modern, REST-shaped, matches the Composio-toolkit pattern already proven); BAPI/RFC explicitly deferred.
3. **No generic ERP adapter layer** (`erp_query`/`erp_create`-style abstraction mapped per connector). Today's architecture is deliberately per-toolkit (`ERPNEXT` Composio slugs wired directly into agent-type bundles) — there is no unification layer above it.

**Sequencing decision, and why:** eval harness first, SAP second, generic adapter last — **not** the order items were raised in. Reasoning:
- The eval harness has no dependency on a second connector — it can and should be built against ERPNext alone, then reused unmodified when SAP lands.
- Building the generic adapter with only one real connector behind it is premature abstraction — there's nothing to generalize *from* yet. Wait until SAP is live so the adapter is designed against two real, divergent shapes (Frappe DocType CRUD vs. SAP OData entity sets/BAPI wrappers), not one shape plus a guess.
- Every future connector (SAP included) benefits from the eval harness existing first — it's the regression net for the very rebase-style risk this plan is about to introduce.

---

## Phase 0 — Eval harness with deterministic replay

### 0.1 What already exists, and why it doesn't cover this

- **Cerveau's own CI gates** (`cerveau-build.yml`): tenant isolation, memory lifecycle, Postgres embedding/recall, capability graph, webhook rate-limit dimension — all real, all green, all run off the VPS per the standing "never run test suites on `tencent-vps`" rule ([[feedback-avoid-over-engineering-expensive-tests]]). This is the CI surface Phase 0 should extend, not a new pipeline.
- **Dashboard workflow fixtures** (`WORKFLOW-VERSIONING-AND-FIXTURES-OVERVIEW.md`): captures raw n8n execution data and does a *structural* live-vs-fixture diff. Explicitly **not** true offline replay — its own UI labels it "a LIVE re-run comparison." It also operates one layer down (n8n workflow executions), not on Cerveau agent turns, tool-call sequencing, or the F-1 approval gate. Not reusable as-is; useful only as a precedent for what "fixture" and "replay" should *not* silently overclaim.
- **The ERP integration plan's Phase 6 proofs** are the closest thing to a scenario today, and they're exactly what should become the first fixtures — they were already hand-verified against real production, so codifying them costs no new trust-building.

### 0.2 What a fixture captures

Per scenario, an ordered trace of:
- Tenant/agent-type context (mirrors the throwaway-tenant pattern already used for manual proofs).
- Each tool call: MCP server, tool name, args, and the **mocked response** to return (not a live call — see 0.3).
- Expected risk-tier outcome per call: auto-approved, or a `Pending` row created (and, for multi-step scenarios, the simulated human resolution — Approve/Deny — that lets execution continue to the next step).
- Final assertion: which tools were called, in what order, with what tier outcome, and the turn's final state.

### 0.3 Replay mechanics — stub the boundary, not the agent

The two live boundaries an agent turn crosses are the LLM provider (OpenRouter) and MCP tool transport. Real-LLM-cost replay on every CI run is explicitly the over-engineered path this project has already been burned by once ([[feedback-avoid-over-engineering-expensive-tests]]) — so:

- **MCP transport**: stub at `mcp_transport.rs`'s call boundary to return the fixture's recorded response instead of hitting Composio/ERPNext/HubSpot/Slack live. This is the one that must be deterministic — it's what proves risk-tier gating and cross-tool sequencing actually work.
- **LLM provider**: two tiers, not one, to balance cost vs. fidelity:
  - **Tier A (default, runs every CI build):** scripted responder returns the fixture's recorded tool-call decisions verbatim — zero LLM cost, fully deterministic, proves the runtime/approval/tiering machinery.
  - **Tier B (opt-in, scheduled or pre-release only):** real LLM call against the same scenario prompt, asserting on tool-call *shape* (right tool, right DocType/entity, right argument keys) rather than exact text — catches prompt-drift regressions Tier A can't see, at real cost. Gate this behind an explicit flag; never make it the default CI path.

### 0.4 Scenario library — starting set

Seed directly from what's already manually proven, so Phase 0 ships with zero new trust to build:
1. Fail-closed gate (no connection → refusal) — from ERP plan Phase 6 proof 1.
2. Full-chain proof (connected, read auto-approved, write reaches Composio) — proof 2.
3. Cross-agent-type isolation — proof 3.
4. **The named cross-system chain**: HubSpot quote → Slack approval message → ERPNext sales order (`MAKE_SALES_INVOICE`, already tiered `always_ask`). This is the first scenario that actually exercises multi-connector sequencing plus the F-1 `Pending` → resolve → resume path together — build it once the pattern from scenarios 1-3 is working, not first.

### 0.5 CI wiring

New job in `cerveau-build.yml` (or a sibling workflow), Tier A on every PR touching `mcp/`, `approval/`, or `risk_tiers`-adjacent code; Tier B on a schedule or pre-release tag only. Failure blocks merge — this is the regression net SAP (Phase 1) will lean on.

**Acceptance:** all 4 seed scenarios pass in CI, Tier A, on a fresh runner with zero live credentials required (stubbed transport) and zero LLM spend.

---

## Phase 1 — SAP/OData connector

### 1.1 Catalog check first — mirror ERPNext's Phase 0, don't assume the answer

Before any design commitment: query the live Composio catalog for a SAP toolkit (`GET /api/v3/tools` filtered to a SAP-related `toolkit_slug`) exactly as done for `ERPNEXT`. Two branches, and this plan cannot pick between them without that data:

- **If Composio has a maintained SAP OData toolkit**: this phase collapses to a near-repeat of the ERPNext integration — catalog curation, risk tiering, config wiring, verification — same shape, same standing rules, same "zero new processes on `tencent-vps`" constraint satisfied for free (Composio-hosted, external HTTP).
- **If Composio does not cover SAP**: a self-hosted OData bridge is needed, and that **directly conflicts** with the zero-new-processes constraint that has governed every Cerveau integration to date. This is a real open decision (see below), not something to resolve by picking a default.

### 1.2 Scope discipline — OData now, BAPI/RFC explicitly not now

Match the user's own framing: OData v2/v4 entity-set read + bounded write (create/update on standard business objects — sales orders, business partners), full stop for this phase. BAPI/RFC (SAP's older RPC-style interface, needed for deeper ECC/S4 process integration) is real future scope but out of this plan — it's a different auth model, different connection setup (SAP Gateway/RFC SDK), and meaningfully higher operational cost. Naming it here so it isn't silently forgotten, not to scope it now.

### 1.3 Risk tiering — reuse the ERPNext dual-mode design, start narrower

Same `[risk_profiles.*]` supervised-mode pattern from `CERVEAU-ERP-INTEGRATION-PLAN.md` Phase 1 (`erp-semi` / `erp-auto`, hard floor on submit/cancel/delete/workflow, `level = "full"` never used). One deliberate divergence to flag, not silently inherit: SAP's OData write surface tends to trigger heavier downstream side effects than a Frappe DocType create (pricing procedures, MRP, output determination can all fire off a single sales-order-create call). **Recommendation: start the SAP draft-write tier narrower than ERPNext's 6 slugs** — fewer auto-approvable-under-`erp-auto` actions at launch, widen only after live proofs (mirroring how ERPNext itself started at 26 curated slugs out of 52 available, not the full catalog).

### 1.4 Verification

Exact replay of the ADR-007/ERP-plan negative-path protocol (fail-closed → synthetic connection → full-chain proof → isolation → cleanup) — **and** the new Phase 0 eval harness scenario for SAP gets authored alongside this phase, not after, so SAP ships with the same regression coverage ERPNext is retrofitting in Phase 0.

### 1.5 Open decision this phase cannot resolve in advance

**If Composio has no SAP toolkit, where does a self-hosted OData bridge run without adding a process to `tencent-vps`?** Candidate answers to weigh with the user, none picked here: (a) fold it into an existing already-running process (e.g. extend `vps-bridge`'s Node process rather than spawning a new one — same discipline as "OfficeCLI needed no new process, just a new MCP bundle"), (b) host it off-VPS entirely (serverless function, matching Composio's own "external HTTP, zero VPS load" shape), (c) revisit the constraint itself if SAP demand justifies it. This is the single highest-variance unknown in the whole plan — resolve it with real catalog data before estimating effort.

---

## Phase 2 — Generic ERP adapter (`erp_query`/`erp_create`-style abstraction)

**Gated on Phase 1 landing.** Do not start this phase with only ERPNext live — there is nothing real to generalize from yet, and a one-connector abstraction is a guess wearing an interface.

### 2.1 Two designs, not one — present both, don't pick silently

**Option A — bundle-name abstraction only (lighter weight, recommended starting point).** Keep tool exposure to the LLM concrete and per-connector (ERPNext's real DocType-CRUD tools, SAP's real OData tools) — don't synthesize new tool schemas. Add only a config-level indirection: `[mcp_bundles.erp]` resolves to whichever connector the tenant actually has connected (ERPNext *or* SAP), so `agent_type_mcp_bundles` and skills reference `"erp"` generically and never need a per-connector edit when a tenant's underlying system differs. This is a direct extension of the resolution pattern ADR-007 already sketches for `resolveIntegrationCategory()` and of Cerveau's existing `agent_type_mcp_bundles` mechanism — no new abstraction layer, just one more resolution hop.

**Option B — true abstract tool layer (`erp_query`/`erp_create`), as literally requested.** A synthetic MCP-shaped tool pair whose args are generic (`entity`, `filters`, `fields` / `entity`, `fields`) and whose implementation translates to the concrete connector's real call (ERPNext DocType name + fields, or SAP OData entity set + `$filter`). Real cost to weigh honestly: (a) LLM tool-calling reliability is generally *better* against concrete, connector-real schemas than against a generic abstracted shape — the current per-toolkit design isn't an oversight, it's aligned with how these agents actually pick tools correctly; (b) the translation layer becomes a permanent maintenance surface that must track both connectors' schemas independently; (c) risk tiering gets harder to reason about — a `Pending` row for `erp_create` is less legible to a human approver than `CREATE_DOCUMENT` on `Sales Order`.

**Recommendation:** ship Option A first; treat Option B as a considered-and-deferred alternative, revisited only if a third connector makes the per-connector bundle list itself become the maintenance burden (not before).

### 2.2 Verification

Reuse Phase 0's eval harness: same seed-scenario shape, run once against a tenant on ERPNext and once against a tenant on SAP through the *same* `"erp"` bundle name, asserting identical tool-call-sequence shape modulo connector-specific tool names — this is what actually proves the abstraction, not a design review.

---

## Resource-frugality constraints (binding, unchanged from the ERP integration plan)

- Zero new processes on `tencent-vps` — binding for Phase 1 unless the open decision in 1.5 explicitly revises it with the user.
- Config-only where possible; anything compiled goes through CI (`cerveau-build.yml`), never a VPS build (memory-floor incident, 2026-08-18 — [[feedback-avoid-over-engineering-expensive-tests]]).
- No real-LLM-cost load testing as a default CI path (Phase 0.3 Tier A/B split exists specifically to honor this).
- Fail-closed everywhere; bounded curated tool sets, not full catalogs, on first landing (Phase 1.3).

## Standing rules that bind this plan

- Never run test suites on `tencent-vps`.
- Same negative-path verification protocol (fail-closed → synthetic connection → full-chain → isolation → cleanup) for every new connector, no shortcuts.
- Secrets never read/handled directly; tenant credentials stay inside Composio (or whatever Phase 1.5 lands on for a non-Composio path).

## Open decisions for the user before execution

1. **Approve the sequencing** (eval harness → SAP → generic adapter) or reorder.
2. **Phase 0 Tier B cadence** — scheduled (e.g. nightly) or pre-release-tag-only for the real-LLM-cost replay tier.
3. **Phase 1.5** — cannot be decided without live Composio catalog data; needs a follow-up query before this phase can be estimated or scheduled.
4. **Phase 2 Option A vs. B** — recommendation is A-first, but confirm before any implementation.

## Success criteria

Phase 0: 4 seed scenarios green in CI, Tier A, zero live credentials/LLM spend, wired to block merge on regression. Phase 1: SAP OData live under the same dual-mode risk tiering and negative-path proof as ERPNext, zero new untracked processes on the VPS (or an explicit, user-approved exception). Phase 2: a single `"erp"` bundle name resolves correctly per-tenant across both connectors, proven by the eval harness reusing the same scenario against both.
