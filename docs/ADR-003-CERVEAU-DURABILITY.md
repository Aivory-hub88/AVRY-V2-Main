# ADR-003 — Aivory Cerveau Phase 2.5: Durability (F-1 / F-2)

**Date:** 2026-07-17
**Status:** F-2 ledger primitive landed; F-2 wiring + F-1 deferred to dedicated patches
**Context:** Phase 2.5 of [DEPLOYABLE_AGENT_RUNTIME_PLANNING.md](DEPLOYABLE_AGENT_RUNTIME_PLANNING.md); builds on [ADR-001 §0.2](ADR-001-AIVORY-CERVEAU-PHASE0.md) (durability findings) against the v0.8.3 `control_plane`.

---

## What v0.8.3 already gives us (verified in the fork)

- **First-class hold/resume:** `TaskStatus::Paused` (non-terminal), atomic `pause_goal_task` / `resume_goal_task`, durable `GoalBlocker[]` resume surface, `claim_owner` for a new boot. Multi-day *waiting* tasks are already durable.
- **Crash reconciliation:** `recovery_pass` at boot marks prior-boot `Running` orphans `Lost`; the reaper times out same-boot hung tasks. Correct, but **terminal** — a crashed in-flight task is not resumed.
- **Continuation storage:** `TaskContinuationContext` (channel/reply/history scope) persists per goal task; `resume_goal_task` re-synthesizes a trusted turn.

## F-2 — Idempotency ledger for side-effectful tool calls → **primitive LANDED**

The narrow risk from ADR-001 §0.2: a turn that crashes mid-execution and is later replayed could re-run a side-effectful tool (re-send an email, re-create an invoice). Worse than a clean failure.

**Landed (patch 0004):** `control_plane/tool_idem.rs` — a durable SQLite ledger (same `control_plane.db`, same `Mutex<Connection>`+WAL pattern as the task store) with a three-state claim protocol:

- `claim(key)` → `Claimed` (first sight; execute then `complete`), `AlreadyDone(output)` (reuse, do not re-execute), or `InFlight` (claimed-but-not-completed = the crash case).
- `derive_key(principal, task_id, turn_id, tool, args)` — length-prefixed SHA-256 so field boundaries can't collide.
- `complete` is idempotent (first output wins); `release` clears a claim a caller abandoned before any side effect.

6 unit tests: stability/collision-resistance, claim→complete→replay-reuse, in-flight-on-crash, release, complete-idempotence, distinct-key independence.

**Deferred (its own patch):** wiring the ledger into `agent/tool_execution.rs::execute_one_tool`. The blocker is *correctly classifying which tools are side-effectful* — zeroclaw expresses this through the risk/approval system (`ApprovalManager::approval_requirement`), which is autonomy- and config-dependent (Full autonomy marks everything `Approved`, ReadOnly marks everything `NotRequired`), not a clean boolean. Wiring it wrong (dedup a read tool, or miss a mutating one) is worse than not wiring it. This needs a deliberate side-effect taxonomy + tests, so it is not rushed into the hot loop.

## F-1 — Auto-resume of crashed in-flight tasks → **deferred, correctly scoped**

Intended: at boot, an owned prior-boot task that has a persisted `TaskContinuationContext` should be *resumed* (enqueue its continuation) instead of marked `Lost`.

**Why deferred, not half-built:** there is no boot-time goal-execution *driver* to enqueue into. `ControlPlaneHandle.store` is typed `Arc<dyn TaskRegistry>` — the `GoalTaskRegistry` (which owns continuation contexts and `resume_goal_task`) isn't even exposed on the handle, and nothing in the runtime drives goal continuations at startup. Making `recovery_pass` mark such tasks resumable *without* a driver to pick them up would strand them in a non-terminal state forever — strictly worse than today's clean `Lost`. F-1 is therefore a real feature (expose the goal registry on the handle + a boot continuation-drive loop that re-injects turns through the channel runtime, itself gated by F-2 so re-injection can't double-fire side effects), scoped as its own patch after F-2 wiring.

## Exit-gate status (Phase 2)

- **Identity + isolation half — MET and live-verified** (two data-row-only tenants, distinct personas, no cross-tenant knowledge/memory leak; 5 CI isolation tests).
- **Durability half — partially met:** hold/resume durable (upstream v0.8.3); no-double-execute primitive landed (F-2 ledger). Auto-resume of a crashed *in-flight* multi-day task (F-1) + ledger hot-path wiring are tracked follow-ups, not blockers for the identity/isolation cutover that Phase 6 depends on.
