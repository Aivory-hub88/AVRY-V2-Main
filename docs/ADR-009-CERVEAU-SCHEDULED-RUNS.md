# ADR-009 — Scheduled Runs: a capable scheduler that cannot see a tenant

**Status:** Proposed (engine audited and proven live; the product gap is scoped, nothing built yet)
**Date:** 2026-09-03

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
- **The scheduler did not demonstrably execute a job.** A zero-cost shell job (`echo`, no model call) scheduled via `cron once --agent analyst_brain 2m` was accepted and stored, but had not run ~5 minutes past its fire time with the daemon up the whole while (`last=never`). After a daemon restart the job vanished from `cron_jobs` with **no row in `cron_runs`** and no journal line — consistent with being dropped, not executed. `scheduler.status` reported `ok` throughout. See §7.

That last point matters more than the rest of this ADR: **there is no point scoping tenants onto a scheduler that may not fire.** §7 is now the first thing to settle.

## 4. Design

**Decision 1 — Extend `CronJob` with an optional tenant, do not fork the scheduler.** Add `tenant_id: Option<String>` (plus the `agent_type` the tenant layer keys on). `None` preserves today's operator-run behaviour exactly, so nothing existing changes; `Some` makes it a tenant run. The scheduler is otherwise fit for purpose and should not be rewritten.

**Decision 2 — Wrap the run, do not rebuild it.** `run_agent_job` gains a `TENANT_CONTEXT.scope(...)` around its existing execution when the job carries a tenant. The whole tenant-gated stack (memory, graph, Composio, custom MCP, approvals) then lights up for free, because every one of those already reads the same task-local.

**Decision 3 — Tenant jobs must resolve tenant context at fire time, not at creation time.** A schedule created in January and firing in June must see the tenant's *current* connected toolkits and custom MCP servers, not a snapshot. That means calling the same resolver the gateway uses per request, not caching a `TenantContext` in the job row.

**Decision 4 — Quota per tenant, not just globally.** `scheduler.max_tasks = 64` is an install-wide cap; with tenants it becomes a shared resource one customer can exhaust. Needs a per-tenant cap, tiered like ADR-006 §B's custom-MCP quota (Operational/Business/Enterprise).

**Decision 5 — Approvals are the hard part; treat it as a first-class question, not an afterthought.** A scheduled run has no human present, and Cerveau's approval gate is fail-closed (ADR-008 §4: the delegate hop died exactly this way). An unattended job that hits an `Irreversible` tool must either park as a pending approval for the tenant to resolve later, or be refused up front. **Parking is the right answer** — the tenant-scoped approval route already exists and is proven live (ADR-006 §B3) — but "the job ran at 3am and is waiting for you" needs real UX in Mission Control, not just a DB row.

**Decision 6 — Failure and cost visibility.** `max_run_history = 50` and `last_status`/`last_output` already exist; the tenant needs to *see* them. A silent 3am failure that nobody notices for a week is worse than no feature.

## 5. Phasing

**Phase 1 — Tenant-scoped execution (Rust, Cerveau).** `tenant_id` + `agent_type` on `CronJob`; `TENANT_CONTEXT.scope(...)` in `run_agent_job`; resolver call at fire time. *Exit gate:* a job created for a real tenant fires unattended and demonstrably reaches that tenant's memory and graph — verified by `SELECT` on `cognee.graph_node` for that tenant's `source_user`, the ADR-007 §14 method. No dashboard needed yet; the CLI is enough to prove it.

**Phase 2 — Backend API + quota (avry-backend).** `product.tenant_scheduled_runs` (mirroring `tenant_custom_mcp_servers`), JWT-authenticated CRUD, tiered per-tenant cap, internal endpoint for Cerveau. *Exit gate:* a tenant creates/pauses/deletes a schedule through the API and cannot exceed their tier's cap.

**Phase 3 — Dashboard UI.** Schedule list with next/last run and status, create/pause/delete, and — the load-bearing part — **parked approvals from unattended runs surfaced in the Notification Centre**, reusing the existing approval card. *Exit gate:* a tenant sees a 3am run's result, and resolves an approval it parked.

**Phase 4 (optional) — Let agents schedule their own follow-ups.** The `cron_add`/`schedule` tools already exist; adding them to `allowed_tools` would let an agent say "I'll check back in a week." Deliberately last: it multiplies scheduled load and is the easiest way to create runaway cost.

## 7. The blocker: the scheduler does not execute jobs (5 probes, reproducible)

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

**Not established.** Where between `due_jobs` → `claim_due_jobs` → `process_due_jobs` → `run_*_job` the work is lost. Candidate paths worth reading first: the `release_job` branch in `process_due_jobs` when `resolve_owning_agent` returns `None`, and whether one-shot (`Schedule::At`) jobs are deleted before a run record is written, which would erase the failure reason along with the row.

**This should be diagnosed with a debug build and a real log sink, not more config toggles against production.** Five probes is enough to establish the behaviour; it is not the right tool for finding the line.

**Consequence for this ADR: Phase 1 does not start until this is fixed.** Scoping tenants onto a scheduler that discards its jobs would produce a feature that appears to work in the UI and silently never runs — the worst possible failure mode for something a customer relies on to happen at 3am.

## 8. Found on the way: observability config had been silently dead

`[observability]` carried three keys from an older Cerveau schema — `runtime_trace_mode`, `runtime_trace_path`, `runtime_trace_max_entries` — which the current binary does not know. The whole section therefore failed to parse and was "reset to defaults for this run" **on every start, on both instances**, for however long the binary has been ahead of the config.

Practical effect: `backend` and `log_persistence` were inert, so nothing configured there ever took effect — which is exactly why the scheduler's own `WARN` lines (e.g. "Cron job has no owning agent…", "failed to claim in-flight lock") were invisible during this investigation, and why the cron bug above is still undiagnosed.

Predates this work (confirmed against the pre-change backup). Stale keys removed on both config directories; the section now parses and the warning is gone. Enabling `log_persistence` still did not produce a trace file, so there is a second, separate gap in that path worth its own look.

## 9. Cost and risk notes

- Scheduler probing cost **zero model calls** for four of five probes — shell jobs need no LLM. Any future scheduler-plumbing verification should use shell jobs for the same reason; only tenant-capability checks need a real agent turn. — shell jobs need no LLM. Any future scheduler-plumbing verification should use shell jobs for the same reason; only tenant-capability checks need a real agent turn.
- `max_concurrent = 4` bounds the blast radius of a bad schedule, but with per-tenant jobs the natural failure mode is N tenants × recurring jobs. Per-tenant quota (Decision 4) is the control, and it should exist *before* Phase 3 makes scheduling self-serve.
- Recurring unattended agent runs are the single easiest way to generate surprise LLM spend in this product. Whatever the UI ends up looking like, it should show the tenant what a schedule costs per run.
