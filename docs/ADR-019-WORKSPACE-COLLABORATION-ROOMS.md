# ADR-019: Workspace becomes Rooms (team and agents collaborating on project requests)

**Status:** Accepted. P0 to P5 DEPLOYED and e2e-verified on prod 2026-09-26 (dashboard `5cc400d`); all merged to avry-user-dashboard main via PR #12 (`d119b17`, adds the Tasks Title column fix + CI lint fixes). P0 R2 files; P1 teams, project requests, Inbox; P2 Console-style room; P3 room context in every agent turn (brief, tasks, notes, file excerpts, BM25, PDF via unpdf); P4 proactive agents (room.opened kickoff, file.added summary, autonomy observe/suggest/act, 20 unprompted turns/day, runs as owner via a 2-min minted access token); P5 legacy workspace UI removed, 11 legacy docs moved to Trash, room tabs Chat/Tasks/Notes, roadmap to request draft. **P6 project timeline BUILT 2026-09-26** (branch feat/project-timeline, not deployed): see section 4.5.
**Date:** 2026-09-26
**Scope:** `frontend/avry-user-dashboard` (`app/workspace/**`, `app/api/workspace/**`, `components/workspace/**`, `lib/space*.ts`, `lib/workspace*.ts`), plus one backend route on `avry-backend`.
**Related:** [ADR-008](ADR-008-CERVEAU-MULTI-AGENT-COLLABORATION.md) (per-agent-type identity), [ADR-009](ADR-009-CERVEAU-SCHEDULED-RUNS.md) (scheduler, sync still missing), [ADR-014](ADR-014-CERVEAU-DELEGATION-ENVELOPE-AND-LEDGER-LINK.md) (approvals ledger), `avry-user-dashboard/docs/WORKSPACE-*.md`.

---

## 1. Decision in one paragraph

Workspace stops being a Notion clone with a chat tab bolted on. The primary unit becomes a **Room**: one project with its people, its agents, one shared feed, and its material (brief, files, data tables) in a side panel. Rooms are born from a **Project Request**: an admin or member fills in a structured form (goal, deadline, priority, people, agents, data table, uploaded documents), an admin approves it, and the approved request becomes the room. Agents in a room may **act on their own** (kick off a plan when the room opens, summarise a newly uploaded file, chase a stalled task, post a daily digest), bounded by a per-room autonomy level and budget, with risky tools still behind the existing approval gate. The Console stays a separate 1-on-1 surface. Files are stored in **Cloudflare R2**.

## 2. What exists today (verified 2026-09-26)

| Fact | Where |
|---|---|
| `/workspace` redirects to the newest `isProject` doc with `?view=discussion`, otherwise it shows a pages list. | `app/workspace/page.tsx` |
| A doc has 5 tabs: Discussion (projects only), Write (Yjs/BlockSuite), Data (table/kanban), Board, Pages. The doc is the primary unit and Discussion is a view of it. | `app/workspace/[id]/page.tsx` |
| Discussion is a Slack-style stream plus a thread panel (1851 lines). Messages, threads, topics and agent tasks are Postgres tables keyed by `space_id` = doc id. | `components/workspace/SpaceDiscussion.tsx`, `migrations/workspace-space-threads.sql`, `migrations/workspace-space-agent-tasks.sql` |
| Agents act only when `@`-mentioned. A mention enqueues a `workspace_agent_tasks` row and auto-runs it fire-and-forget. | `app/api/workspace/[id]/messages/route.ts` |
| The agent sees only the current thread's history plus the instruction. It never sees doc content, data tables, other threads or files. | `lib/spaceAgent.ts:81` `buildSpacePayload` |
| **Agent runs require a user JWT.** `runAgentTask` takes `credential.kind === "user"` and forwards the bearer to `POST /api/v1/telegram/discussion-turn`. There's no service path, so an agent can't run without a human action. | `lib/spaceAgentRun.ts:68,117` |
| File uploads don't exist. MinIO/S3 cover uploads were removed, and the cover route returns 410. | `app/api/workspace/[id]/cover/route.ts` |
| pgvector chunk store exists (`workspace_chunks`, unconstrained `vector`, exact cosine), populated for task rows via `lib/workspaceIndex.ts` + `lib/embeddings`. | `migrations/workspace-chunks.sql` |
| Roles: `workspace_members.role IN (owner, editor, viewer)`, per-doc ACL `(editor, viewer)`. There's no separate "admin" role. | `migrations/workspace-authz.sql:37,51` |
| Parsers already in deps: `pdfjs-dist`, `mammoth` (docx). No xlsx parser, no S3 SDK. | `package.json` |
| Cerveau has a capable cron (ADR-009), but the store-to-cron sync was never built, so nothing runs. n8n on the VPS is live and already used for cron-style jobs. | ADR-009 status line |

## 3. Why the current Discussion fails

1. **Wrong primary unit.** Collaboration is a tab inside a document. The user wants the collaboration to be the place, with documents as its material.
2. **Agents are summoned bots.** No mention means no work. One mention produces one reply. There's no plan, progress or deliverable that belongs to the agent.
3. **Agents are blind** to everything outside one thread (§2 row 5).
4. **Agent output is scattered** across the chat, the thread-panel task cards, Console/Mission Control approvals, and the Activity tab.
5. **Five tabs for one doc.** Write/Data/Board/Pages compete with the discussion instead of feeding it.

## 4. Target model

```
Project Request ──(admin approves)──▶ Room
  title, goal, deadline, priority        feed (humans + agents, threads kept)
  people, agents                         side panel: Brief · Agents · Files and data · Approvals
  data table(s), uploaded files          autonomy level + budget
```

### 4.1 Project Request

- New table `dashboard.project_requests`: `id, workspace_id, title, goal, deadline, priority, requested_by, status (draft|submitted|changes_requested|approved|rejected), reviewer, review_note, room_id, members jsonb, agents text[], created_at, updated_at`.
- Attachments are rows in `dashboard.workspace_files` (§4.4) with `request_id` set. Data tables reuse `WorkspaceDatabase` as a child doc linked by id. No new table editor.
- **Inbox**: owners see submitted requests and can approve, request changes or reject. Approving creates the room (a `workspace_docs` row flagged `isRoom`), moves the files and tables to `room_id`, grants ACL to listed members, and emits the `room.opened` event (§4.3).
- Default permissions (to confirm, §8): `owner` approves. `editor` submits. `viewer` reads. An `owner` may create a room directly and skip the request.

### 4.2 Room

- Route `/workspace/rooms/[id]`. `/workspace` lands on the rooms list plus the Inbox.
- **Feed** (revised 2026-09-26, user decision): built from the **Console's own components** (`ChatMessage`, `ChatInput`, mention menu), not a refactor of `SpaceDiscussion`. One flat chronological feed (`GET .../timeline`), replies quote the exact message answered (`reply_to` column; threads stay flat). The Console page itself is unchanged and stays a separate 1-on-1 surface. `space_id` = room id, so existing messages carry over.
- **Typed agent messages**: add `kind` to `workspace_messages` (`text` default, `plan`, `progress`, `needs_input`, `approval`, `deliverable`) plus a `payload jsonb`. Each non-text kind renders as a card with actions (Accept plan, Answer, Approve/Deny, Open file). Old rows are `text`.
- **Side panel**: Brief (from the request, editable by owner), Agents (status derived from open `workspace_agent_tasks`: working / waiting / idle), Files and data, pending Approvals (reuse `SpaceAgentPanel` approval cards).
- The Write/Data/Board/Pages tabs are removed from rooms. Docs and tables open as artefacts from the side panel (existing editors, full-screen or peek).

### 4.3 Proactive agents

**Triggers**

| Event | Source | Agent action |
|---|---|---|
| `room.opened` | request approval | read brief + files + data, post a `plan` |
| `file.ingested` | upload pipeline | post a summary, flag issues |
| `task.stale` | time (n hours no movement) | `needs_input` follow-up to the assignee |
| `room.digest` | time (daily, room timezone) | `progress` digest |

- Event triggers fire inline, fire-and-forget, like today's auto-run.
- Time triggers: an n8n cron calls `POST /api/workspace/internal/tick` with the service secret. That route scans rooms and enqueues tasks. This doesn't depend on the unfinished ADR-009 sync. Moving it to the Cerveau cron later is a swap of the caller, not the logic.

**Service run path (the one real blocker).** `runAgentTask` must accept a service credential that acts **on behalf of the room owner**. The dashboard can't mint a user JWT. So `avry-backend` gets a sibling of `discussion-turn` that authenticates with the internal service secret and takes `on_behalf_of_user_id` + `space_id`. The backend resolves the tenant from the user and refuses unless that user is still the room owner. Every proactive run is logged with `actor = agent:<type>`, `trigger = <event>`.

**Guardrails**
- `rooms.autonomy`: `observe` (agents read, never post unprompted), `suggest` (default: proactive posts only, no tool writes without a human click), `act` (proactive tool use, risky tiers still gated by the existing approval flow).
- Per-room budget: max proactive runs per day (default 20) and a cooldown per trigger per agent. Exceeding either posts nothing and records `budget.exceeded` in activity.
- Proactive posts never `@`-mention other agents. Only humans trigger agent-to-agent chains, so loops can't happen.

**Context**: `buildSpacePayload` grows `<room_brief>`, `<room_files>` (top-k chunks by cosine against the instruction) and `<room_data>` (compact table summary, row cap). These are capped by a token budget so the context stays small (see Cerveau context-budget lessons).

### 4.4 Files on Cloudflare R2

- One bucket `aivory-workspace`. Keys are `ws/<workspace_id>/room/<room_id|request_id>/<file_id>/<sanitised name>`.
- Table `dashboard.workspace_files`: `id, workspace_id, room_id, request_id, key, name, mime, size, sha256, uploaded_by, status (pending|ready|ingested|failed), created_at, deleted_at`.
- Upload: `POST /api/workspace/files` checks ACL, the mime allowlist (pdf, docx, xlsx, csv, txt, md, png, jpg) and the size cap (25 MB). It returns a presigned PUT (5 min). The browser uploads directly to R2, then calls `.../complete`. The server HEADs the object and verifies size before marking it `ready`.
- Download: presigned GET (60 s), issued only after the ACL check. The bucket is never public.
- Ingest: on `ready`, extract text (`pdfjs-dist`, `mammoth`, plus a new xlsx/csv parser), chunk it, and write to `workspace_chunks` with `row_id = file:<id>:<n>`. Then emit `file.ingested`.
- Deps: `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (R2 is S3-compatible). Env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`. The token is scoped to that one bucket, Object Read and Write only.
- CORS on the bucket: PUT/GET from `https://aivory.uk` (and `http://localhost:9000` for dev).

### 4.5 Project timeline (P6)

A calendar of the work, in two places: Workspace > Timeline across every room the viewer reaches, and a Timeline tab in each room.

- **Timeline view (default):** a Gantt with one row per task, weeks across. Cross-room adds a header row per room (deadline marker, count of undated tasks, collapsible), a Notes row and an Agent jobs row per room, and a "Waiting for approval" group of project requests that have a deadline (bar from submission to deadline, dashed).
- **Month view:** Monday-first grid, lane-packed bars, "+n more" past four lanes.
- **Sources:** task `start`/`due` read from each room's stored Y.Doc (one query for all rooms); brief deadline; `room_notes.on_date`; `workspace_agent_tasks` counted per day in the viewer's time zone (validated IANA name); `project_requests` in draft/submitted/changes_requested that the viewer requested or, when submitted, owns the team of.
- **Rescheduling:** editors drag a bar (middle to move, edges to change start or due). It writes through the task board's existing PATCH route, optimistically, and rolls back on failure. A due-only task stays due-only when moved; a resize writes both ends. Read-only rooms can't drag.
- **Notes for someone:** a note can carry a date and an addressee (a person in the room, or one of its agents). The server checks the addressee belongs to the room on every write. Agents get notes meant for them first in `<room_notes>`, labelled "for you" plus the date.
- **Limits:** window at most 120 days; 60 rooms; 500 dated notes; 100 requests.

Migration: `migrations/room-notes-calendar.sql` (additive columns on `room_notes`).

Not in P6: reminders or notifications when a dated note comes due, and drag in the Month view.

## 5. Phases

| Phase | Deliverable | Exit gate |
|---|---|---|
| **P0 Storage** | R2 bucket + token, `workspace_files`, presign/complete/download routes, ACL tests | upload then download a 20 MB PDF on prod; a non-member gets 403 on presign and download |
| **P1 Request + Inbox** | `project_requests`, form UI (fields, members, agents, data table, files), Inbox approve/changes/reject, approval creates a room | request to approved room end to end; files and table visible in the room |
| **P2 Room shell** | rooms list, `/workspace/rooms/[id]`, refactored feed, side panel, `kind` on messages, tabs removed | existing `SpaceDiscussion` tests green; old project URLs redirect to rooms |
| **P3 Agent context** | file ingest to chunks, brief/files/data in the payload, typed agent cards | an agent answers a question that's only in an uploaded PDF |
| **P4 Proactive** | backend service run path, event triggers, n8n tick, autonomy + budget | `room.opened` produces a plan with no human message; budget cap holds; `observe` room stays silent |
| **P5 Migration + cleanup** | migrate `isProject` docs to rooms, non-project pages become files/docs artefacts, remove dead views | no orphaned messages; `/workspace?view=pages` still reaches legacy pages until removed |
| **P6 Timeline** | cross-room + per-room Gantt/Month, drag to reschedule, dated addressed notes in agent context | dragging a bar changes the task in the Tasks tab; a note for an agent appears first in its next turn |

P0 and P1 can run in parallel with P2. P4 depends on P3 (a proactive agent without context is just noise).

## 6. Consequences

- The biggest UX change for existing users is that tabs disappear. P5's redirect keeps old links working.
- One new external dependency (R2) and one new backend route. The route is security-sensitive because it's a service credential acting for a user, so it gets its own review.
- Proactive agents cost LLM tokens without a human in the loop. The per-room budget is the cost control. A cheap model for digests and summaries is acceptable.

## 7. Rejected alternatives

- **Merge the Console into rooms.** Rejected by the user: the Console stays 1-on-1.
- **Store files in Postgres `bytea`.** Bloats backups and the main DB. R2 is cheap and has no egress fees.
- **Rewrite the discussion from scratch.** The data layer (threads, mentions, tasks, approvals, presence, ACL, hash-chained events) is sound. Only the surface and the interaction model are wrong.
- **Wait for the ADR-009 cron sync.** It blocks P4 on unrelated work. The n8n tick is replaceable.

## 8. Open questions

1. ~~Who approves?~~ **Decided 2026-09-26: team workspaces.** Prod had no team concept (49 users in one `default` workspace, `workspace_members` empty). Each team is its own `dashboard.workspaces` row; its creator is the admin who approves; editors submit; viewers read. `default` refuses members.
2. Migrate existing projects into rooms (assumed, P5) or start clean?
3. Cloudflare account access: the bucket and scoped token have to be created by the user (the Cloudflare MCP isn't authorised in this environment).
