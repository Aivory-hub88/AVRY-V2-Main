# ADR-014 — Cerveau delegation envelope and the task-ledger link: an A2A-shaped contract without the wire protocol

**Status:** Approved 2026-09-19 (decisions in §8 resolved). Phase A1 implemented, deployed and live-verified 2026-09-19 (`AVRY-Cerveau@5fcd622e2`, §11); one-week observation window running. Phase A2 implemented, deployed and live-verified 2026-09-19 (`AVRY-Cerveau@b5fd5882d`, §12); the live check found a pre-existing depth bug in background/parallel delegation, fixed in `9fe78f0ad`, deployed and live-verified (§12.1). P1-P3 not started. Every "today" claim below was read from source on 2026-09-19 (`AVRY-Cerveau@7cc6323af`, `avry-user-dashboard` working tree); items not verified are listed in §9.
**Date:** 2026-09-19
**Context:** The ask was "what can we copy from LobeHub and Hermes (which ships an A2A plugin) to make Cerveau's agent-to-agent schema, communication flow and delegation solid and low-error", followed by "can the task ledger and the self-evolve ledger be part of A2A". Research conclusion: copy the *contract* (structured result, context id, terminal-state discipline, anti-loop, untrusted framing), not the *transport*. This ADR specifies the contract.

Related: [ADR-008](ADR-008-CERVEAU-MULTI-AGENT-COLLABORATION.md) (delegation engine, §3 "no A2A wire protocol yet" — still holds), [ADR-013](ADR-013-CERVEAU-STAGE2-TENANT-LEARNING.md) (skill-insight ledger), `services/cerveau/TASK-CONTRACT.md` (Aira orchestration convention on `cerveau.agent_tasks`), `docs/SPACE-TRD.md` (Team Space, its own task table).

---

## 0. The headline finding

**Delegation results are prose, and the ledger the tenant actually watches does not know delegation exists.** Two separate gaps, one design:

1. `delegate` returns `"[Agent 'x' (provider/model)]\n<free text>"` on success and a one-line `error` string on failure (`delegate.rs`, sync path ≈ L1573). The calling model has to *read* whether the work succeeded, timed out, is waiting for a human, or was refused. Every "Completed-but-actually-waiting" style bug (ADR-008 Phase 3b) is this same root cause.
2. `delegate.rs` has zero references to `agent_tasks`. The parent/child board a tenant sees in Mission Control is built by **convention** (`TASK-CONTRACT.md`: parent = earliest `chief_of_staff` row in a session, children = other agent_types in that session, title prefix `AIRA-orch-`), which depends on Aira's *prompt* creating the rows. Nothing ties a ledger row to the delegation that is doing the work, so Stop cannot reach it, the orphan sweep can kill it, and a failed delegation has no honest place to live.

The fix is not a new protocol. It is (A) one typed result envelope and (B) six nullable columns on the ledger that make a row a *projection* of a delegation. The self-evolve ledger (C) stays separate and becomes a *consumer* of the envelope.

---

## 1. What exists today (verified)

| Fact | Where |
|---|---|
| Four "task" stores already exist: `agent_tasks` (Postgres, per-tenant to-do), `BackgroundDelegateResult` files + `TaskRegistry` (SQLite; kinds `Delegate/Subagent/Goal/PeerInbox`), `skill_insights`, and the dashboard's `workspace_agent_tasks` (Team Space). | `task_ledger.rs`, `delegate.rs:44`, `task_registry.rs`, `workspace-space-agent-tasks.sql` |
| `BackgroundDelegateResult { task_id, agent, status, output, error, started_at, finished_at }`; `status` ∈ `Running/Completed/Failed/Cancelled/InputRequired`. **No `deny_unknown_fields`** → adding optional fields is safe in both directions. Adding *enum variants* is safe only forward (old binary fails on an unknown variant). | `delegate.rs:44-71` |
| `ToolOutput::json_with_text(data, text)` already exists: a tool can return structured `data` plus display text. | `zeroclaw-api/src/tool.rs:60` |
| Background delegates register in `TaskRegistry` with `heartbeat_at: None` — **they never heartbeat**, so no heartbeat-age timeout or stall detection can fire for them today. | `delegate.rs:1718`, `task_registry.rs` |
| `agent_tasks`: 10 columns, status `todo/in_progress/blocked/done/cancelled`. **No `failed`.** `done` moves the row to `agent_tasks_archive` (gzip JSON of `AgentTask`, ≤ 40 days). | `task_ledger.rs:264-287` |
| Orphan sweep: `in_progress` rows in a *different session*, untouched > 30 min, are parked. A legitimately long background delegate is indistinguishable from an orphan. | `task_ledger.rs:~335-346` |
| Dashboard Stop is raw SQL (`UPDATE cerveau.agent_tasks SET status='cancelled' …`); Cerveau is never told. | `app/api/aira/tasks/[taskId]/route.ts` |
| Dashboard reader selects an **explicit column list** and maps any unknown status to the `todo` column; it filters only `cancelled`. So new nullable columns are invisible to it, but a new `failed` status would render as `todo`. | `app/api/aira/tasks/route.ts` |
| Untrusted-content helpers already exist: `frame_untrusted`, `cap_untrusted`, `sanitize_untrusted`, `scan_untrusted`. Delegate output does not use them. | `zeroclaw-runtime/src/security/external_content.rs` |
| `maybe_record_skill_insight` hooks `execute_one_tool` and fires only on `!success`. **A background delegate's tool call succeeds (it returns a task id), so its later failure is invisible to the insight gate.** | `tool_execution.rs:53` |
| The latest local commit `7cc6323af` ("sync delegate hops run under the target specialist's tenant overlay") appears to close the "Lex rows attributed to chief_of_staff" gap recorded 2026-09-19. Not re-verified live. | git log |

---

## 2. Design decisions

1. **Contract, not transport.** Adopt A2A's *shape* (task id, context id, state, parts→summary, artifact→result) inside the existing `delegate` tool. No Agent Card, JSON-RPC or SSE (ADR-008 §3.1/§5 unchanged).
2. **Derive the rich vocabulary; do not store it.** `BackgroundTaskStatus` on disk keeps its 5 variants. The envelope's `state`/`reason` are *computed* from (file status, registry state, failure cause). This is what lets `rejected` and `timed_out` exist without repeating the three-enum migration ADR-008 Phase 3b deliberately avoided.
3. **Additive only.** New serde fields are `Option`/`#[serde(default)]`; new SQL columns are nullable; no status enum changes in Phase A. A rollback binary must read files and rows written by the new one.
4. **The ledger row is a projection of the delegation, never a second source of truth.** `TaskRegistry` + result file own execution state; the ledger row mirrors it for humans. Divergence is resolved in favour of the registry.
5. **`cancel` is observed, not pushed.** The dashboard writes SQL directly, so the only way to propagate Stop is for the delegation to *look*.
6. **Peer output is untrusted data.** Delegate summaries go through the same framing/cap as MCP tool results.
7. **Do not add a `failed` ledger status in Phase A.** The board would show it as `todo`. Failure is expressed as `blocked` + `outcome` (§5.3). Revisit once the dashboard tolerates unknown statuses (§8).

---

## 3. Part A — the delegation envelope (`DelegateEnvelope`, `v = 1`)

### 3.1 Shape

```jsonc
{
  "v": 1,
  "task_id": "b6f0…",               // = BackgroundDelegateResult.task_id; generated for sync hops too
  "context_id": "ctx_3a1c…",        // A2A contextId; groups related delegations (§4)
  "parent_task_id": "9d2e…",        // ledger row of the delegator, if any
  "agent": "leads_qualifier",       // alias called (as today)
  "mode": "independent",            // bounded | independent
  "execution": "background",        // sync | background | parallel

  "state": "completed",             // working | input_required | completed | failed | rejected | canceled
  "reason": null,                   // see 3.2; null when completed/working
  "retryable": false,
  "hint": null,                     // ≤ 160 chars, model-facing next-step advice

  "summary": "…",                   // the sub-agent's final text, framed + capped
  "truncated": false,

  "error": null,                    // one line, no stack traces
  "approval": null,                 // { "pending_id": "…", "tool": "create_lead" } when input_required

  "timing": { "started_at": "…", "finished_at": "…", "duration_ms": 41230,
              "timeout_secs": 300, "timeout_phase": null },   // phase only when reason=timed_out

  "untrusted": true,                // summary is peer output, never instructions
  "redactions": 0                   // credential-shaped strings scrubbed from summary
}
```

Reserved for later phases (absent in v1 rollout, same envelope version): `output` `{schema_valid, schema_errors, data}` (Phase 2), `verification` `{verdict, suggestion}` (Phase 3), `usage` `{iterations, tool_calls, cost_cents}` (Phase 2).

### 3.2 `state`, `reason`, `retryable`

`state` is the coarse, A2A-aligned value the caller branches on. `reason` is the fine cause. Both derived.

| `state` | `reason` | Source today | `retryable` | `hint` (model-facing) |
|---|---|---|---|---|
| `working` | — | `Running` | — | "still running; use `check_result`/`await_sessions`" |
| `input_required` | `approval_pending` | `InputRequired` (+ `LAST_PENDING_APPROVAL`) | — | "waiting on a person; do not retry or re-create" |
| `completed` | — | `Completed` | — | — |
| `failed` | `approval_denied` | approval `Denied` | **no** | "a person refused; do not repeat this action" |
| `failed` | `timed_out` | timeout branch / registry `TimedOut` | no | "narrow the task before retrying" |
| `failed` | `provider_error` | `chat` error after provider retries | yes | — |
| `failed` | `tool_error` | sub-agent turn error | maybe | — |
| `failed` | `lost` | registry `Lost` (daemon restarted mid-run) | yes | "may have partially run; reads are safe to retry" |
| `failed` | `schema_invalid` *(P2)* | `output_schema` failed after 1 retry | yes | — |
| `rejected` | `policy_forbidden` | `delegation_policy` ≠ allow | no | — |
| `rejected` | `depth_exceeded` | `max_delegation_depth` | no | — |
| `rejected` | `unknown_agent` / `not_reachable` | not in `reachable_delegate_targets` | no | — |
| `rejected` | `context_turn_cap` *(P1)* | §4 | no | "stop and answer the user with what you have" |
| `canceled` | `cancelled_by_operator` / `cancelled_by_caller` | `Cancelled` | no | — |

`rejected` = refused before any work started (no ledger row is created, §5); `failed` = work was attempted. This finally gives ADR-008 Phase 3b's deferred `rejected`/`failed` distinction a consumer: the ledger `outcome` (§5) and the insight sources (§6).

### 3.3 Delivery — model-facing text and structured data

Both are produced with `ToolOutput::json_with_text(data, text)`; `text` keeps the existing first-line prefix so current prompts that reference it keep working:

```
[Agent 'leads_qualifier' (deepseek/deepseek-v4-flash, agentic)] state=completed task=b6f0… context=ctx_3a1c…
<framed, capped summary>
```
```
[Agent 'leads_qualifier' (…)] state=input_required reason=approval_pending task=b6f0… approval=pd_81c… tool=create_lead
hint: waiting on a person; do not retry or re-create.
```

`ToolResult.success` keeps its meaning (`false` for `failed`/`rejected`, `true` otherwise, including `input_required`) and `error` stays a one-line string, so the existing failed-result guardrails and duplicate-call guard behave unchanged. The envelope rides in `output.data` in *both* success and failure (today a failure carries no output at all).

`summary` is passed through `cap_untrusted` + `frame_untrusted` (default cap 16 KiB, proposed `[delegation].max_summary_bytes`) and scrubbed of credential-shaped strings; `redactions` counts what was removed. The full un-framed text stays in the result file for `check_result`.

### 3.4 Emitting paths

| Path | Change |
|---|---|
| sync `delegate` (bounded/independent, agentic and non-agentic) | build envelope at the two existing return sites (`delegate.rs` ≈ L1573 and ≈ L3017) |
| `background:true` | spawn returns envelope `state=working` + `task_id`; terminal envelope written into the result file |
| `parallel` | array of envelopes, one per agent, same order; overall `success` = all `completed` |
| `check_result`, `await_sessions`, `list_results` | render the stored/derived envelope; `await_sessions` returns on `input_required` exactly as today |

### 3.5 On-disk compatibility (`BackgroundDelegateResult`)

Add, all `#[serde(default)]`, none affecting the `status` enum:

```rust
pub context_id: Option<String>,
pub parent_task_id: Option<String>,
pub reason: Option<String>,           // fine cause, snake_case
pub approval: Option<ApprovalRef>,    // {pending_id, tool}
pub timeout_phase: Option<String>,
pub redactions: u32,                  // default 0
```

Required tests: (a) a fixture of a pre-change result file parses on the new binary; (b) a new-format file parses on a binary built from the previous commit (kept as a fixture check, not just reasoned).

---

## 4. Request-side additions to `delegate`

`additionalProperties` stays `false`, so these are explicit schema additions:

| Param | Phase | Semantics |
|---|---|---|
| `context_id` | P1 | Optional. Continues a prior context with the same target. If absent the engine mints one and returns it in the envelope. |
| `ledger_task_id` | A2 | Optional. **Adopt** an existing ledger row (the one Aira just created with `task_create`) instead of the engine creating a new one — avoids duplicate rows while `TASK-CONTRACT.md`'s prompt-driven convention still exists. |
| `expected_output` | A1 | Optional plain-language acceptance line, appended to the sub-agent prompt and later the input to verification (P3). |
| `context` | A1 | Stays optional in the schema; the result carries `hint: "context was empty — sub-agents start with no history"` when omitted. Promote to required only after measuring how often it is empty (§7). |
| `output_schema`, `verify` | P2/P3 | Out of scope for this ADR's first cut. |

**Carry-forward, not conversation resume.** Cerveau sub-agents have no persistent session. Continuing a `context_id` means the engine prepends the `result_summary` of the previous ≤ 2 tasks in that context (read from the ledger/archive, framed as prior findings). Deterministic, cheap, and it is what gives the ledger a second job.

**Anti ping-pong (P1).** Before spawning, count ledger rows with this `context_id` (live + archive). At the cap (proposed default 5, hard max 20 — Hermes' numbers) return `state=rejected reason=context_turn_cap`. Ledger-backed, so it survives restarts and works across turns; the per-turn 10-iteration cap already bounds a single turn.

---

## 5. Part B — ledger columns

### 5.1 Schema (added in the same `connect()` batch as today's `CREATE TABLE IF NOT EXISTS`)

```sql
ALTER TABLE "{schema}".agent_tasks
  ADD COLUMN IF NOT EXISTS context_id      TEXT,
  ADD COLUMN IF NOT EXISTS parent_task_id  TEXT,
  ADD COLUMN IF NOT EXISTS delegated_by    TEXT,   -- caller agent_type
  ADD COLUMN IF NOT EXISTS delegation_id   TEXT,   -- = envelope task_id / TaskRegistry id
  ADD COLUMN IF NOT EXISTS outcome         TEXT,   -- failed | timed_out | lost | NULL
  ADD COLUMN IF NOT EXISTS result_summary  TEXT;   -- ≤ 2000 chars, framed

-- one partial index: only delegated rows, needed by cancel-observation and the reaper
CREATE INDEX IF NOT EXISTS idx_agent_tasks_delegation
  ON "{schema}".agent_tasks(delegation_id) WHERE delegation_id IS NOT NULL;

-- so the anti ping-pong count can see finished work without decompressing payloads
ALTER TABLE "{schema}".agent_tasks_archive
  ADD COLUMN IF NOT EXISTS context_id TEXT;
```

No `parent_task_id` index (ADR-013 §3: no speculative indexes before volume data). `AgentTask` gains the same fields as `Option<String>` with `#[serde(default)]`, so archived gzip payloads written before the change still deserialize.

Compatibility to confirm at implementation (§9): every existing `SELECT` in `task_ledger.rs` uses an explicit column list or appends only, and every `INSERT` names its columns — then an old binary is unaffected by the new columns.

### 5.2 Status mapping (registry/file → envelope → ledger)

| Delegation | Envelope `state` | Ledger `status` | `outcome` | `blocked_reason` |
|---|---|---|---|---|
| `Running` | `working` | `in_progress` | NULL | NULL |
| `InputRequired` | `input_required` | `blocked` | NULL | `Waiting for approval: <tool> (<pending_id>)` |
| `Completed` | `completed` | `done` → archived | NULL | NULL (`result_summary` kept in archive payload) |
| `Cancelled` | `canceled` | `cancelled` | NULL | `Stopped by operator` / `Cancelled by <caller>` |
| `Failed` | `failed` | `blocked` | `failed` | `Delegation failed: <error>` |
| `TimedOut` | `failed` | `blocked` | `timed_out` | `Delegation timed out after <n>s` |
| `Lost` | `failed` | `blocked` | `lost` | `Delegation lost (daemon restarted)` |
| refused up front | `rejected` | *no row* | — | — |

`blocked` + `outcome` is deliberate (decision 7): the current board already shows `blocked` rows with a reason and a Stop button, so a failed delegation is visible and stoppable with **zero dashboard change**. `outcome` is invisible to the current explicit-column `SELECT`.

### 5.3 Who writes what

- **Engine, at spawn** (background only): create the row — `agent_type` = the target's tenant agent_type, `session_id` = the caller's session (so the existing "children = other agent_types in the same session" grouping keeps working), `delegated_by`, `delegation_id`, `context_id`, `parent_task_id`. Skip if `ledger_task_id` was passed: adopt and stamp the columns onto that row instead. **Sync hops (bounded or independent) get no row at spawn.** A sync hop creates a row *lazily*, only if it ends `input_required`, `failed` or timed out — the cases a person needs to see and can Stop. A sync hop that completes leaves no row (it finished inside one turn; two Postgres writes and an archive row would buy nothing).
- **Engine, at terminal transition:** write status/outcome/reason/`result_summary` through a ledger method (not an agent tool). `cancelled` is written by the engine only on `cancel_task`; the agent-facing `task_update_status` enum is unchanged and still cannot write it.
- **Agents (Lex etc.) keep** `task_create` / `task_update_status` for their own rows. `done` stays terminal; a follow-up is a *new* delegation in the same `context_id` (this matches how A2A treats terminal tasks).
- **No supersede in Phase A.** Failed rows stay `blocked` for the operator (Stop) rather than being auto-cancelled: silently cancelling would hide a failure signal from the tenant, and failed rows are few. Revisit only if the board is observed to pile up.

### 5.4 Orphan sweep and cancel observation

- `park_orphaned_tasks` gains `AND delegation_id IS NULL`. Rows with a `delegation_id` belong to the registry reaper (`Lost`/`TimedOut` → ledger `outcome`), not to a 30-minute wall-clock guess.
- **Cancel observation.** The background delegate loop reads `status` of its own row (`WHERE delegation_id = $1`, partial index) on each tick; `cancelled` ⇒ abort with `state=canceled reason=cancelled_by_operator`. This also requires the loop to *emit a heartbeat* (`heartbeat_at` is `None` today) — the same tick gives stall detection (P1) and lets the registry's heartbeat-age timeout apply. Cost: one PK-class read per tick per running delegation.

### 5.5 Dashboard

No change is required for Phase A (§5.2). Optional later, in the `avry-user-dashboard` repo (separate deploy): use `parent_task_id` instead of the "earliest `chief_of_staff` row in a session" heuristic in `lib/airaTasks.ts`, show `outcome` as a badge, and make unknown statuses fall into their own column rather than `todo`.

---

## 6. Part C — the self-evolve (skill-insight) ledger

**Not part of the A2A surface.** Insight rows are raw failure signals about a tenant, deleted on resolution (ADR-013 §3 Stage 2). They are never exposed to a peer and never merged into `agent_tasks`. What changes is that they become a *consumer* of the envelope:

- **Record at the engine, not the tool-call hook.** The `execute_one_tool` hook cannot see a background delegate's later failure (§1). The engine records at the terminal transition, where it has the full envelope.
- **New `InsightSource` values** (column is `TEXT`; new strings need no migration): `delegation_failed`, `delegation_timeout`, `context_cap`, and later `schema_invalid` (P2) and `verify_failed` (P3). `verify_failed` is the most valuable: the tool succeeded and the *work* was wrong, which the current `!success` gate is blind to.
- **Structured `signal`:** `agent=<target> reason=<reason> phase=<timeout_phase> caller=<agent_type>` instead of free text, so Stage-1 synthesis can group by cause without an LLM.
- **Not learnable, not recorded:** `policy_forbidden`, `depth_exceeded`, `unknown_agent` — those are configuration errors, not skill gaps.
- Attribution uses the *target's* tenant agent_type (post-`7cc6323af`); the caller goes in `signal`.

Verify that an unknown `source` string on a row read by an older binary is skipped, not an error, before Phase C ships (§9). `[skill_insights].enabled` is `false` by default (ADR-013); this part is inert until it is turned on.

---

## 7. Phasing and exit gates

Each phase is independently shippable; gates are live-verifiable in the ADR-006/008 style.

| Phase | Scope | Exit gate |
|---|---|---|
| **A1** | Envelope for sync + `check_result`; additive result-file fields; `frame_untrusted`/`cap`/scrub; `expected_output` param. No SQL, no ledger, no `[delegation]` config key (the summary cap is a code default). | Unit test per `reason`. Old-file/new-file fixtures both ways. Live: Aira→Lex forced failure returns `state=failed reason=…` in `output.data`; existing failed-result guardrail still trips. |
| **A2** | Ledger columns + engine row create/terminal write (background eager, sync lazy); sweep exclusion; `ledger_task_id` adopt path. | `pg_task_ledger` scenarios: delegated row survives > 30 min sweep; `failed` shows in the dashboard `blocked` column; old-binary read of a new row. Live: Stop on a delegated row is observed within one tick. |
| **P1** | `context_id` + carry-forward + turn cap; delegate heartbeat/stall; cancel observation. | Follow-up delegation sees prior `result_summary`; cap returns `rejected`; killed daemon ⇒ row `outcome=lost` after restart. |
| **P2** | `output_schema` + 1 retry; `usage`. | Invalid JSON ⇒ `schema_valid:false` with raw work retained. |
| **P3** | Verify verdicts (`passed/failed/uncertain` + suggestion, tool-less verifier, bounded iterations) + insight sources. | `verify_failed` rows appear only for verified delegations; verifier cannot approve anything (ADR-008 §3.6). |

Measure before promoting `context` to required: fraction of delegations with empty `context` over a week of `runtime-trace*.jsonl` (`tool == delegate`).

---

## 8. Decisions and open questions

Resolved 2026-09-19:

1. **`failed` as a first-class ledger status — deferred.** Requires the dashboard to stop mapping unknown statuses to `todo` first; `blocked` + `outcome` is sufficient meanwhile. Decide after A2 ships.
2. **Supersede rule — not adopted** (§5.3). Reconsider only from observed board clutter.
3. **Sync hops — lazy row** (§5.3): created only on `input_required` / `failed` / timeout.
4. **Delivery order — A1 ships alone**, runs about a week, and the `reason` distribution and empty-`context` rate are measured from `runtime-trace*.jsonl` (`tool == delegate`) before A2 is scheduled.

Still open:

5. **Team Space convergence.** `workspace_agent_tasks` (`failed`, `result_msg`, `approval_ref`) and `agent_tasks` are two ledgers for the same idea. Out of scope here; this ADR only avoids widening the gap.
6. **`AuthRequired` / `submitted` / `working`** remain deliberately unadopted for the same reasons as ADR-008 Phase 3b.

---

## 9. Not verified / to check at implementation

- Whether every `SELECT`/`INSERT` in `task_ledger.rs` is explicit-column (old-binary safety of the new columns).
- Whether an older binary errors or skips on an unknown `skill_insights.source`.
- Whether the existing credential leak scrub in `security/mod.rs` can be reused on delegate summaries as-is.
- That `7cc6323af` is live and really fixes the sync-hop `agent_type` attribution.
- Whether the background delegate loop has a natural progress tick to hang the heartbeat/cancel read on, or needs one added.
- Live `[skill_insights].enabled` state (ADR-013 says off as of 2026-09-12).

## 10. What this deliberately does not do

- No A2A Agent Card, JSON-RPC, SSE or push notifications. Those wait for a real partner trigger (ADR-008 Phase 5); when they come, `DelegateEnvelope` maps to A2A `Task` + `Message` and `context_id` to `contextId` without a data migration.
- No exposure of `agent_tasks` or `skill_insights` to any peer.
- No merge of the two ledgers, and no change to `done` being terminal.
- No new status enum on disk or in the ledger in Phase A.

---

## 11. Phase A1 outcome (2026-09-19, `AVRY-Cerveau@5fcd622e2`)

Implemented as designed, with these deliberate differences from §3 — each found while reading the code, not assumed:

| Design said | What shipped | Why |
|---|---|---|
| Frame with `frame_untrusted` (§1, decision 6) | Own compact frame `<<<DELEGATE_RESULT>>> … <<<END_DELEGATE_RESULT>>>`; `cap_untrusted` reused | `frame_untrusted` is typed to `SopTriggerSource` and adds a heavy "EXTERNAL untrusted content" banner; `sanitize_untrusted` also folds full-width characters, which rewrites legitimate CJK punctuation. Frame markers and chat-template tokens are neutralised by a small local regex instead. |
| Credential scrub via the existing `LeakDetector` | Same detector, **high-entropy heuristic off** | Sub-agent answers are full of UUIDs, lead ids and hashes the caller needs verbatim; the heuristic would corrupt them. Deterministic key/JWT patterns still run. |
| `task=<id>` in the status line (§3.3) | Only for `background` executions | The tool-loop detector hashes result *text* (`loop_detector.rs`, `result_hash`). A fresh random id in every sync result would defeat its exact-repeat and no-progress checks. The id stays in `output.data`. Regression test: identical answers render byte-identically. |
| `ledger_task_id` param in A1 | Moved to A2 | It is meaningless without ledger writes. |
| `input_required` on the *sync* path (§3.4) | Background and `check_result` only | The sync path shares the parent turn's `LAST_PENDING_APPROVAL` cell; scoping a second one changes what the parent reports. Needs its own change. |
| Hint "context was empty" (§4) | Dropped | The tool-call args are already in `runtime-trace*.jsonl`; measure there instead of paying tokens on every result. |
| Envelope fields `context_id`, `parent_task_id`, `timeout_phase`, `usage` | Not emitted | Phase 2/P1 fields. |
| Facts passed through return values | Task-local cell (`RunFacts`, same pattern as `LAST_PENDING_APPROVAL`) + `TaggedRefusal` through `anyhow` for `policy_for_target` | Keeps the ~30 existing failure sites' signatures; a site that records nothing is classified `tool_error`. |

**Surface actually changed**

- `delegate` results (sync, background start, parallel) carry the envelope in `output.data`; success text keeps its `[Agent 'x' (provider/model)]` header and gains ` state=…`; failure `error` keeps its original message plus `[delegate state=… reason=… retryable=…]` and, where one exists, `hint: …`.
- `check_result` / `await_sessions` add an `envelope` key per result; every existing field is unchanged.
- `BackgroundDelegateResult` gained one optional `meta` (`reason`, `approval_id`, `approval_tool`), `#[serde(default)]`, omitted when `None`. Old files parse; a legacy struct parses new files (both tested). No status enum changed.
- New optional `expected_output` param.

**Deployed and live-verified (2026-09-19, ~19:13 CST).** Binary `6413954c…` swapped in on `:3100` (backup `zeroclaw-cerveau.bak-pre-envelope-20260919`), `doctor` identical to the previous binary (87 ok / 22 warnings / 0 errors), health 200, 0 restarts, no panic/fatal lines in the journal. The deploy was run by the user: the auto-mode classifier blocks production swap/restart, and later also blocked a `docker exec … psql` and a read of the runtime trace, so trace-level confirmation was not collected.

Two real turns through `/webhook` (synthetic tenant `a1verify1789816508`, `X-Agent-Type: chief_of_staff`), evidence taken from what the model quoted from the tool result:

| Test | Live tool result |
|---|---|
| delegate to a non-existent agent | `Error: Unknown agent 'ghost_agent'. Available agents: … [delegate state=rejected reason=unknown_agent retryable=no] hint: use an agent from the Available list` — the model stopped and reported instead of retrying |
| delegate to `leads_qualifier` | first line `[Agent 'leads_qualifier' (openrouter/deepseek/deepseek-v4.1-flash, agentic)] state=completed` — header intact, no per-call task id |

`GET /api/tools?agent=chief_of_staff` on the live daemon lists `expected_output` and the unchanged roster.

Still open from the §7 gate: (a) trace-level check that the framed summary and `output.data` look right in `runtime-trace*.jsonl`; (b) a week of `tool == delegate` records to read the `reason` distribution; (c) leftover rows of the test tenant in `cerveau.agents` / `cerveau.memories` (not cleaned — DB access was blocked). The failed-result guardrail was not exercised live; the failure text is deterministic (no ids), which is what it depends on.

**Known pre-existing issue found while testing:** `send_message_to_peer::tests::peer_turn_cost_scope_through_execute_boundary_attributes_recipient_and_shares_budget` overflows its stack in a debug `cargo test` on `HEAD` before this change too; unrelated, skipped in the full-suite run (3723 passed).

---

## 12. Phase A2 outcome (2026-09-19, `AVRY-Cerveau@b5fd5882d`)

Started earlier than the §8.4 plan (a week of A1 observation) at the owner's request; the `reason` data A1 emits keeps accumulating, so nothing is lost by the order.

**Shipped as designed:** six nullable columns + one partial index on `agent_tasks` and `archive.context_id`, added with `ADD COLUMN IF NOT EXISTS` in the existing `connect()` batch; background delegations create their row before spawn (or adopt `ledger_task_id`), settle it before the registry records the terminal state, and poll their own row every 5 s so the dashboard's raw-SQL Stop is observed; failed sync hops are recorded lazily; the reaper tick reconciles rows whose delegation ended without the engine writing them; the orphan sweep skips delegated rows; failure is `blocked` + `outcome`.

**Deliberate differences from §5 / §7 — each found in the code:**

| Design said | What shipped | Why |
|---|---|---|
| `parent_task_id` populated | column exists, **not populated** | the caller's own active row is not knowable from the delegate tool; `ledger_task_id` adoption covers the case where the caller has one. Grouping still works through `session_id` (`TASK-CONTRACT.md`). |
| `context_id` populated | column exists, not populated | P1 (carry-forward, turn cap). |
| cancel observation in P1 with heartbeat/stall | **cancel observation in A2, heartbeat/stall still P1** | the A2 gate ("Stop is observed") needs it; heartbeats change the reaper's timeout behaviour and stay separate. |
| reaper reconciles `Lost` | reconciler runs on the reaper's 60 s tick over `open_delegation_ids()`, not inside `recovery_pass` | ledger install order vs boot recovery is not guaranteed; a tick always runs after both exist. |
| a refused `ledger_task_id` | refuses the delegation (`rejected` / `invalid_request`) and starts nothing | starting work nobody can track is the failure mode this ADR exists to remove. |

**Facts worth remembering**
- `memory-postgres` is **not** a default feature of `zeroclaw-runtime`; the release build adds it. Code behind it is invisible to a plain `cargo test -p zeroclaw-runtime`. `delegate_ledger.rs` compiles to no-ops without it, and the e2e test needs `--features memory-postgres` plus `CERVEAU_TEST_PG_URL`. CI's `postgres-tests` job now runs it (`ledger_link_e2e`).
- Rollback is safe: every query in the previous binary names its columns (0 `SELECT *`), archive payload fields are `#[serde(default)]`, and no status enum changed. The only `SELECT *` in the dashboard targets the separate Team Space table.
- The dashboard needs no change: failed rows show in its `blocked` column with the reason and the existing Stop button.
- Another session changed `update_status` (`StatusUpdate`) concurrently; merged with a rebase, both suites pass together.

**Verified locally against Postgres 16:** `pg_task_ledger` (3 tests, including an upgrade that starts from the pre-A2 ten-column table and an archive payload without the new fields) and `ledger_link_e2e` (background failure, adoption + refusal, lazy sync record, no-tenant, operator Stop observed and not overwritten, reconciler). Runtime suite: 3725 passed without the feature, 3735 with it.

**Still open:** deploy (a startup `ALTER TABLE`, idempotent, nullable, metadata-only), then a live check that Stop on a running delegated row halts it. Reading `runtime-trace*.jsonl` and DB rows from the assistant's session is blocked by the auto-mode classifier, so live confirmation of the row itself needs the owner to look at Mission Control or run the query.

### 12.1 Live verification of A2 found a pre-existing bug (2026-09-19)

Deployed by the owner at 21:44 CST (`b5fd5882d`, 6 new columns confirmed in `cerveau.agent_tasks`, health 200, 0 restarts). Two real turns through `/webhook` with a synthetic tenant:

| Turn | Observation |
|---|---|
| Aira delegates to Lex with `background=true`, then `await_sessions` | The specialist's board (`task_list` as `leads_qualifier`, same tenant) shows `Delegated to leads_qualifier: Reply with exactly the single word PONG.` as `blocked` with `Delegation failed: Delegation depth limit reached (1/1)`. **A2 works** — the row exists under the specialist's `agent_type` and settles with a truthful reason — **but the delegation itself failed.** |
| `delegate(parallel=["leads_qualifier"])` vs a sync control in the same turn | parallel: `Error: One or more parallel agents failed`; sync: `state=completed`. |

**Root cause (upstream, June, #8217; not introduced by A1/A2):** the tool built to run a background or parallel hop was given `depth = self.depth + 1`, and the hop then ran its *own* `depth >= max_depth` check against a depth the caller never had. With `max_delegation_depth = 1` (ADR-008's cap) that is `1 >= 1`, so **every background and every parallel delegation was refused on arrival while sync worked.** The tool is never handed to the sub-agent (bounded targets get the parent's tools minus `delegate`; independent targets build their own registry; `with_depth` is unused outside tests), so the `+ 1` protected against no recursion and only rejected valid hops. ADR-008 Phase 2's "parallel fan-out verified live 2026-09-03" predates that change reaching this fork, or was checked with a higher cap; either way it has not held since.

**Fix (`9fe78f0ad`):** background and parallel run the hop on the caller's own depth, as sync always did. The caller-side check is unchanged (a caller at the cap is still refused up front). Regression tests pin: depth-0 hop admitted for background and parallel with a cap of 1; a caller at the cap still refused for both; sync as the reference. Mutation-checked: restoring `+ 1` fails exactly the two "not refused" tests.

**Why it stayed hidden:** before A1 a failed background delegation left no envelope and no board row, and parallel's aggregated text looked like an ordinary tool failure. The envelope's `reason` and A2's `blocked` row are what made it legible.

**Deployed and re-verified live (2026-09-19 23:54 CST, binary `cf30ae16…`, health 200, 0 restarts, backup `bak-pre-depthfix-20260919`), same shape of turns with a fresh synthetic tenant:** background delegation to Lex → `completed` (was: depth failure); `parallel=["leads_qualifier"]` → `[Parallel delegation: 1 agents]` with `PONG` (was: "One or more parallel agents failed"); the specialist's board shows the delegated row as `done` with no `blocked_reason` (settled through the engine's own `finish`, archived). The sync control call was `state=completed` throughout. Completed sync/parallel hops leave no row, as designed.

**Still open:** ~~deploy `9fe78f0ad` and re-run the same two turns expecting `completed`;~~ (done above) a live check that Stop halts a *running* delegation (the raw `cancelled` write cannot be issued from the assistant session, so the owner should press Stop in Mission Control on a long-running delegated task). Note: the start envelope's `ledger_task_id` is only in `output.data`; the model sees the legacy "Background task started… task_id:" text, so it cannot yet quote the board row id.

---

## 13. Ledger audit and the three fixes it produced (2026-09-19/20)

Asked by the owner: is the Cerveau task ledger in sync with Mission Control, is it stable, are there bugs or hard-coded values, and can agents read it correctly? Method: read both repos, experiments against a real Postgres, and live probes through `/webhook` with synthetic tenants. Reading production tables and traces from the assistant's session is blocked, so nothing below relies on production rows.

**Sync.** There is no sync layer to drift: the dashboard reads the same tables Cerveau writes (live table plus, since dashboard `2a9c164`, the archive), and its only write is Stop (`cancelled`). Divergence could only come from a dead ledger connection, from transitions that never reached the notification feed, or from the dashboard's DB role being unable to read the archive (unverified in production; the dashboard deploy script warns about it).

| # | Finding | Evidence | Fix (`AVRY-Cerveau`) |
|---|---|---|---|
| 1 | **HIGH.** The ledger, the capability graph and the skill-insight ledger each held ONE `postgres::Client` with no reconnect: after the connection dropped every op failed "connection closed" until the daemon restarted. `PostgresMemory` (r2d2 pool) was unaffected. | After `pg_terminate_backend`: list/update/create failed 5 of 5. | `ad1b9d3de`: `pg_live::LiveClient` reconnects; verifies a connection idle >1 s with `SELECT 1` because a synchronous client does not notice a dead socket while nothing uses it (a first version relying on `is_closed()` failed the test). |
| 2 | **MEDIUM.** Aira's identity says to verify children through `task_list` and to create child rows owned by the specialist. Both impossible: the tools are scoped to the caller's own `agent_type`; `task_list` had no session filter. | Live: Aira's `task_list` did not show Lex's row and she concluded the delegation created none. | `b594c8c5c`: `task_list scope=session` lists every agent's rows in the session with owners, finished work included. Identity docs and `TASK-CONTRACT.md` corrected. |
| 3 | **MEDIUM.** Only an agent's own `task_update_status` posted to `agent-actions`; the engine's settles, failed sync hops and the reconciler never did, so a failed delegation was visible only on the board. | Code: `should_notify` reachable only from the tool. | `8e031a8eb`: the same post, addressed by the row, fire-and-forget, blocked/done only; a re-settle or a cancel announces nothing. |

Also found, not fixed: SLA 15/60 minutes duplicated in three places (identity docs, `TASK-CONTRACT.md`, `lib/airaTasks.ts`); archive retention 40 days duplicated across two repos; `chief_of_staff` hard-coded as the parent in the dashboard; the 30-minute orphan sweep vs the 15-minute SLA; Stop on a parent does not reach its children; `task_create` has no dedupe or title cap; `task_list` shows only the 20 newest finished tasks per agent; a sync delegation that succeeds leaves no engine row, so its card exists only if the specialist creates one. Performance is fine (~174 us/op, 200 concurrent reads in 0.3-0.5 s on one connection).

Health check: `ops/cerveau-ledger-health.sql` (read-only, 13 checks, verified against deliberately corrupted data). Run on the VPS: `docker exec -i avry-postgres psql -U aivory -d aivory -f - < cerveau-ledger-health.sql`.

**Prompt drift to know about.** Two copies of the agent identity docs exist (`AVRY-Cerveau/aivory/` and `Aivory V2/services/cerveau/`) and they differ; `sync.sh` lives in the latter, which is the newer one and the one edited here. In git, `leads_qualifier/IDENTITY.md` stops at §6: its §7 (task ledger protocol) and §8 (mail send confirmation) exist only as uncommitted working-tree changes, so the corrected `Delegated to <you>` line for Lex is uncommitted too. Identity docs reach the live agents only through `./sync.sh deploy` (a daemon restart), which is a manual step.

**Deployed and live-verified (2026-09-20 01:56 CST, `AVRY-Cerveau@c172c8427`, binary `251e51ed…`, backup `bak-pre-ledgerfix-20260920`, health 200, doctor 87/22/0).** CI was fully green including the new Postgres steps. Probes through `/webhook` with a synthetic tenant: Lex created a row in session S1; Aira with `task_list` (default) saw only her own row, with `scope="session"` saw hers AND Lex's, each labelled with its owner; in session S2 the same call returned "No tracked tasks in this session."; a background delegation to Lex still completed. The journal since the restart had no panic, notify or ledger-connection warnings. Not observable from the assistant's session: the content of the `agent-actions` feed (fix 3 is covered by an end-to-end test against a mock backend) and the reconnect (needs a Postgres restart; covered by a test that kills the backend connection). The deploy script's own `task_list` schema check gave a false warning: task tools exist only on a tenant turn, so they never appear in `/api/tools` without one.
