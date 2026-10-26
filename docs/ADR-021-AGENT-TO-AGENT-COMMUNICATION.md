# ADR-021 — Agent-to-agent communication: agents talk to each other like people in a room

**Status:** Accepted 2026-10-24, building. Supersedes the one-way `@Name` handoff of ADR-020 §handoff (kept as a fallback).
**Related:** ADR-019 (Team Space rooms), ADR-020 (active agents, `@Name` handoff), ADR-014 (delegation envelope / ledger link).

## 1. Problem

Today an agent can only *hand off*: a reply that writes `@Lex` enqueues a turn for Lex (`lib/agentHandoff.ts`,
`lib/spaceAgentRun.ts::spawnHandoffs`). It is one-way and fire-and-forget:

- the agent that asked never hears the answer, so it cannot continue its own work with it;
- there is no tracked assignment ("Lex, please draft the quote by Friday") and no report back when it is done;
- nobody can be reminded later ("ping me tomorrow at 9 if the invoice is still unpaid");
- the only signal is prose: the model has to happen to write `@Name`, and a name mentioned in passing is ambiguous.

`delegate` (engine) is the other path, but it is invisible: a sub-turn inside one agent's turn, not a conversation in
the room the user watches.

## 2. Decision

Agents get explicit **team communication tools**. Each call is a *speech act* recorded during the turn and carried
out by the room after the turn, so every exchange is a real message in the Team Space thread, from that agent, that
the human can read and interrupt.

| Tool | Speech act | What the room does after the turn |
|---|---|---|
| `team_message(to, text)` | inform / FYI | Posts the message mentioning `to`. No turn is started. |
| `team_ask(to, question)` | question that needs an answer | Posts it, starts a turn for `to`. **When `to` answers, the asker gets a follow-up turn with the answer** and continues. |
| `team_delegate(to, task, due?)` | assignment | Posts it, creates a tracked task on the board (owner `to`, from the delegator, optional due date), starts `to`'s turn. When the task is done the delegator is told (follow-up turn) and the human sees the report. |
| `team_handoff(to, text)` | transfer of the thread | Posts it and starts `to`'s turn; the sender is done. Same as today's `@Name`. |
| `team_remind(who, when, text)` | reminder | Stores a reminder (`who` = self or a teammate, `when` = ISO time or `in 2h` / `in 3d`). When due, the room posts "⏰ Reminder for @who: …" and starts their turn. |

`to` / `who` is an agent type (`leads_qualifier`) or display name (`Lex`); only teammates in the room are valid,
never yourself, never `@all`. Plain `@Name` in a reply keeps working as `team_handoff` (backwards compatible).

### 2.1 Where each piece lives

```
dashboard room ──turn──▶ backend /discussion-turn ──▶ vps-bridge ──▶ Cerveau /webhook
     ▲                                                                    │
     └──────────── reply + pending_approval + team_actions ◀──────────────┘
```

- **Cerveau (engine).** Five tools in `zeroclaw-runtime/src/tools/team_comms.rs`, registered only on tenant turns
  (same gate as the task-ledger tools). A tool validates its arguments and records a `TeamAction` into a turn-scoped
  cell (`agent::tenant::TEAM_ACTIONS`, same pattern as `LAST_PENDING_APPROVAL`); it has no side effects of its own,
  so it is `Safe` tier and never parks. The webhook response gains `team_actions: [...]` next to `pending_approval`.
- **vps-bridge, backend.** Pass `team_actions` through unchanged (one field each, like `pending_approval`).
- **Dashboard (room).** `lib/teamComms.ts` (pure: validate + plan, client-safe like `agentHandoff.ts`) and
  `spaceAgentRun.ts` execute the actions: post messages, enqueue tasks, schedule reminders, route answers back.
  `lib/teamReminders.ts` fires due reminders. Migration `workspace-agent-comms.sql` adds the columns/tables below.
- **Config.** The tools are `Safe` tier in code, but the product risk profiles use `allowed_tools`, so the five
  names are added to `allowed_tools` and `auto_approve` of the six `agent_*` profiles on the Cerveau host.

### 2.2 Data

```sql
-- workspace_agent_tasks: what kind of turn this is, and who is waiting on it
kind        TEXT NOT NULL DEFAULT 'mention'  -- mention | ask | answer | delegate | report | handoff | reminder
from_agent  TEXT                              -- the agent that asked / delegated (NULL = a human)
reply_to    TEXT                              -- task id of the asker's turn that is waiting for this one
due_at      TIMESTAMPTZ                       -- delegate only

workspace_agent_reminders(id, space_id, thread_root, target_agent, from_agent, text, fire_at, fired_at, created_at)
```

### 2.3 Safety (bounded like ADR-020)

- A chain (everything that follows one human message) has a budget: depth ≤ 4, ≤ 12 turns, ≤ 3 turns per agent.
  Ask/answer round-trips count. Over budget, actions are dropped and the room says so in the agent's message
  (`(…not sent: this conversation reached its limit)`), never silently.
- An agent can have one open turn per thread; a second ask to a busy teammate is queued as a message, not a turn.
- At most 3 team actions per turn, 2 reminders per agent per day per space, reminders ≥ 1 minute and ≤ 30 days out.
- Every turn runs under the same user credential as the chain's first turn: tenant, credits and approval gates
  behave exactly as for a human `@mention` (ADR-020 §1.1).
- A teammate's answer is quoted to the asker as data (`[Answer from Lex] …`), not as instructions.

## 3. Not doing (yet)

- Direct agent-to-agent DMs outside a room. Every exchange is visible in a thread on purpose.
- Engine-side delivery (`send_message_to_peer` from upstream v0.8.6). It runs a hidden peer turn; the room path is
  what the user can see and stop. Revisit for Telegram/Slack-only tenants.
- A reminder scheduler that fires with nobody in the room. Every agent turn runs under a member's own JWT
  (tenant, credits, approvals), and a timer has none, so v1 fires due reminders from the room poll
  (`GET .../timeline`) of a member who can write, claiming each atomically. Firing with the room closed needs a
  backend service-token path for discussion turns first.

## 4. Addendum 2026-10-26 — follow-up #5: reminders with the room closed, waits, quiet and failed runs

**Status:** Accepted 2026-10-26, building. Follows the openbot study of 2026-10-26 (ideas only; openbot is PolyForm
Noncommercial, so no code was copied). Follow-ups #1–#2 of that study shipped as avry-user-dashboard#72 (queued
team turns, gathered answers, failure notices) and AVRY-Cerveau#39 (bounded tool-schema activation).

### 4.1 Reminders fire with nobody in the room

§3 named the blocker: every agent turn runs under a member's JWT, and a timer has none. The fix is a **delegated
credential** that the backend mints for the member whose turn created the reminder.

- `workspace_agent_reminders` gains `credential_owner` (the `user_id` of the credential the creating turn ran under),
  `missed_policy` (`run_once` default | `skip`), `fire_outcome` (`on_time` | `late` | `skipped`) and `wait_id` (§4.2).
- **Sweeper (avry-backend).** `app/services/room_reminder_sweeper.py` runs every 60 s from the lifespan, under a
  Postgres advisory lock so only one worker sweeps. It selects `(space_id, credential_owner)` pairs with a due,
  unfired reminder, loads the owner (skipped when the account is gone or has no paid tier), mints a **15-minute
  access token** for them (`type: access`, `via: room-reminder`), and calls the dashboard's
  `POST /api/workspace/{space}/reminders/fire` with it.
- **Dashboard.** That route verifies the token like any request (JWT + write role on the room, so a member who lost
  access cannot be impersonated into it) and runs the same `fireDueReminders` the room poll runs, restricted to that
  owner's reminders. The turn then calls the existing `/api/v1/telegram/discussion-turn` with the minted token, so
  tenant (acting-as-leader), credits and approvals are exactly those of the member who set the reminder up.
- Why the dashboard and not the backend runs the turn: posting the reply, planning team actions, routing answers and
  draining queues all live in `lib/spaceAgentRun.ts`. A second implementation in Python would drift. The backend
  only owns the signing key, which is the one thing the dashboard cannot do on its own.
- **Room poll stays** as the fallback (sweeper down, `DASHBOARD_INTERNAL_URL` unset, rows from before the
  migration with no `credential_owner`). Claims are atomic (`FOR UPDATE SKIP LOCKED`), so the two paths fire a
  reminder once.
- **Missed policy.** A reminder is *late* when it is claimed more than 10 minutes after `fire_at` (the sweeper was
  down, or nobody had the room open). `run_once` fires it once and says so in the turn ("this reminder was due at …");
  `skip` marks it `skipped` and posts nothing. `team_remind` takes an optional `if_missed: run_once | skip`.
- **Token lifetime.** 15 minutes covers the fired turn and the chain it starts (ask → answer, delegate → report) in
  the common case. A chain still running after that fails its next turn with 401 like an expired browser session,
  and that failure is reported to the waiting agent (#72). The minted token is never stored or logged.

### 4.2 `team_wait` / `team_wait_close`

An agent that is blocked ("waiting for the build", "until Lex finishes the quote") needs the request to survive the
end of its turn and any compaction.

| Tool | Records | What the room does |
|---|---|---|
| `team_wait(note, until?)` | `TeamAction{kind: wait, text: note, when: until}` | Stores a row in `workspace_agent_waits` with the **request text of the turn** (copied by the room, not written by the model) and the note. With `until`, also schedules a wake reminder (`wait_id` set). |
| `team_wait_close(wait_id?, note?)` | `TeamAction{kind: wait_close}` | Closes that wait, or all of the agent's open waits in the thread. |

```sql
workspace_agent_waits(id, space_id, thread_root, agent_type, task_id, request_text, note,
                      credential_owner, status open|closed|expired, wake_count, last_woken_at,
                      created_at, closed_at, expires_at DEFAULT now() + 14 days)
```

A wait **wakes** when (a) its `until` reminder fires, (b) a delegate or ask the agent made in that thread finishes
(the answer/report turn carries the open waits), or (c) `POST /api/workspace/{space}/waits/{id}/wake` is called by a
member with write access or with the service token (webhooks). (c) schedules a due wake reminder, so the sweeper or
the room poll starts the turn with a real member credential. The woken turn's instruction repeats the original
request and the note, gives the `wait_id`, and tells the agent to call `team_wait_close` when it is done. Waking does
not close; an open wait expires after 14 days. At most 3 open waits per agent per thread.

### 4.3 Quiet and failed unattended runs

Unattended turns (Geno's cron runs, fired reminders, woken waits) currently always produce a message, even "nothing
new", and a run that could not do its job still counts as a success.

- **Cerveau.** Two tools, `run_no_update()` and `run_report_failure(reason)`, record a `RunOutcome` into a new
  task-local `RUN_OUTCOME` (same pattern as `TEAM_ACTIONS`). They are offered only when the cell is scoped:
  - in `cron::scheduler::run_agent_job` (every cron agent run), and
  - in the gateway webhook when the caller marks the turn unattended with `X-Turn-Origin: cron | reminder | wake`.
  A human chat turn never sees them. Delegated sub-turns get no cell.
- **Cron path.** `quiet` turns the output into the existing `NO_REPLY:` sentinel, so delivery is `skipped` and the
  run is `ok` on `cron_runs`. `failed` makes the run's execution `error` with `run reported failure: <reason>`, so
  `cron_runs.status = error` (the ledger) and the reason is still delivered: a failure is something the operator
  must see.
- **Webhook path.** The response gains `run_outcome: null | "quiet" | "failed"` and `run_failure_reason` next to
  `team_actions`; vps-bridge and the backend relay them, and forward `turn_origin` the other way. The dashboard
  sends `turn_origin` for reminder and wake tasks. On `quiet` it posts no reply and marks the task `done`
  (`reason: quiet run`); team actions still run. On `failed` it posts the reason as the agent's message, marks the
  task `failed` with it, and the waiting agent is told (#72's failure notice).

### 4.4 Config and rollout

- Migration `migrations/workspace-agent-followup5.sql` (dashboard) before the dashboard deploy; the code tolerates
  the old schema (room poll keeps working, waits are dropped with a note).
- Backend env: `DASHBOARD_INTERNAL_URL` (e.g. `http://avry-user-dashboard:9001/dashboard`) and
  `ROOM_REMINDER_SWEEPER_ENABLED=true`. Unset means no sweeper: the room poll fires as before.
- Cerveau prod config: add `team_wait`, `team_wait_close`, `run_no_update`, `run_report_failure` to
  `allowed_tools` and `auto_approve` of the six `agent_*` risk profiles (they are `Safe` in code).
- Deploy order: dashboard migration → Cerveau → vps-bridge → backend → dashboard. Each piece ignores fields it does
  not know, so a partial deploy degrades to today's behaviour.
