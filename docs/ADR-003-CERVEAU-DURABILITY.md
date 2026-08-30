# ADR-003 — Aivory Cerveau Phase 2.5: Durability (F-1 / F-2)

**Date:** 2026-07-17
**Status:** F-2 ledger primitive landed AND wired (patch 0013, 2026-07-26). F-1 landed 2026-08-09 (patch 0025) — see the update below.

**2026-08-09 update:** F-1 is implemented, CI-verified locally (63 `control_plane::` tests, zero LLM calls), pushed to `cerveau-main` (commit `a1e0305b`), CI-green on GitHub (run `31273610009`, 25m14s), and **deployed to `:3100`** — no config change needed (pure code patch), new PID `3572501`, stable 2+ min post-restart, health ok, 0 errors. See `docs/CERVEAU-STATUS.md` §4/§5 for the patch-0025 account. Summary: `recovery_pass` no longer reconciles a `Goal`-kind orphan with a persisted `TaskContinuationContext` to `Lost` — it durably parks it `Paused`/`GoalPauseReason::DaemonRestart` instead (safe on its own, real/inspectable/resumable state, independent of anything else). A new `continuation_drive` module then attempts ONE automatic continuation turn per candidate, gated by the F-2 ledger keyed on `(task_id, crashed_boot_id)` so a repeat crash mid-drive can't double-fire. It reuses `agent::run` + the `cron::scheduler::register_delivery_fn` hook — the exact same "runtime-initiated turn, delivered via channel, no `zeroclaw-channels` import needed" pattern `cron` already proves — rather than inventing a new crate-graph-inversion hook. **Important scope note surfaced during implementation:** `TaskKind::Goal`/`GoalTaskRegistry`/the `/goal` command have **zero producers anywhere in this fork** — `/goal` is registered in the command parser but has no execution wiring, so nothing today ever creates a resumable goal task in production. F-1 is therefore forward-looking infrastructure, not a fix for an observed failure, consistent with how this fork already ships several EPIC A–E primitives ahead of their consumers. The user was asked and explicitly chose to build it in full per this ADR anyway.
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

## 2026-08-26 note

No change to the durability mechanism (F-1/F-2) this round. The dashboard surfaces that consume F-1's approval-turn resume — the `/approvals` page and the Console inline Approve/Deny card, both via `lib/agentApprovals.ts` — got a production-build fix: the shared `describeTool` export was being dropped by a Turbopack JSDoc-parse bug (an em-dash in the comment above it) and the whole dashboard build failed with "Export describeTool doesn't exist." Resolved (comment removed); full account in `docs/CERVEAU-STATUS.md`'s 2026-08-26 deploy entry. Durability behavior itself is unchanged and still live on `:3100`/`:3101`.

## 2026-08-30 note

No change to durability this round. CI was parallelized (`cerveau-build` 1×29 min → 4 jobs ~12-14 min, `cerveau-quick` 3 min, `concurrency` + `paths-ignore: docs/**`), and branch protection was set on `cerveau-main`. Durability tests (`tool_idem`, `pg_lifecycle`, etc.) run in those gates — no logic change, just faster feedback. See `docs/CERVEAU-STATUS.md` 2026-08-30 CI entry.

**Corrected later the same day.** That protection initially required `tenant-isolation` + `postgres-tests` + `redis-tests` + `build-release`, but `cerveau-build.yml` triggers only on `push: [cerveau-main]` and `workflow_dispatch` — never on `pull_request`. Three of the four could therefore never report on a PR, so **every PR to `cerveau-main` was permanently unmergeable** with nothing actually failing. Relaxed to `["tenant-isolation"]` (`strict: true`), which matches `367319ca`'s own split: `cerveau-quick` gates PRs, `cerveau-build` gates the release. The durability tests still run — they now report after merge, on the release gate, rather than on the PR. If `postgres-tests` starts breaking on `main`, the fix is to add `pull_request` to `cerveau-build.yml`, not to change protection again.

**Durability-adjacent change, no mechanism impact:** `/api/memory` became tenant-aware (see `CERVEAU-TECHNICAL-REFERENCE.md` §9). It routes through `create_memory_for_tenant`, the same structurally-jailed handle a tenant turn already uses, so the isolation guarantees this ADR's exit gate covers are unchanged — the endpoint simply stopped being unable to reach them.
