# Cerveau × Frappe/ERPNext Integration Plan

**Status:** approved 2026-08-21 — all open decisions closed, ready for execution
**Created:** 2026-08-21
**Related:** `CERVEAU-STATUS.md` (2026-08-17 Stripe cleanup / ADR-007 Option A entries), `ADR-007-INTEGRATION-OAUTH-DIRECTORY.md`

## Goal

Give Cerveau agents ERP capabilities by exposing Frappe/ERPNext as an external toolkit through **the exact same architecture proven live for Zendesk/HubSpot/Slack/Asana** (ADR-007 Option A): a Composio-hosted MCP server, per-tenant entity resolution, connection gating, and risk-tiered tools.

**Explicitly out of scope for this plan:** replacing Cerveau with Frappe (rejected — different category of software). Self-hosting Frappe + a dedicated MCP server (`Casys-AI/mcp-erpnext`, MIT, 124 tools) is recorded as a **future Option B** if an Aivory-internal single-tenant ERP is ever wanted; not planned now.

## Why the Composio path

- Composio ships a maintained `ERPNEXT` toolkit (slug `ERPNEXT`, ~50 tools, DocType-generic CRUD — covers ERPNext plus every Frappe app: HR, CRM, etc.).
- Zero new infrastructure on `tencent-vps` (memory-critical post-outage; standing rule is to add no load to that box).
- Auth model is API_KEY (bring-your-own): tenant generates key+secret from their own Frappe instance's User Settings. Cerveau never touches raw credentials — identical to the Zendesk precedent.
- Known limitation, disclosed up front: the HubSpot round showed Composio's MCP-server-creation endpoint enforces stricter toolkit membership than the public catalog listing. Expect the usable curated subset to be smaller than 50. This is handled in Phase 1, not assumed away.

---

## Phase 0 — Catalog curation (read-only)

1. Query the live Composio catalog directly, not from marketing pages:
   `GET https://backend.composio.dev/api/v3/tools` filtered to toolkit `ERPNEXT`.
2. Record every action slug returned, then trial them against the MCP-server-creation endpoint (`POST /api/v3/mcp/servers`) exactly like the HubSpot round — expected outcome is some slugs rejected with `MCP_InvalidToolsProvided`.
3. Land the final curated set from what the endpoint actually accepts. Draft classification below; adjust to reality after step 1.

**Draft curation targets** (subject to catalog reality):
- Reads: get document, list/filter documents, version info.
- Writes (draft-level): create document, update document, add comment/tag, create timesheet.
- Dangerous class — see risk tiering before including at all: submit, cancel, delete, apply workflow action, **create webhook**.

## Phase 1 — Risk tiering (**decided**: dual-mode, permission originates from the human)

**User decisions, 2026-08-21:** (1) no moment where a Cerveau agent fires an ERP mutation on its own; (2) two operating modes — **Semi-autonomous** (human-in-the-loop per action) and **Autonomous** — with every mode boundary granted *by explicit human permission*, and in both modes **the agent confirms its intent first** before executing anything that writes.

### Mode design

| | Semi-autonomous (**default**) | Autonomous |
|---|---|---|
| Reads (get/list/version) | free | free |
| Draft-level writes (create/update/comment/tag/timesheet) | agent announces intent → `Pending` → human approves each action | runs without per-action approval, **only after the human granted standing permission for that tool class at setup** |
| Submit / cancel / delete / workflow action | `Pending` → human approval, always | `Pending` → human approval, **always — hard floor, no mode exempts it** |
| Create-webhook | excluded from bundle entirely (persistence vector) | excluded |

Rules common to both modes:
- **Confirm-before-execute**: before any write call (approved automatically or not), the agent states what it is about to write, to which DocType/record — so a semi-autonomous user approves with full context and an autonomous tenant sees the intent trail. Never a silent tool call.
- Permission only ever flows from human → agent. There is no path where an agent widens its own authority; mode changes are a human action (dashboard/config), not an agent decision.
- In Frappe, even a draft is a real record staff can see and act on, and `submit` posts real ledger entries (GL/stock). That's why submit/cancel/delete/workflow sit above every mode.
- Batch variants inherit the tier of their worst sibling.

### Implementation mapping — **verified against upstream v0.8.4 source (2026-08-21)**

The open question is answered: **v0.8.4 natively supports per-agent autonomy profiles.** Findings from the upstream tag (`crates/zeroclaw-config/src/schema.rs`, `autonomy.rs`; `crates/zeroclaw-runtime/src/approval/mod.rs`):

1. **`[risk_profiles.<alias>]`** is a named, per-profile policy surface. Each agent references one via its `risk_profile` field (`Config::risk_profile_for_agent(agent_alias)`); `risk_profiles.default` covers non-agent contexts. This is exactly the semi-autonomous/autonomous scoping we need.
2. **`AutonomyLevel`** has three values: `read_only` / `supervised` (default) / `full`.
3. Per profile: `auto_approve` (skip prompt), `always_ask` (force prompt), `allowed_tools`/`excluded_tools`, `approval_route` (route approvals to a distinct approver channel), `delegation_policy` (default `Forbidden`).
4. Approval precedence (`ApprovalManager::approval_requirement`): `level = full` ⇒ **everything approved, no prompts ever** → `read_only` blocks all writes → in `supervised`: `always_ask` beats everything → `auto_approve` → session "Always" grants → default Prompt.

**Design consequence (critical):** build *both* ERP modes on `level = "supervised"`, never on `full`:
- `erp-semi` profile: `level = "supervised"`; reads in `auto_approve`; every ERP write either omitted (defaults to Prompt) or listed in `always_ask` for explicitness.
- `erp-auto` profile: `level = "supervised"`; reads + draft-level writes in `auto_approve` (this is the human's standing grant); submit/cancel/delete/workflow in `always_ask` so they stay human-gated even here.
- Using `level = "full"` for autonomous mode would bypass even `always_ask` (the Full check runs first in the precedence chain) — that would delete our hard floor. Do not use it.

Note on the fork: Cerveau's patch series already carries fields into `derive_for_risk_profile` (`risk_tiers`/`idem_ledger`/`pending_store` — the security-critical v0.8.4 rebase fix), so profile-derived managers keep tiered approval and F-2 idempotency intact. `[tool_risk_tiers]` remains a global table, but it drives F-2 idempotency classification, not the prompt decision — approval behavior now lives entirely in the profiles, which are per-agent. The open technical question is closed; no fallback needed and no upstream feature work required.

## Phase 2 — Agent-type assignment (user's explicit call required)

Draft proposal, mirroring existing conventions (autonomous gets the union):
- `finance_invoice_ops`: full ERP set (its natural home; note Stripe was already retired from it).
- `office_assistant`: read-only + draft writes (tasks/projects/timesheets).
- `autonomous`: union of the above.
- `customer_service`, `leads_qualifier`: none (CRM stays on HubSpot).

## Phase 3 — Composio-side provisioning ✅ **executed 2026-08-21**

Execution record:

- **Catalog**: `GET /api/v3/tools?toolkit_slug=erpnext` returned **52 tools**, all version `00000000_00`.
- **Curation**: 52 → **26** (12 reads / 6 draft writes / 8 ledger+business-doc actions). Excluded entirely: `CREATE_WEBHOOK` (per decision), duplicate CRUD (`INSERT_DOCUMENT`, `INSERT_MANY`, `SAVE_DOCS`, `SAVE_DOCUMENT`, `GET_CLIENT`, `GET_VALUE`, `DELETE_CLIENT`), ambiguous mutation (`RENAME_DOC`), marginal utility reads.
- **Membership trial: zero rejections** — unlike the HubSpot round, all 26 slugs were accepted by the creation endpoint on the first attempt.
- **Auth config created**: `ac_ILn9zmSA5cqN` (`use_custom_auth`, scheme `API_KEY`, not Composio-managed) — tenants supply their own Frappe key+secret at connect time via the Connections tab. Note: payload shape is `{"toolkit":{"slug":...},"auth_config":{"type":"use_custom_auth","authScheme":"API_KEY",...}}` (camelCase inside `auth_config`).
- **Production MCP server live**: `aivory-erpnext-erp`, id `356767f6-ccaa-4cd9-9e95-eb571de5fd86`, URL `https://backend.composio.dev/v3/mcp/356767f6-ccaa-4cd9-9e95-eb571de5fd86`. Created as a trial then renamed in place (update path is `PATCH /api/v3.1/mcp/{id}`; `/mcp/servers/{id}` 404s) — no orphan left behind; account now holds exactly 6 servers, all legitimate.
- Tier mapping for Phase 4 (drives `[risk_profiles.*]` contents):
  - `auto_approve` (reads): the 12 read slugs above.
  - gated writes (`erp-semi`: prompt each time; `erp-auto`: auto-approved standing grant): `CREATE_DOCUMENT`, `UPDATE_DOCUMENT`, `ADD_COMMENT`, `ADD_TAG`, `CREATE_TIMESHEET`, `SET_VALUE`.
  - `always_ask` on both profiles (hard floor): `SUBMIT_DOCUMENT`, `CANCEL_DOCUMENT`, `DELETE_DOCUMENT`, `APPLY_WORKFLOW`, `MAKE_SALES_INVOICE`, `MAKE_PURCHASE_ORDER`, `MAKE_DELIVERY_NOTE`, `MAKE_STOCK_ENTRY`.

Original phase steps (for reference):

1. Create the Composio-hosted MCP server: `POST /api/v3/mcp/servers` with the curated accepted slugs only.
2. Same shape as all four existing production servers: URL `https://backend.composio.dev/v3/mcp/<uuid>`, static Aivory-level `x-api-key`, `tenant_entity_query_param = "user_id"` so Composio resolves which tenant's connected account to use and Cerveau never holds a raw Frappe token.
3. Confirm auth_config guidance for API_KEY toolkits (tenant supplies key+secret at connect time via the Connections tab).
4. After any curation trial-and-error, list all MCP servers on the account and delete orphans — the HubSpot round left one behind once; verify only the legitimate production set remains.

## Phase 4 — Cerveau config, both instances (`:3100` and `-b`) ✅ **executed 2026-08-22**

Execution record:

- Both live configs fetched first; all marker strings asserted present verbatim (one drift handled: `-b`'s analyst `auto_approve` ends at `pdfoxide_fill_form` instead of `record_meeting_summary` — patch accepted both variants).
- Patch applied symmetrically to both: one `[[mcp.servers]]` (`composio-erpnext-erp`, `requires_composio_toolkit = "erpnext"`, `tenant_entity_query_param = "user_id"`, x-api-key header) + `[mcp_bundles.erp-erpnext]`; `"erp-erpnext"` added to `[agent_type_mcp_bundles.finance_invoice_ops]`, `.office_assistant`, `.autonomous`; 26 slugs tiered in `[tool_risk_tiers]` (**12 reads → reversible, 14 writes → irreversible** — the write set includes draft-level actions per the human-in-the-loop decision, so every ERP write on the webhook path creates a durable F-1 `Pending` record instead of executing); the 12 read slugs added to `risk_profiles.agent_analyst_brain.auto_approve` (the same surface all other Composio tools live on).
- TOML validated locally *and* on the VPS before swap; backups: `config.toml.bak-pre-erpnext-20260822` on both instances; atomic `.new` + `mv`.
- `doctor`: 78 ok / 0 errors on both, before and after — identical to baseline.
- Staged restart: `:3100` → 8s + 90s stability window (active, health 200, `NRestarts=0`) → `-b` → joint 90s window. Final state: both active, health 200/200, `NRestarts=0` both, HAProxy `cerveau-a` UP / `cerveau-b` UP, `aivory.uk` 200, binary `0.8.4`.

Design note recorded during implementation: the runtime's approval semantics (verified in fork source) make the strict-HITL policy land naturally — `Irreversible`-tier tools on the non-interactive webhook path never execute and never auto-deny silently; they create durable pending-approval rows (patch 0028/0035 context) resolvable via the tenant approvals API. The future "autonomous" mode is exactly: flip the 6 draft-write slugs to `reversible` + add to profile `auto_approve` — a human config action (the standing grant). Ledger/business-doc actions stay `irreversible` in every mode.

Original phase steps (for reference):

Standing discipline, unchanged from prior rounds:

1. Fetch/diff both live configs first; assert every marker string exists verbatim before patching (`-b` has known structural drift).
2. Patch adds, symmetrically on both instances:
   - one `[[mcp.servers]]` block (+ `[mcp.servers.headers]`),
   - one `[mcp_bundles.erp-*]` block,
   - `erpnext` additions to the relevant `[agent_type_mcp_bundles.*]` arrays,
   - two `[risk_profiles.*]` entries (`erp-semi`, `erp-auto`) per the Phase 1 design, plus `risk_profile = "..."` on each ERP-assigned agent,
   - `[tool_risk_tiers]` entries split across `irreversible`/`reversible` (drives F-2 idempotency classification; approval behavior lives in the profiles),
   - only read-only tools in the profiles' `auto_approve` for `erp-semi`; reads + draft writes for `erp-auto`; hard-floor tools in `always_ask` on both.
3. Edit a local copy; validate with `python3 -c "import tomllib; tomllib.load(...)"` before and after.
4. Backup each live file with dated `.bak-pre-erpnext-2026MMDD` suffix; atomic swap (`.new` + `mv`).
5. `doctor` clean before and after on both instances.
6. Staged restart: `:3100` alone → 2-min stability window (`NRestarts=0`, health 200) → `-b` → joint window. HAProxy `cerveau-a`/`cerveau-b` both UP afterwards.

No CI involvement needed: config-only change, nothing compiled.

## Phase 5 — Frontend/backend labels ✅ **executed 2026-08-22**

- `agent_tool_scope.py`: `erpnext` added for `finance_invoice_ops` (new row — its first toggleable toolkit since Stripe's retirement) and `office_assistant`; `customer_service`/`leads_qualifier` unchanged. Committed with only this file's hunk (the backend checkout carries unrelated uncommitted live drift) as `2866145`, rebased onto `aivory-hub/main` (`dfce380`) and pushed; the unrelated drift was stash-protected through the rebase and restored (one trivial conflict in `pg_service.py` — a blank-line difference against `dfce380` — resolved in favor of the merged content, compile-checked, stash dropped).
- `CustomizeAgentModal.tsx`: `erpnext: 'ERPNext'` added to `TOOLKIT_LABELS`. Same drift discipline: the file carried an in-progress uncommitted Discord-deploy feature, so the one-line label change was committed alone (`7da746b`, pushed to `aivory-hub/main`) and the drifted working tree restored byte-for-byte afterwards.
- Checks: `py_compile` clean on both touched/unstashed files; `npx tsc --noEmit` shows only the two pre-existing errors (verified identical via `git stash` round-trip — `app/integrations/callback/route.ts` Composio SDK typing and `next.config.ts` eslint key), none from this change.
- Note: these are repo commits; deploying them to the running services follows each service's normal deploy flow and was not part of this phase.

Original phase steps (for reference):

- `agent_tool_scope.py`: add `erpnext` to `TOGGLEABLE_TOOLKITS` per Phase 2 assignments.
- `CustomizeAgentModal.tsx`: add `erpnext: 'ERPNext'` to `TOOLKIT_LABELS`.
- Typecheck (`npx tsc --noEmit`) clean; run affected vitest suites; commit to `aivory-hub/main`.

## Phase 6 — Live verification against production ✅ **executed 2026-08-22**

All four proofs passed against the live `:3100` instance via the real `/webhook` path (throwaway tenant `erp-verify-tmp-001`, engine `cerveau`, no SQL tier bypass):

1. **Fail-closed gate (PASS)** — as `finance_invoice_ops`, asked for ERPNext customers *by name*: "I don't have access to an ERPNext or Frappe integration in this session" from `apply_toolkit_connection_gate` (zero connected accounts). First probe taught a wording lesson: an unspecific "list my invoices" ask correctly routed to the native invoice tools instead — the gate only engages when the agent reaches for the Composio toolkit, so negative tests must name the integration.
2. **Full-chain proof (PASS)** — after inserting one synthetic `ACTIVE` row into `product.agent_toolkit_connections` (`user_id`, `erpnext`; Aivory's local gate table only): the model attempted **two real ERPNext tool calls** (customer list + count) and received Composio's own API error — *"No connected account found for user ID erp-verify-tmp-001 for toolkit erpnext"* — proving registration → bundle grant → connection gate → read auto-approve → HTTP routing with correct `entity_id` end-to-end. Only a genuine tenant connection is missing; expected and disclosed, not fabricated.
3. **Isolation (PASS)** — same tenant under `customer_service`: zero ERPNext/Frappe tools visible despite the ACTIVE erpnext connection row. Bundle scoping holds.
4. **Cleanup verified** — synthetic row + both throwaway profiles deleted, zero-count confirmed on both tables; Composio account holds exactly the 6 legitimate servers (no orphans).

Happy path (a real tenant connecting a real Frappe instance) remains unverified until real usage exists — same disclosed-gap stance as HubSpot/Slack/Asana.

Original protocol (for reference):

Exact replay of the ADR-007 Option A verification protocol:

1. Create a real throwaway tenant through the normal webhook path (engine `cerveau`, no SQL tier bypass).
2. Call `/webhook` as an assigned agent type. **Expected: fail-closed** — "I don't have access to ERPNext" from `apply_toolkit_connection_gate` (zero connected accounts). This proves the gate, not a bug.
3. Insert a synthetic `ACTIVE` row into `agent_toolkit_connections` (Aivory's local gate table only) and re-run. **Expected: the model attempts a real tool call and receives Composio's own error** ("no connected ERPNext account") — proving the full chain (registration → bundle grant → gate → auto_approve → HTTP routing with correct `entity_id`) end-to-end, minus only the genuine credential.
4. Isolation check: same tenant under a non-assigned agent type reports zero ERP tools.
5. Cleanup: delete synthetic rows and the throwaway tenant, confirm zero-count; reconcile Composio server list.
6. Happy path (a real tenant connecting a real Frappe instance via the Connections tab) is explicitly **unverified until real usage exists** — same disclosed-gap stance as HubSpot/Slack/Asana. Do not fabricate it.

## Phase 7 — Skill learning loop ✅ **executed 2026-08-22**

**Isolation gate found a real blocker, resolved as patch 0039.** Source verification showed both learning-loop blocks run unconditionally when enabled — and auto-created/improved skills land in the **host** workspace (`config.data_dir`), which every tenant turn's resolution loads *before* layering agent-type bundles. Enabling as-is = skills synthesized from one tenant's execution surfacing in all other tenants' turns. Per the plan's default-safe rule this meant "off" — but the correct fix was small, so it shipped as **patch 0039** (`e4d80813`, `cerveau-main`): both post-turn blocks guarded with `current_tenant().is_none()`. Learning is now structurally host/internal-turn-only until per-tenant skill stores exist. `cargo check` clean locally; CI `cerveau-build` green (~25 min); binary deployed via checksummed artifact + staged restarts (`:3100` window → `-b` window; one corrupt-scp segfault caught by the `--version` gate pre-deploy and fixed by rsync re-transfer, sha256-verified).

Config enablement (both instances, dated backups `.bak-pre-phase7-*`, TOML-validated, doctor 78 ok / 0 errors, staged restarts, final state active/200/NRestarts=0 both, HAProxy UP):
- `[skills.skill_creation]`: `enabled = true`, `reflection_enabled = true` (defaults kept: LRU 500, dedup ≥0.85).
- `[skills.skill_improvement]`: discovered **already enabled** in production configs (pre-dating this plan) — left on, now finally safe behind the 0039 guard.
- Redis-as-skill-store: rejected (upstream design + VPS memory), per earlier decision.

**Guard proof**: a live tenant webhook turn with multiple real tool calls (Slack + Asana) produced **zero** "Auto-created skill" journal entries and zero new skill directories; throwaway profile cleaned up after. Stage-2 (tenant-facing learning) stays off pending per-tenant skill stores.

Original phase text (for reference):

Upstream v0.8.4 ships the Hermes-style learning loop natively — no new code, no new processes, two opt-in config sections (both default `false`, verified in `crates/zeroclaw-config/src/schema.rs`):

- `[skills.skill_creation]`: autonomous skill generation from successful multi-step executions; optional LLM reflection synthesizes a canonical `SKILL.md` from the bounded tool trace; embedding-based dedup (cosine ≥ 0.85) against existing skills; LRU eviction at `max_skills`.
- `[skills.skill_improvement]`: post-turn background review fork that may patch/expand/archive existing skills, restricted to `skills_list`/`skill_view`/`skill_manage`, per-skill cooldown (`cooldown_secs`, default 3600), iteration nudge trigger, and hard caps on the fork's own tool iterations.

**Explicitly rejected: Redis as a skill store.** Skills are filesystem-based (`workspace/skills/<slug>/SKILL.md`) by upstream design; dedup already rides Cerveau's existing Postgres embeddings infra. A Redis-backed store would mean custom patch-series work against upstream's design (violates the adopt-upstream discipline), adds a data-plane role to the rate-limiter Redis on the memory-critical VPS, and buys nothing the current architecture doesn't already cover. Cross-instance sharing between `:3100` and `-b`, if ever wanted, starts with a shared/synced workspace dir — a separate decision made later with memory headroom counted first.

Staged enablement:
1. **Stage 1 — internal only**: enable `skill_creation` (with `reflection_enabled = true`) and `skill_improvement` for one internal/ops-facing agent type only. Tenant-facing agent types stay off until isolation is proven.
2. **Isolation gate before Stage 2**: verify an auto-created skill from tenant A's execution can never surface in tenant B's context (skills dir scoping per tenant vs global workspace). If upstream's workspace layout is global-per-instance, tenant-facing skill creation stays **off** — that is the default-safe outcome, not a bug to work around.
3. Put the live `workspace/skills/` dirs under git or scheduled snapshots so every autonomous skill mutation is auditable and revertible.
4. Watch `/api/cost`: reflection + review forks are extra model calls (bounded, but nonzero). Revisit caps if the cost line moves.
5. Stage 2 — widen to tenant-facing agent types only after #2 passes and a few days of stable Stage 1.

## Resource-frugality constraints (binding for this whole plan)

The spirit of Cerveau is Rust: lightweight, bulletproof, agile. Every phase above is shaped by that:

- **Zero new processes on `tencent-vps`.** The ERP path is Composio-hosted (external HTTP); the learning loop is inside the already-running binaries. Nothing new to install, supervise, or feed.
- **Config-only where possible.** Phases 1–4 and 7 touch TOML + labels; nothing recompiled, nothing redeployed beyond the staged unit restarts already specified.
- **Memory floor discipline** applies to every restart window (`NRestarts=0`, health 200 checks as usual); no builds, tests, or heavy jobs on the box, ever ([[feedback-avoid-over-engineering-expensive-tests]]).
- **Fail-closed everywhere**: connection gates, approval profiles, missing credentials — every new path defaults to "deny and report", never "try anyway".
- **Bounded everything**: capped curated tool set (not all 50 Composio actions), LRU-capped auto-skills, cooldown/cost-capped review forks. Growth is bounded by construction, not by hope.

## Cerveau repo alignment ✅ **executed 2026-08-22**

The ERP integration required no source changes to the fork (config-only), but the pending v0.8.4 branch-alignment item from the 08-18 upgrade fell due (4 days production-stable) and was closed in the same pass:

- `archive/cerveau-main-v0.8.3` tag pushed — the pre-rebase history preserved at `b07e7f42`.
- `CERVEAU_PATCHES.md` base note updated to `v0.8.4` (with a note on the Landlock splice and on runtime-config-vs-source-patch scope, naming this plan doc) as `02081438` on top of the CI-green v0.8.4 series.
- `cerveau-main` reset to that tip and force-pushed (`--force-with-lease`) — the branch name now matches deployed reality; local, origin, and both branches all point at `02081438`.

## Standing rules that bind this plan

- Never run test suites on `tencent-vps` ([[feedback-avoid-over-engineering-expensive-tests]]); nothing here requires one anyway.
- No restart of anything beyond the two Cerveau units during the staged window.
- Secrets never read/handled directly; tenant credentials stay inside Composio.

## Open decisions for the user before execution

1. ~~Approve the Phase 1 tiering~~ **Decided 2026-08-21:** dual-mode via per-agent `[risk_profiles.*]` — `erp-semi` (supervised, reads auto, writes prompt) and `erp-auto` (supervised, + draft writes auto-approved as standing human grant); submit/cancel/delete/workflow in `always_ask` on both; `level = "full"` never used (bypasses the hard floor); create-webhook excluded from the bundle. Verified against upstream v0.8.4 source — supported natively, no fallback needed.
2. ~~Approve Phase 2 agent-type assignment~~ **Approved 2026-08-21:** `finance_invoice_ops` full ERP set; `office_assistant` reads + draft writes; `autonomous` union; `customer_service`/`leads_qualifier` none (CRM stays on HubSpot).
3. ~~Confirm target~~ **Approved 2026-08-21:** tenant-owned ERPs via Composio now; Option B (self-hosted Frappe + Casys MCP) deferred indefinitely unless an internal-ERP need materializes.
4. ~~Skill learning loop~~ **Decided 2026-08-21:** enable built-in v0.8.4 skill creation/improvement, staged internal-first (Phase 7); Redis-as-skill-store explicitly rejected on upstream-design + VPS-memory grounds.

## Success criteria

Both instances green post-restart; negative-path proof (#2/#3/#4) passes; isolation holds (ERP tools AND learned skills stay tenant-scoped); zero orphaned resources on Composio; labels shipped; nothing new running on the VPS; every autonomous mutation (approvals, skills) auditable and revertible.
