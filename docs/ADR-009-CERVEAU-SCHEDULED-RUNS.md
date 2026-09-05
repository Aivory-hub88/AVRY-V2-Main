# ADR-009 — Scheduled Runs: a capable scheduler that cannot see a tenant

**Status:** Phase 1 (Decisions 1–3) ✅ **DEPLOYED + live-verified 2026-09-04** (§9). Phase 2 (store, API, quota) ✅ **DEPLOYED + exit gate met 2026-09-05** (§10). **Nothing runs these schedules yet** — the sync from the Phase 2 store into Cerveau's cron store does not exist, so a row stays `pending_activation`; that sync, and Phase 3's dashboard, are still open.
**Date:** 2026-09-03 (§6 revised 2026-09-03 late — the "does not execute jobs" finding did not survive a fresh re-test; §2's tenant-blindness gap closed 2026-09-04, see §9)

**Context:** "Scheduled Runs" was the remaining LobeHub-inspired candidate — let a customer say "every Monday, summarise last week's tickets" and have their agent do it unattended. This ADR reports what Cerveau already has, the one thing it lacks, and what it would actually take.

Related: [ADR-002](ADR-002-CERVEAU-TENANT-DESIGN.md) (tenant isolation), [ADR-006](ADR-006-CERVEAU-CLIENT-DEPLOYMENT-API.md) (tenant-gated tools), [ADR-007](ADR-007-CERVEAU-COGNEE-INTEGRATION.md) §14 and [ADR-008](ADR-008-CERVEAU-MULTI-AGENT-COLLABORATION.md) (the same `current_tenant()` gate keeps appearing).

---

## 1. The scheduler already exists, and it is not a toy

`crates/zeroclaw-runtime/src/cron/` (`scheduler.rs`, `store.rs`, `types.rs`, `schedule.rs`) plus six agent-facing tools (`cron_add`, `cron_list`, `cron_update`, `cron_remove`, `cron_run`, `schedule`) and a full CLI:

- cron expressions (5-field), one-shot at an RFC-3339 timestamp, fixed intervals, and "in 30m" delays;
- IANA timezones (`--tz Europe/London`);
- `pause` / `resume` / `update`, run history, `catch_up_on_startup`;
- shell jobs *or* agent jobs (`--agent <alias>`, `--prompt`);
- per-job `allowed_tools`, `uses_memory`, `model` override, `session_target`, `delete_after_run`;
- a `DeliveryConfig` (mode/channel/to/thread_id) for shipping the result somewhere.

Live config: `scheduler.enabled = true`, `max_tasks = 64`, `max_concurrent = 4`, `catch_up_on_startup = true`, `max_run_history = 50`. **Zero jobs scheduled** as of this ADR.

Agents can also schedule work *themselves* — the cron tools are in the runtime registry, subject to the same `allowed_tools` allow-list that hid `delegate` (ADR-008 §4) and the graph tools (ADR-007 §14).

## 2. The gap: `CronJob` has no tenant, and `run_agent_job` never enters a tenant scope

`CronJob` (`cron/types.rs`) carries `id`, `expression`, `schedule`, `command`, `prompt`, `name`, `job_type`, `session_target`, `model`, **`agent_alias`**, `enabled`, `delivery`, `delete_after_run`, `allowed_tools`, `uses_memory`, `source`, `shell_output_format`, and run bookkeeping.

`agent_alias` is *which brain* runs the job. There is **no field for which tenant it belongs to** — and `grep -rn "tenant" crates/zeroclaw-runtime/src/cron/` returns nothing at all.

`run_agent_job` (`cron/scheduler.rs`) builds a `SubAgentSpawn` from config + alias, applies the security policy, assigns a run session, and executes — **without ever entering `TENANT_CONTEXT.scope(...)`**. So every scheduled agent run sees `current_tenant() == None`.

**What that costs, concretely** — this is the same task-local gate that shows up in three ADRs now:

| Capability | Gated on | Available in a scheduled run today |
|---|---|---|
| Tenant memory (`t_<tenant>.<agent_type>`) | tenant scope | ❌ |
| `graph_remember` / `graph_recall` | `cognee.enabled` **and** `current_tenant()` (ADR-007 §14) | ❌ |
| Composio toolkits (tenant's connected accounts) | `TenantContext::connected_toolkits` | ❌ |
| Tenant custom MCP servers | `tenant_custom_mcp_servers` (ADR-006 §B) | ❌ |
| Tenant-scoped approval routing | tenant channel binding | ❌ |

A scheduled run today is an *operator* run: it can think, use the curated non-tenant tools, and deliver output — but it cannot touch any customer's data, memory, or integrations. **For a product feature named "Scheduled Runs" sold to tenants, that is the whole feature missing**, not a detail.

This is not a criticism of the design: vanilla zeroclaw is single-operator, and the scheduler predates Cerveau's tenant layer entirely. Nothing was done wrong; the tenant layer simply never reached this module.

## 3. Verified, not assumed — and one thing that did *not* verify

- Tenant blindness read directly from `run_agent_job`'s body, not inferred from behaviour. This is solid.
- The `current_tenant()` gate on graph tools was confirmed empirically hours earlier in ADR-007 §14.
- **The scheduler did not demonstrably execute a job.** A zero-cost shell job (`echo`, no model call) scheduled via `cron once --agent analyst_brain 2m` was accepted and stored, but had not run ~5 minutes past its fire time with the daemon up the whole while (`last=never`). After a daemon restart the job vanished from `cron_jobs` with **no row in `cron_runs`** and no journal line — consistent with being dropped, not executed. `scheduler.status` reported `ok` throughout. See §6.

That last point matters more than the rest of this ADR: **there is no point scoping tenants onto a scheduler that may not fire.** §6 is now the first thing to settle.

## 4. Design

**Decision 1 — Extend `CronJob` with an optional tenant, do not fork the scheduler.** Add `tenant_id: Option<String>` (plus the `agent_type` the tenant layer keys on). `None` preserves today's operator-run behaviour exactly, so nothing existing changes; `Some` makes it a tenant run. The scheduler is otherwise fit for purpose and should not be rewritten.

**Decision 2 — Wrap the run, do not rebuild it.** `run_agent_job` gains a `TENANT_CONTEXT.scope(...)` around its existing execution when the job carries a tenant. The whole tenant-gated stack (memory, graph, Composio, custom MCP, approvals) then lights up for free, because every one of those already reads the same task-local.

**Decision 3 — Tenant jobs must resolve tenant context at fire time, not at creation time.** A schedule created in January and firing in June must see the tenant's *current* connected toolkits and custom MCP servers, not a snapshot. That means calling the same resolver the gateway uses per request, not caching a `TenantContext` in the job row.

**Decision 4 — Quota per tenant, not just globally.** `scheduler.max_tasks = 64` is an install-wide cap; with tenants it becomes a shared resource one customer can exhaust. Needs a per-tenant cap, tiered like ADR-006 §B's custom-MCP quota (Operational/Business/Enterprise).

**Decision 5 — Approvals are the hard part; treat it as a first-class question, not an afterthought.** A scheduled run has no human present, and Cerveau's approval gate is fail-closed (ADR-008 §4: the delegate hop died exactly this way). An unattended job that hits an `Irreversible` tool must either park as a pending approval for the tenant to resolve later, or be refused up front. **Parking is the right answer** — the tenant-scoped approval route already exists and is proven live (ADR-006 §B3) — but "the job ran at 3am and is waiting for you" needs real UX in Mission Control, not just a DB row.

**Decision 6 — Failure and cost visibility.** `max_run_history = 50` and `last_status`/`last_output` already exist; the tenant needs to *see* them. A silent 3am failure that nobody notices for a week is worse than no feature.

## 5. Phasing

**Phase 1 — Tenant-scoped execution (Rust, Cerveau).** `tenant_id` + `agent_type` on `CronJob`; `TENANT_CONTEXT.scope(...)` in `run_agent_job`; resolver call at fire time. *Exit gate:* a job created for a real tenant fires unattended and demonstrably reaches that tenant's memory and graph — verified by `SELECT` on `cognee.graph_node` for that tenant's `source_user`, the ADR-007 §14 method. No dashboard needed yet; the CLI is enough to prove it.

**Phase 2 — Backend API + quota (avry-backend).** `product.tenant_scheduled_runs` (mirroring `tenant_custom_mcp_servers`), JWT-authenticated CRUD, tiered per-tenant cap, internal endpoint for Cerveau. *Exit gate:* a tenant creates/pauses/deletes a schedule through the API and cannot exceed their tier's cap. — ✅ **DEPLOYED + exit gate met, 2026-09-05** (`avry-backend@7d94e7b`). See §10.

**Phase 3 — Dashboard UI.** Schedule list with next/last run and status, create/pause/delete, and — the load-bearing part — **parked approvals from unattended runs surfaced in the Notification Centre**, reusing the existing approval card. *Exit gate:* a tenant sees a 3am run's result, and resolves an approval it parked.

**Phase 4 (optional) — Let agents schedule their own follow-ups.** The `cron_add`/`schedule` tools already exist; adding them to `allowed_tools` would let an agent say "I'll check back in a week." Deliberately last: it multiplies scheduled load and is the easiest way to create runaway cost.

## 6a. Correction (2026-09-03, later same day): re-tested fresh, the scheduler fires correctly — 3 for 3

Both production instances got a full stop/start that day (unrelated reason — a binary swap for ADR-008 Phase 3a's `verifier_brain`). That gave an opportunity to re-run §6's probes against a freshly-started daemon, this time deliberately controlling for a variable §6 never isolated: **timezone**.

**What was different this time:**

- Two shell jobs (one with an explicit `tz: "UTC"`, one relying on the documented default-to-runtime-local-timezone behavior, with the local-time math for that default done correctly by hand) and one **agent**-type job (`prompt: "Reply with exactly the single word: PONG"`) were created via the raw HTTP API, each scheduled ~3–4 minutes out.
- All three were independently confirmed via direct `sqlite3` queries against `data/cron/jobs.db` (never trusting the API response or any tool's own claim) at both `cron_jobs.last_run`/`last_status`/`last_output` and the corresponding `cron_runs` row.

**Result — all three fired, on time, with correct output:**

| Job | Schedule | Fired at | Latency | Status |
|---|---|---|---|---|
| shell, explicit `tz: "UTC"` | 16:09:00Z | 16:09:04.225Z | 4s | `ok`, stdout matched exactly |
| shell, default tz (server-local `Asia/Shanghai`) | 16:13:00Z (=00:13 CST) | 16:13:04.219Z | 4s | `ok`, stdout matched exactly |
| **agent**, `security_brain` | 16:17:00Z | 16:17:20.174Z | 20s (real LLM call) | `ok`, output contained `PONG` |

This directly contradicts §6 below: the scheduler is not silently discarding due jobs. `run_agent_job` (agent path) and the shell path both correctly claim, execute, and persist a run.

**A real, separate footgun this surfaced, worth keeping regardless of the bug's fate:** the very first attempt (not in the table — a mis-scheduled probe, deleted before it could confuse anything) used a 5-field expression with no `tz`, written assuming UTC. The server's actual OS timezone is `Asia/Shanghai` (UTC+8), and at the moment of that request the *local* calendar day had already rolled to the 4th while UTC was still on the 3rd — so the day+month the expression named had already passed for the current year in local terms, and the scheduler correctly (per its own, documented semantics) rolled the schedule forward a **full year**. `next_run` was computed correctly the whole time; a tester reasoning in UTC without doing that conversion would watch nothing happen and reasonably conclude the job "vanished." The `cron_add` tool's own parameter schema already tells the calling LLM this in plain language (`CRON_TZ_DESCRIPTION`: *"If omitted, the schedule uses the runtime local timezone... For user-facing schedules, pass an explicit IANA timezone"*), and Cerveau's own web console auto-fills the browser's IANA timezone on every human-created job — so the guard rails exist. They just don't help a human tester reasoning about the API directly, which is exactly what §6's probes were.

**What most likely explains §6's seven failed probes, honestly — not fully provable after the fact:** the daemon that ran those probes is gone (replaced by the restart), so the exact mechanism can't be re-inspected. Two candidates, not mutually exclusive: (1) the timezone footgun above, applied to probes whose expected fire time was reasoned in UTC; (2) some form of long-uptime scheduler state (the `locked_at` claim column on `cron_jobs` implies an optimistic-lock pattern — a job stuck mid-claim from an earlier fault could plausibly explain "disappears with no run row" for *that* job, though not obviously why every fresh probe afterward also failed) that a restart incidentally cleared. Given the fresh instance now fires reliably and §7's observability fix means a future recurrence would actually be traceable, this is being closed as **not currently reproducible** rather than chased further into a debug build — that instrument is for a bug that reproduces, and this one, right now, does not.

**Consequence for the rest of this ADR:** §2's tenant-blindness finding is untouched by this correction — it was read directly from `run_agent_job`'s source (`grep` for `TENANT_CONTEXT.scope` across `crates/zeroclaw-runtime/src/cron/` returns nothing, confirmed again tonight), not inferred from the execution behavior this section is about. Phase 1 (Decisions 1–2) is no longer blocked on "prove the scheduler fires" — that is now done — and can proceed on its own merits whenever tenant-scoped scheduling is prioritized. One inexpensive, unrelated hardening worth doing independently of that: a staleness check (alert or self-heal if an `enabled=1` job's `next_run` sits more than a few minutes in the past) would catch a future silent-stall recurrence immediately instead of waiting for a customer to notice — cheap, and directly targets the failure mode this section could never fully rule out.

## 6. The blocker: the scheduler does not execute jobs (7 probes, reproducible) — superseded, see §6a

**Symptom.** A job is accepted and stored correctly. At its fire time the row disappears from `cron_jobs`. `cron_runs` stays empty. Nothing observable executes. `scheduler.status` reports `ok` throughout, and `restart_count` stays 0.

**Probes run** (all on the live instance A, all with the daemon up unless noted):

| # | Job | Result |
|---|---|---|
| 1 | shell `echo`, +2m | still `last=never` 5 min after fire time; vanished after a restart, no run row |
| 2 | shell `echo`, +60s, no restart | gone at fire time, `cron_runs` empty |
| 3 | **agent** `--prompt` "use memory_store to save `cron-agent-probe-ok-…`" | gone, `cron_runs` empty, and **no memory written** — the string exists only inside `jobs.db`, i.e. the job definition, never an execution |
| 4 | shell `echo`, tracing attempted | gone, no trace produced |
| 5 | shell `echo`, tracing attempted after the §8 fix | gone, no trace produced |

Probe 3 is the important one: it rules out "shell commands are blocked by the security policy at run time" as the whole story, because the agent path (`run_agent_job`) leaves no trace either.

**Ruled out.** The job row is written correctly — `agent_alias` persists as `analyst_brain` (checked directly in SQLite), and that alias does exist in `config.agents`, so `resolve_owning_agent` should return `Some`. The CLI and daemon share one store (`data/cron/jobs.db`); this is not a "two databases" problem.

**Narrowed further with real tracing** (7 probes total, after §7's fix made the trace readable):

- **The daemon consumes the row, not the CLI.** A job was scheduled and its fire time passed while the DB was read *only* through `sqlite3` — `cron list` was never invoked. The row was gone anyway. So this is not the CLI pruning expired one-shots on read.
- **The scheduler logs nothing whatsoever at fire time.** With `log_persistence = rolling` and the trace confirmed live, the window spanning a job's fire time contains only daemon-startup lines. No due-job pickup, no claim, no run, no warning — at any severity.
- **The tick loop is alive.** `process_due_jobs` calls `mark_component_ok` every cycle and `scheduler.status` stays `ok` with a fresh `last_ok`, so the loop runs; it simply never has work.
- **Ruled out:** `skip_missed_run` — it only sets `enabled = 0` with `last_status = 'skipped'`, it does not delete, and our rows disappear entirely. Also not the startup "advance without executing" path, which only runs when `catch_up_on_startup` is false (it is true).

**Worth fixing regardless of the root cause:** `due_jobs` swallows a missing database silently. `with_existing_initialized_connection` returns `Ok(None)` when the DB path does not exist, and `due_jobs` turns that into `Ok(Vec::new())` — indistinguishable from "nothing is due", with no log. Any path misconfiguration in this module is therefore invisible by construction.

**Still not established:** which statement removes the row. **This needs a debug build with instrumentation between `due_jobs` and `process_due_jobs`, not more probing against production.** Seven probes is more than enough to characterise the behaviour; it is the wrong instrument for finding the line.

**Consequence for this ADR: Phase 1 does not start until this is fixed.** Scoping tenants onto a scheduler that discards its jobs would produce a feature that appears to work in the UI and silently never runs — the worst possible failure mode for something a customer relies on to happen at 3am.

## 7. Found on the way: observability config had been silently dead

`[observability]` carried three keys from an older Cerveau schema — `runtime_trace_mode`, `runtime_trace_path`, `runtime_trace_max_entries` — which the current binary does not know. The whole section therefore failed to parse and was "reset to defaults for this run" **on every start, on both instances**, for however long the binary has been ahead of the config.

Practical effect: `backend` and `log_persistence` were inert, so nothing configured there ever took effect — which is exactly why the scheduler's own `WARN` lines (e.g. "Cron job has no owning agent…", "failed to claim in-flight lock") were invisible during this investigation, and why the cron bug above is still undiagnosed.

Predates this work (confirmed against the pre-change backup). Stale keys removed on both config directories; the section now parses and the warning is gone.

**The stale key also cost an hour of the investigation above.** `runtime_trace_path = "state/runtime-trace.jsonl"` sent me looking in `<config-dir>/state/`, which holds only `daemon_state.json`. The trace has been written the whole time to **`<config-dir>/data/state/runtime-trace.jsonl`** — and instance B, which never had `log_persistence` set and therefore fell through to the `rolling` default, had a live trace file sitting there all along. Tracing was never broken; the dead config section made it look that way. Both instances now sit at `rolling` explicitly.

## 8. Cost and risk notes

- Scheduler probing cost **zero model calls** for four of five probes — shell jobs need no LLM. Any future scheduler-plumbing verification should use shell jobs for the same reason; only tenant-capability checks need a real agent turn. — shell jobs need no LLM. Any future scheduler-plumbing verification should use shell jobs for the same reason; only tenant-capability checks need a real agent turn.
- `max_concurrent = 4` bounds the blast radius of a bad schedule, but with per-tenant jobs the natural failure mode is N tenants × recurring jobs. Per-tenant quota (Decision 4) is the control, and it should exist *before* Phase 3 makes scheduling self-serve.
- Recurring unattended agent runs are the single easiest way to generate surprise LLM spend in this product. Whatever the UI ends up looking like, it should show the tenant what a schedule costs per run.

## 9. Phase 1 — implemented and live-verified, 2026-09-04

Decisions 1–3 from §4 shipped as designed, with one implementation detail the design didn't anticipate:

- **`CronJob` gained `tenant_id: Option<String>` / `tenant_agent_type: Option<String>`** (`cron/types.rs`, `cron/store.rs`), both `NULL` on every existing row. `CronJob::tenant_selector()` requires both non-empty or resolves to `None` — a half-written identity (a hand-edited row, a future migration bug) degrades to "no tenant" rather than ever attempting a scope with an incomplete identity.
- **New internal-only `add_agent_job_for_tenant`** stamps the identity. Deliberately not wired to the `cron_add` tool or `/api/cron` — nothing outside Cerveau's own trusted call sites can set an arbitrary tenant on a job yet; that's Phase 2's job (a real, JWT-authenticated avry-backend API), not a shortcut through the generic cron surface. For this ADR's own live verification, jobs were created through the ordinary `/api/cron` (untenanted) and then had `tenant_id`/`tenant_agent_type` stamped by a direct `UPDATE` on the SQLite row — standing in for what Phase 2's API will do properly.
- **`run_agent_job` resolves the job's tenant at fire time** (Decision 3 — never a cached snapshot) and wraps the turn in `TENANT_CONTEXT.scope(...)`. A tenant identity that fails to resolve refuses the run outright (`"tenant resolution failed for tenant_id=... — refusing to run this job unscoped"`) rather than silently falling back to an operator run — the same stance `api_tenant_approvals::run_continuation` takes for a resumed approval.
- **The crate-boundary problem the design didn't spell out:** the actual resolvers (`TenantResolver`, `ToolkitConnectionResolver`, `AgentToolScopeResolver`, `TenantCustomMcpResolver`) live in `zeroclaw-gateway`, which depends on `zeroclaw-runtime` — not the other way around — so the scheduler (in `zeroclaw-runtime`) cannot call them directly. Solved with the exact precedent already established for cron delivery (`cron::scheduler::{DeliveryFn, register_delivery_fn}`): a process-wide `OnceLock` (`agent::tenant::{TenantResolveFn, register_tenant_resolve_fn, resolve_tenant_context}`), populated once at startup by `src/main.rs` with a closure running the identical resolve-and-build sequence `run_continuation` already uses for a live approval-resume turn. No resolver code moved crates; no new HTTP or DB wiring needed in the runtime crate at all.
- **A `Send` recursion-limit overflow, not a logic bug:** the extra `TENANT_CONTEXT.scope(...)` nesting around an already-`Instrumented`, already-task-local-wrapped `agent::run` future pushed rustc's Send-auto-trait checking past the default recursion budget (`overflow evaluating the requirement ...: Send`). Fixed with `#![recursion_limit = "256"]` on `zeroclaw-runtime`'s crate root — rustc's own suggested remedy for this exact error, not a workaround for a real cycle.

**Tests:** 12 new (tenant_selector's all-or-nothing contract, resolver register/resolve round-trip including the `Ok(None)`-no-persona-row vs. resolution-failure distinction, `add_agent_job_for_tenant` persistence, and the actual behavioral contract — `run_agent_job` refuses before attempting the turn when unresolvable, proceeds past the check when resolvable). Full suite: 3578 `zeroclaw-runtime` + 447 `zeroclaw-gateway` tests, 0 failures.

**Deployed:** commit `025de367`, CI green (`cerveau-build`, `cerveau-quick`), binary swapped on both production instances (sha256-verified download, old binary backed up, brief coordinated stop/start — both instances share one `/usr/local/bin/zeroclaw-cerveau` path). Both healthy post-swap, zero warnings in the journal.

**Live-verified — the actual exit gate from §5's Phase 1, met:**

1. **Baseline (untenanted) control, unchanged:** a `security_brain` cron job asked to call `graph_remember` correctly reported it has no such tool (*"Looking at my available tools, I don't see a 'graph_remember' tool in the list... NO_GRAPH_TOOL"*) — proving the fix is additive, not a blanket grant.
2. **First tenant-scoped attempt — partial, and worth keeping in the record honestly:** the same job, tenant-stamped, had the model reason *"I have access to this tool in my available functions list"* — real proof `TENANT_CONTEXT` was populated and the tool registered — but then output a contradictory final `NO_GRAPH_TOOL` without ever calling it (a reasoning-model coherence glitch, not a wiring failure: no tool call was attempted either way, confirmed by an empty `cognee.graph_node` query for the test marker). Logged rather than quietly retried away, because "the tool became visible" is itself half the exit gate and shouldn't be lost in a rerun.
3. **Retry with a more directive prompt and the tool's actual parameter name (`text`, prose — not `content`, not a bare keyword) — full success:** `cognee.graph_node` gained a `TextSummary`, a `DocumentChunk`, and two extracted `Entity` rows (`"CADENCE-1739"`, `"ADR009Verifier"`) for the exact test sentence, all under `source_user = eae88328-84e4-506e-9871-0ec2a17ebe3b` — cognee's own deterministic hash of the synthetic tenant identity used (`adr009-verify-tenant:customer_service`), never seen before or since. This is the `SELECT on cognee.graph_node for that tenant's source_user` §5 asked for.

All test cron jobs and all four test graph rows were deleted after verification (`DELETE FROM cognee.graph_node WHERE id IN (...)`, confirmed 4 rows removed) — no synthetic data was left in a real table.

**What Phase 1 does not yet do (by design — see §5):** nothing outside Cerveau itself can create a tenant-scoped job (no dashboard, no self-serve API — Phase 2); no per-tenant quota (Decision 4); no approval-parking UX for an unattended job that hits an `Irreversible` tool (Decision 5, still exactly as hard as §4 describes — untouched by this phase). Phase 1 only proves the mechanism is real and correctly gated; Phases 2–4 are what make it a product feature.

## 10. Phase 2 — the store, the API and the quota, 2026-09-05

`app/routes/tenant_scheduled_runs.py` (`avry-backend@7d94e7b`), mirroring `tenant_mcp_servers.py` throughout: same connection helper, same idempotent `_ensure_schema`, same tier and engine gates, same internal-token seam.

| | |
|---|---|
| Dashboard (JWT) | `POST` create · `GET` list · `PATCH` pause/resume/edit · `DELETE` soft-delete |
| Internal (`X-Internal-Token`) | `GET /internal/all` · `GET /internal/{user_id}/{agent_type}` · `POST /internal/{run_id}/ack` |
| Gates | paid tier (Operational+), `engine = 'cerveau'` |
| Quota | Operational 1 · Business 5 · Enterprise 20 |

### These schedules do not run yet — and the design refuses to pretend otherwise

Phase 1 built the runtime half; what is still missing is the sync that copies rows from this table into Cerveau's own cron store. Until it exists a row stays `pending_activation` and nothing fires.

That is why `status` is a real column with an internal `ack` route rather than a derived boolean: **the record can never claim to be live before Cerveau has said it owns it.** Any content change, and pausing, drop the row back to `pending_activation` — a paused schedule must not keep reporting `active` while Cerveau still holds the old job. `GET /internal/all` deliberately returns disabled rows too, so the future reconcile can tell *"pause this"* apart from *"this no longer exists"*, and `DELETE` is soft for the same reason.

**Do not surface this in the dashboard (Phase 3) before that sync lands.** "Appears to work in the UI and silently never runs" is the exact failure §6 was written about.

### Two hard requirements, both learned the expensive way

**`timezone` is required and must be a real IANA zone.** Cerveau resolves a tz-less cron expression against the *runtime host's* zone — `Asia/Shanghai` on this VPS — which is meaningless to a tenant and silently lands the schedule hours from where they asked. §6a spent an investigation on exactly that. A tenant-facing schedule may never inherit it, so the boundary rejects a missing or unknown zone outright.

**Quotas are small and the minute field is floored.** Recurring unattended runs are the easiest way to generate surprise LLM spend (§8), so the ladder sits below the custom-MCP one — an MCP server costs nothing until a turn calls it; a schedule bills whether or not anyone reads the result — and `_reject_runaway_frequency` refuses `*` or any step under `*/15` in the minute field. That check is documented as what it is: a floor on the two shapes that actually cause runaway spend, not a general minimum-interval calculation, which would need full schedule expansion.

### The cron validator is hand-written on purpose

The goal is to accept **exactly** what the runtime accepts, not everything some parser tolerates. That cut both ways: a first draft capped day-of-week at 6 and rejected day names, which is *stricter* than Cerveau and would have refused perfectly valid schedules. Probed against the live instance to settle it rather than reasoning about it — `0 9 * * 7` accepted by both, `0 9 * * MON-FRI` accepted by both, `0 9 * * 8` rejected by both (`Invalid weekday value: 8 (expected 0-7)`).

### Verified

DDL validated against avry-postgres inside a rolled-back transaction before anything was created. After deploy: routes registered, `401` on the JWT routes and `403` on the internal ones without credentials, all five paths in the OpenAPI document, and `_ensure_schema` created the real table on first internal call.

The exit gate itself was exercised against the real store under a synthetic `user_id`, with only the tier and engine gates stubbed (they read unrelated tables): **10/10** — create lands `pending_activation`; a duplicate name is `409`; the sixth schedule on a Business plan is refused with *"allows 5"*; pause clears `enabled` and returns the row to `pending_activation`; an unknown timezone and an every-minute expression are both rejected; the internal read sees live rows only; soft-delete frees the name for immediate reuse; `ack` marks the row `active`. All six test rows removed afterwards — the table is back to empty.

## 11. Phase 2b — the reconcile that finally joins the two halves, 2026-09-05

Phase 1 built the runtime half, Phase 2 built the store; §10 says plainly that nothing yet copied a row from one to the other. `crates/zeroclaw-runtime/src/cron/tenant_sync.rs` is that copy.

**A reconcile, not an event feed.** avry-backend could push on create/update/delete, which is simpler right up until one push is lost — and then a schedule silently never runs, which is the exact failure mode §6 was written about. A periodic pass (60s) that makes Cerveau's `cron_jobs` match the backend's list is self-healing: a missed change costs one interval, not a support ticket.

**Ownership of a row is explicit.** Everything the reconcile creates carries `source = "tenant_schedule"`, and `upsert_tenant_schedule_job` refuses outright to touch a row with any other source. The delete pass only ever considers that source, so an operator's own cron job or a declarative one from `config.toml` is never in scope no matter what the backend returns.

**`next_run` is recomputed only when the schedule string actually changed.** The first draft recomputed it on every pass, which looks harmless and is not: a job that fires hourly would have its next firing pushed 60s further out every 60s and would never fire at all. Anything else — name, prompt, enabled — updates in place without touching the clock.

**Fails open at every step**, like the rest of the tenant stack. An unreachable backend leaves the existing cron rows exactly as they are and retries next interval; deleting a working schedule because a read failed would take it offline over a transient outage. The one thing it will not do is guess: a row it cannot turn into a valid schedule is acked back as `failed` with the reason, so the tenant sees why rather than watching nothing happen. Acks are sent only when the backend's `status` is actually stale — re-acking an unchanged row every minute is pure write traffic.

### The duplicate-billing problem, caught before deploy

Production runs two Cerveau instances behind one HAProxy, sharing one backend but **not** one cron store. With the reconcile unconditionally on, both would have created a job for the same tenant schedule and it would have fired — and billed — twice per period, with nothing in either instance able to notice.

Ownership is therefore declared, not inferred: `AVRY_TENANT_SCHEDULE_SYNC=1` on exactly one instance, off by default. The two ways of getting that wrong are not symmetric, which is what settles the default. An instance that wrongly stays off leaves the backend row at `pending_activation` — precisely what §10 built that column to announce. An instance that wrongly turns on produces silent duplicate LLM spend, the §8 risk. An unrecognised value means off for the same reason.

A backend-side lease (owner column + TTL) would remove the manual step and survive the owner going down. It waits for a pool larger than two.

### A stack overflow that was mine, not the framework's

Wiring the spawn into `daemon::run` the same way the verifier sweep above it is wired turned `daemon::tests::registry_gateway_starter_can_trigger_daemon_reload` into a hard `stack overflow, aborting` / SIGABRT — reproducible alone, and gone the moment the spawn was reverted, so not a flake and not a parallelism artifact.

The cause is not future *size* in the usual sense: the async block owns a `Config` and is built as a temporary before `spawn!` takes it, so built inline it sits in `run`'s poll frame for the whole of boot — and that frame was already close enough to the limit that one more was enough. Moving the spawn into its own `#[inline(never)]` fn puts the temporary in a frame that is released before the deep part of boot runs; `reconcile_loop` boxes its own body so the future it hands over is roughly a `Config` and a token rather than the whole loop. Both fixes are recorded in the code, because the next person to add a spawn to `run` will hit the same wall.

### The identity bug the first test set would have blessed

`apply_row` stored `<user_id>.<agent_type>` in `CronJob::tenant_id`. That field is handed straight to `resolve_tenant_context`, whose registered resolver assigns it to `TenantSelector::user_id` and derives the composed alias *itself* (`TenantSelector::tenant_id()`). Storing the composed form would have made the selector `user_id = "u1.customer_service"`, resolved no persona row, and had `run_agent_job` refuse every tenant schedule at fire time — refuse *quietly*, since the refusal goes to the journal, not to the tenant. A schedule that says `active` and never runs is precisely the §6 failure mode this whole ADR exists to avoid, arrived at from a new direction.

It survived a test because the test asserted `format!("{user_id}.{agent_type}")` against the literal `"u1.customer_service"` — it exercised the format macro and nothing else. Two more tests in the same set had the same shape (restating a condition inline and asserting on the copy). Both were replaced with tests that go through the real code: a round-trip through `apply_row` and the store asserting on `tenant_selector()`, and an extracted `ack_decision` the ack-suppression test can actually falsify. `CronJob::tenant_id`'s own doc now states raw-vs-composed outright, since the two are indistinguishable by type.

**Tests:** 10 new (6 store, 4 sync), including the `next_run`-only-on-change contract, the source-ownership refusal, the ack-only-when-stale rule, and the ownership gate's asymmetric default. Full `zeroclaw-runtime` suite: 3593 passed, 0 failed.

### Deployed and live-verified, 2026-09-05

Commit `369fa357`, CI green (`cerveau-quick`, `cerveau-build`), binary swapped on both instances (sha256 verified end to end: `dfc9aa42…` artifact, old binary backed up as `zeroclaw-cerveau.bak-pre-adr009-phase2b-20260905`). Both healthy on `:3100`, `:3101` and the `:3105` front, zero warnings in the journal throughout.

The full lifecycle was exercised against the real store and the real reconcile, with a January cron expression so nothing ever fired and the check cost no LLM spend:

| | |
|---|---|
| Insert a row (`pending_activation`) | within one interval, a `source = 'tenant_schedule'` cron job appears on instance A |
| Identity | `tenant_id = adr009-p2b-verify`, `tenant_agent_type = customer_service` — the raw user id, the bug above |
| Timezone | `next_run = 2026-12-31T20:00Z` = 2027-01-01 03:00 `Asia/Jakarta`. The §6a requirement, proven rather than asserted |
| Ack | row flips to `active`, `cerveau_job_id` set, `last_synced_at` stamped |
| Steady state | `last_synced_at` and `next_run` both unchanged across two further passes — zero writes, no clock drift |
| Pause | cron job `enabled = 0`, `next_run` untouched, row acked back to `paused` |
| Soft-delete | cron job removed; the store is back to zero rows |
| Instance B | no cron store at all, no duplicate job, silent throughout — the ownership gate holds |

The test row was deleted afterwards; `product.tenant_scheduled_runs` is empty again.

**Still open (Phase 3):** the dashboard UI. §10's warning stands with one clause removed — the sync now exists, so surfacing schedules no longer risks "appears to work and silently never runs". What remains unbuilt is the tenant-facing view and the approval-parking UX for an unattended run that hits an `Irreversible` tool (Decision 5).

## 12. Phase 3 — the tenant-facing half, 2026-09-05

Everything up to here was infrastructure a customer could not reach. Phase 3 is the part they touch: a **Schedules** tab in Customise Agent, and two things the Notification Centre could not previously say.

### Nobody is asked to write cron — and that is a safety property

The form offers four shapes (daily, weekdays, weekly, monthly) plus a time, and builds the expression itself. Every shape writes a *literal* minute, so the UI has no way to express the every-minute schedule §10's `_reject_runaway_frequency` exists to refuse. The cheapest way never to generate a schedule that bills every minute is to have no way to say one. Day-of-month stops at 28 for a related reason: a run set for the 31st would quietly not happen in most months, and a schedule that silently does not run is worse than one that never offered the date.

An expression the builder could not have written (`0 9 * * MON`, `*/15 * * * *`, `0 9 * * 7`) parses back as `null` and is shown verbatim. Approximating it into the nearest shape would silently rewrite the tenant's schedule the next time they pressed Save on an unrelated field.

The timezone is taken from the browser rather than asked for, which closes §6a at the only place it can actually be closed — the moment the schedule is written.

### Status is rendered, never derived

A schedule the tenant has switched on reads **"Waiting for the agent"** until the reconcile has created the job and acked it. This is the whole reason §10 made `status` a real column, and the UI would have thrown it away by rendering `enabled` instead. Backend refusals are passed through verbatim: the quota message already names the plan and its allowance, the timezone message already explains why one is required.

### The Notification Centre: two things it could not say

**A schedule that has stopped.** The reconcile acks an unusable row back as `failed` with a reason, but the only place that showed it was the tab behind Customise Agent — the last place anyone looks when they have not noticed anything is wrong. `useScheduleAlerts` surfaces those in the office feed, in `error` tone (this is not a decision waiting for someone; it is work the customer believes is happening that is not) and with no action button, since fixing it means editing the schedule and a button that only opens another screen is worse than the sentence saying where to go. Only `failed` is surfaced — `pending_activation` is normal and transient during the reconcile's interval, and a notification for it would fire on every edit and train people to ignore the feed.

**Whether anyone is actually waiting.** An approval raised by a run that fired at 03:00 blocks nobody; one raised in a live conversation is holding a person up. The card said *"Waiting for your decision"* over both, which for the first is not merely uninformative, it is wrong.

### The runtime gap that made the second one possible — and a real bug it exposed

`run_agent_job` scoped `TENANT_CONTEXT` but never `TURN_ORIGIN_CONTEXT`. Two consequences, one cosmetic and one not:

- **Not cosmetic:** an approval a scheduled run created carried no `origin_message`, so resolving it later resumed the turn with the literal text *"(original message not captured)"* — the model asked to continue a conversation it cannot see. It now carries the schedule's own instruction. The session id is the real session path, not a synthetic label, because the resumed turn's memory recall is scoped by it and must land on the session the original run used.
- **The signal:** the isolated-cron session prefix (`cron-`) is the only thing on a stored row that distinguishes unattended from live. It is now a named constant with exactly one reader (`is_unattended_session`) and a test pinning the writer to it — changed alone, either side would silently stop the office telling the two apart. A `Main`-target cron job shares the interactive session by design and reads as attended; that is the safe direction of the error, since a missing badge costs nothing and claiming nobody is waiting when someone is costs them the wait.

The gateway exposes `unattended` and `origin_message` on the approvals JSON. avry-backend's proxy passes rows through verbatim, so it needed no change at all.

### Verified

Rust: 3595 runtime + 450 gateway, 0 failures — including 3 new gateway tests on the JSON (a scheduled row marks unattended; `None`/`sess-42`/`main` do not; a missing origin serialises as `null`, not an empty string that would render as a blank line) and the writer/reader pinning test.

Dashboard: 286 tests, 0 failures, production build clean. 7 of those are new, on the builder/parser: the literal-minute invariant across every cadence and every minute, the round-trip, the 28th clamp, and the refusal to approximate.

Rendered against a throwaway local stand-in for avry-backend rather than monkey-patched in the page, so the real fetch path and hook ordering ran. All three states confirmed live in the rail: `SCHEDULED RUN` + the schedule's own instruction, `NEEDS APPROVAL` + "Waiting for your decision" unchanged, and `NOT RUNNING` + the backend's reason + where to fix it. The Schedules tab was checked for all four status pills, the cadence sentences, and the conditional day/day-of-month controls.

Deployed: Cerveau `b11c720a`, dashboard `7d3be9d` (both `Ran on a schedule` and `Waiting for the agent` confirmed present in the served production bundle).

**Binary swapped and live-verified, 2026-09-05.** sha256 matched end to end (`38f45637…` artifact → upload → extract), old binary backed up as `zeroclaw-cerveau.bak-pre-adr009-phase3-20260905`, both instances stopped together (one shared `/usr/local/bin/zeroclaw-cerveau`) and restarted healthy on `:3100`, `:3101`, `:3105` with zero warnings in the journal.

The new API fields were checked against the running gateway rather than inferred from the unit tests: two synthetic pending-approval rows under a throwaway principal, one with `session_id = cron-abc123` and one with `sess-42`, read back through `GET /webhook/approvals` — `"unattended": true` and `"unattended": false` respectively, both carrying `origin_message`. Rows deleted afterwards.

The reconcile was re-exercised after the swap, since `scheduler.rs` changed underneath it: a row inserted for a synthetic tenant produced a `source = 'tenant_schedule'` cron job with the correct raw `tenant_id` and a `next_run` honouring `Asia/Jakarta`, the backend row went `active` with `cerveau_job_id` set, and deleting the row removed the job. Cron store back to zero rows, `product.tenant_scheduled_runs` back to empty.

**Honest limit:** the click-through was done against a stub, not a logged-in production session — the same open item ADR-009's earlier phases and the Deep Diagnostic language work carry. The API contract itself was read from `tenant_scheduled_runs.py` directly and exercised 10/10 against the real store in §10.

### What is left

Decision 5's approval parking is now legible but not yet complete: an unattended approval that nobody ever resolves has no expiry, so a schedule can accumulate them silently. Small, and not a correctness gap.

## 13. Phase 3a — the allowance, and what a run actually spends, 2026-09-05

Decision 4's quota was enforced but invisible: a tenant learned it by hitting it, after writing a whole schedule.

**The number travels with the list.** `GET /api/v1/tenant-scheduled-runs` now returns `quota: {per_agent_limit, tier, tier_label}`. The dashboard keeps no copy of the ladder — a second copy would drift the first time a plan's allowance changed, and it would drift *silently*: the UI would keep promising an allowance the API no longer grants, and the tenant would find out by being refused. It is `per_agent_limit`, not `limit`, because the cap is per (user, agent_type) and a caller listing every agent at once must not read it as a total.

`_effective_tier` is `_require_paid_tier` with the judgement removed. The list route must not reject a caller it exists to serve: a tenant on a plan without scheduled runs still gets their (empty) list, and telling them what their allowance *is* is the entire point of showing a quota. `_quota_for_tier` returns `0` below the minimum — not an error, just nothing allowed, which is a thing the UI can render.

**At the limit the form is not offered at all**, and the reason takes its place next to the way to free a slot. The backend's refusal is well-written but arrives *after* the work; this is the same information before it. A plan with no scheduled runs reads as exactly that, never as "0 of 0".

**Intelligence Credits sit on the same line**, because a scheduled run spends them: deciding whether to add one is deciding whether to spend. Omitted for a superadmin, whose balance is unlimited and whose number would be noise. The low-balance threshold is the same 15% the existing credits pill on the Agents page uses, so the two never disagree about what "low" means.

### Verified

Backend helpers exercised against the real identity tables inside the running container: a user with no plan resolves to `free` / limit `0` — a path that previously would have raised `403` from `_require_paid_tier`, which is exactly the change — and a superadmin resolves to `enterprise` / limit `20`. `identity.user_tiers` currently holds no paid rows, so operational and business could not be exercised live; that ladder is unchanged from §10, where "the sixth schedule on a Business plan is refused with *allows 5*" was part of the 10/10 exit gate.

UI checked in five states against a throwaway local stand-in (2 of 5 with credits; 5 of 5 in amber with the form withdrawn and the hint in its place; a Free plan reading "doesn't include scheduled runs"; a superadmin showing the quota with no credits line; a low balance turning amber at the shared 15% threshold). 286 dashboard tests, 0 failures, clean production build.

Deployed: avry-backend `b65038b` (rebuilt, healthy, routes and auth gates intact), dashboard `e5be2f0` (`Intelligence Credits left` confirmed in the served production bundle).
