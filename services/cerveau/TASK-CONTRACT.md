# Phase 3B Task Contract — Aira orchestration ledger

No schema migration. The zeroclaw task tools (`task_create`,
`task_update_status`, `task_list`) accept only title, status, priority, and
blocked reason, so the contract is convention on `cerveau.agent_tasks` plus
derivation in `GET /api/aira/tasks` (see `lib/airaTasks.ts`).

## Row roles

- Parent: the earliest `chief_of_staff` row in a room `session_id`.
  Aira titles it `AIRA-orch-<UTC HHMM>: <objective>`.
- Children: every other `agent_type` row in the same session. Specialists
  update only their own rows, never the parent.

## Who creates which row

`task_create` always creates a row owned by the CALLER's `agent_type`; no agent
can create a row for another. So:

- Aira creates the parent (her own row) and does not create children.
- A specialist creates, or adopts, its own child row (see its IDENTITY §7).
- A background delegation (`delegate` with `background=true`) is tracked by the
  delegation engine itself: it creates `Delegated to <agent>: <prompt>` under the
  specialist's `agent_type` (or, with `ledger_task_id`, links an existing row),
  settles it when the delegation ends, and honours the operator's Stop. A failed
  delegation ends as `blocked` with the reason; a sync delegation that fails is
  recorded the same way. A sync delegation that succeeds leaves no engine row.
- Every one of those transitions into `blocked`/`done` also reaches the
  operator's activity feed (avry-backend `agent-actions`).

## Reading the ledger

- `task_list` (default `scope="mine"`): only the caller's own rows.
- `task_list` with `scope="session"`: every agent's rows in the current
  conversation session, each labelled with its owner — how Aira checks whether
  the work she delegated is finished. Finished (`done`) work is included.
- The dashboard board and the room `<ledger>` hint read the live table plus the
  archive of finished work, so `done` rows appear there too.

## Status vocabulary

`todo` = planned, `in_progress` = running, `blocked` = waiting (blocked
reason names the approver or missing input — approval waits live here),
`done` = delivered and verified against the `Done when` criteria.

An approval wait means a real parked tool call (a pending-approval id from
the gate), named in the blocked reason. An agent holding work for the user's
go-ahead on its own (an unsent draft) asks in its reply and opens no row:
such a row has nothing that can resolve it and stays overdue forever (seen
2026-09-24 with Ofira's "Hold welcome email draft … pending operator
approval"). Every product agent's IDENTITY carries this as "Holding work for
approval". The board shows the real approvals under Waiting next to blocked
rows, and any open row can be stopped from its card.

## Timeout (derived, human-enforced)

- Child SLA: 15 minutes from creation.
- Parent SLA: 60 minutes from creation.
- The API flags `overdue: true` and reports `elapsed_ms`; nothing
  auto-cancels. Enforcement stays human-driven, consistent with the
  approval-gated delegation posture.

## Rollback

No schema to revert. To pause the contract, stop Aira creating parent rows
(identity edit + daemon restart); existing rows keep rendering as flat
kanban cards. Delete test rows with
`DELETE FROM cerveau.agent_tasks WHERE tenant_id = '<probe-tenant>'`.
