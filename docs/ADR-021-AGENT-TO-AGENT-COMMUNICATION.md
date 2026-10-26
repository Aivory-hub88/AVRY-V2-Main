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
