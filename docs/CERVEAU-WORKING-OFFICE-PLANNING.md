# Aivory Cerveau — Console → Working Office

**Date:** August 30, 2026 (updated September 1, 2026)
**Status:** All eleven phases shipped, verified, and **deployed to production.** Phases 0–8 built the three-column working office: agent-nested threads, a fixed-ratio collapsible grid (never an overlay), deduped approvals, attributed thinking, thread delete, and a from-reference approval design system — originally on a single shared mascot for agent identity, later superseded (Phase 9) by a distinct portrait per agent. Phases 9–10 then redirected the office toward a **Mission Control** overview and a unified **Notification Center**, per the course correction below. Phase 11 closed a long-standing gap (a minimum-width guard) and finished a global-CSS bug sweep that Phase 10 had only half-fixed. Current head: `Aivory-hub88/avry-user-dashboard main` (`bbae163`), live on the VPS (`avry-user-dashboard` container, port 9001, verified 200 on `/dashboard/console` post-deploy).
**Course correction (September 1, 2026):** the Phase 0–8 office was a well-built *per-thread* console, not the cross-agent overview it needed to be, and its rail only understood one kind of event (approvals). Phases 9–10, below, redirect toward a **Mission Control** overview and a generalized **Notification Center** — both built client-only, no new backend, in keeping with Cerveau's Rust-spirit "ringan" (lightweight) philosophy. Phases 0–8 stay as shipped; nothing in this correction reverts them.
**Scope:** `frontend/avry-user-dashboard` — turning `/console` into a three-column "working office" and retiring `/approvals` as a standalone page

---

## Table of Contents

- [Goal](#goal)
- [Course correction — September 1, 2026](#course-correction--september-1-2026)
- [Why not build this on /approvals](#why-not-build-this-on-approvals)
- [Design decisions](#design-decisions)
  - [1. Three columns, agent-nested threads](#1-three-columns-agent-nested-threads)
  - [2. Both side panels are collapsible, at a fixed screen ratio, never an overlay](#2-both-side-panels-are-collapsible-at-a-fixed-screen-ratio-never-an-overlay)
  - [3. Approvals split by source, never duplicated](#3-approvals-split-by-source-never-duplicated)
  - [4. Thinking is attributed to the agent, not to "Aivory"](#4-thinking-is-attributed-to-the-agent-not-to-aivory)
  - [5. Real brand icons everywhere a source or tool is named](#5-real-brand-icons-everywhere-a-source-or-tool-is-named)
  - [6. Mission Control is a view, not a new service](#6-mission-control-is-a-view-not-a-new-service)
  - [7. The rail becomes a Notification Center, approvals become one entry type](#7-the-rail-becomes-a-notification-center-approvals-become-one-entry-type)
- [Mockups](#mockups)
- [Two problems found while reading the current code](#two-problems-found-while-reading-the-current-code)
  - [The sidebar's conversation list is dead code](#the-sidebars-conversation-list-is-dead-code)
  - [A thread does not remember which agent it belongs to](#a-thread-does-not-remember-which-agent-it-belongs-to)
- [Implementation plan](#implementation-plan)
  - [Phase 0 — data-model fixes (blocking)](#phase-0--data-model-fixes-blocking)
  - [Phase 1 — data model](#phase-1--data-model)
  - [Phase 2 — the shell](#phase-2--the-shell)
  - [Phase 3 — approvals, split by where they came from](#phase-3--approvals-split-by-where-they-came-from)
  - [Phase 4 — rail behaviour](#phase-4--rail-behaviour)
  - [Phase 5 — thinking, attributed](#phase-5--thinking-attributed)
  - [Phase 6 — thread delete, and the office stops being liked](#phase-6--thread-delete-and-the-office-stops-being-liked)
  - [Phase 7 — a real agent identity, everywhere](#phase-7--a-real-agent-identity-everywhere)
  - [Phase 8 — fixed-ratio layout and an approval design system](#phase-8--fixed-ratio-layout-and-an-approval-design-system)
  - [Phase 9 — Mission Control](#phase-9--mission-control--done-2026-09-01)
  - [Phase 10 — Notification Center](#phase-10--notification-center--done-2026-09-01)
  - [Phase 11 — minimum-width guard, and finishing the global CSS sweep](#phase-11--minimum-width-guard-and-finishing-the-global-css-sweep--done-2026-09-02)
  - [Phase 12 — White-Box Memory](#phase-12--white-box-memory--done-2026-09-02)
- [Risks](#risks)
- [Deliberately not in scope](#deliberately-not-in-scope)

---

## Goal

Console becomes the room Aivory's agents work in, instead of a single chat window with a separate `/approvals` page bolted on the side. One screen shows:

- **Left** — every agent the user has, each expanding to its own threads.
- **Middle** — the conversation with whichever agent/thread is selected. This is the existing Console, unchanged.
- **Right** — what that agent is waiting on, what it's running right now, and which tools it has connected.

Approvals stop being a page you visit and become a state you can see, without ever squeezing the conversation you're reading.

## Course correction — September 1, 2026

Phases 0–8 shipped a well-structured *per-thread* console: pick an agent, see its thread, see what that one agent is waiting on. Using it live surfaced two problems, both pointing the same direction:

1. **No cross-agent overview.** `OfficeShell`'s middle column is always the open thread ([OfficeShell.tsx](../frontend/avry-user-dashboard/components/office/OfficeShell.tsx):27–60 — `children` is rendered unconditionally, there's no "nothing selected" state). There's no screen that answers "which of my agents are idle, which are running, which need me" without clicking into each one. [LobeHub](https://github.com/lobehub/lobehub) frames its whole product around this: it calls itself a "Chief Agent Operator" that organizes an agent *team* into 7×24 operations, rather than a nicer chat window per agent. That's the gap — the office has the agents, it doesn't have the operator's view of them.
2. **The rail only speaks "approval."** [AgentRail.tsx](../frontend/avry-user-dashboard/components/office/AgentRail.tsx) has exactly one live, actionable section (`Waiting on you`) and two that are permanently empty or static (`Running now` has no backend data source at all; `Connected channels` shows current state, not events). A finished task, a new lead an agent just captured, a channel that dropped — none of that has anywhere to surface. macOS's Notification Center is the right shape for this: one feed, grouped by source, where actionable items (needs a decision) and informational ones (just happened) sit together instead of approvals being the only citizen.

**Constraint that shapes both fixes: stay Rust-spirit — ringan, agile, no new heavy machinery.** Cerveau itself is a Rust fork chosen specifically for its footprint (6.6MB RAM in production — see [deployable-agent-runtime-research] memory); this project has already been burned once by wiring capacity work ahead of need ([aivory-capacity-optimizations] memory: Redis wired but left uncoded). Mission Control and the Notification Center below are built to the same discipline: **zero new backend endpoints, no websocket, no new poll loop.** Both are assembled entirely client-side from data the office already fetches — `useAgentApprovals`, `useAgentDeployments`, `sessionsByAgent`. A durable, cross-device event log is a legitimate future need, but it's a deliberate v2 with its own planning pass, not something to build speculatively now — see [Deliberately not in scope](#deliberately-not-in-scope).

## Why not build this on /approvals

`/approvals` today ([app/approvals/page.tsx](../frontend/avry-user-dashboard/app/approvals/page.tsx)) is 163 lines: `listPendingApprovals()` + `resolveApproval()`. No chat, no agent context, no history. `/console` ([app/console/page.tsx](../frontend/avry-user-dashboard/app/console/page.tsx)) is 665 lines and already has the chat engine, streaming, and an inline approval card in `ChatMessage.tsx`. Building the office on `/approvals` would mean duplicating the entire chat stack. The correct direction is the reverse: Console is promoted to the working office, and Approvals becomes one panel inside it.

## Design decisions

### 1. Three columns, agent-nested threads

Agents own their threads, rather than a flat "recent conversations" list. This mirrors how Cerveau already scopes memory — one agent, one memory space (`t_<tenant>.<agent_type>`), one column of history — so the UI structure matches the data structure instead of fighting it.

### 2. Both side panels are collapsible, at a fixed screen *ratio*, never an overlay

**Superseded twice — current answer as of 2026-09-01.** This went through three designs; the final one is a CSS Grid where the agent column and rail each hold a fixed *proportion* of the screen when open (`minmax(220px, 18%)` and `minmax(280px, 20%)`) and a fixed 56px track when collapsed, with the chat column always `1fr`. Collapsing a panel shrinks its grid track and the chat column absorbs the freed space automatically — a push, structurally, never an overlay. Same three-pane behaviour as Grok Bot's layout (see Phase 8).

The two earlier designs, for the record:
1. **Original (Phase 4):** rail pushed the chat above ~1500px total width and floated over it with a backdrop blur below that, so the reading column never lost width. Worked, but only because the rail could be collapsed to a 56px stub — the float was "temporary overlay while briefly open."
2. **Interim (Phase 6):** made the rail permanently open, un-collapsible, on direct user feedback. This broke design #1's premise: a *permanently* floating panel at narrow widths now permanently covered chat content (a real bug, caught live — see Phase 8's write-up). Fixed-ratio grid tracks (the current design) make that whole class of bug structurally impossible instead of patching around it, while still allowing the panel to be dismissed.

### 3. Approvals split by source, never duplicated

The list endpoint (`/api/v1/agent-approvals`, wrapped by [lib/agentApprovals.ts](../frontend/avry-user-dashboard/lib/agentApprovals.ts)) returns every pending approval for the user — including the one already rendered inline in the open thread via `ConsolePendingApproval` (see `ChatMessage.tsx`'s `ApprovalCard`). Without a filter, the same Approve/Deny pair would render twice: once inline, once in the rail.

The fix: the rail excludes any approval id that is currently shown inline in the open thread. A decision raised inside a conversation is answered inside that conversation. A decision that arrived from Telegram, Slack, or a scheduled run — which has no chat window to live in — surfaces only in the rail. One decision, one place, always.

### 4. Thinking is attributed to the agent, not to "Aivory"

The product already has a `ThinkingDots` component ([components/ui/ThinkingDots.tsx](../frontend/avry-user-dashboard/components/ui/ThinkingDots.tsx)) — 7 dots, `thinkingDotsWave` animation, 1.2s, defined once in `styles/globals.css:1148`. Today it's paired with a hardcoded string in `ChatMessage.tsx:374`: `"Aivory is thinking..."`.

In a room with four agents, an unattributed loader tells you nothing. The fix is copy-only — the same dots, reading `"Sales & Leads Agent is thinking…"` — plus one new placement: while an agent is streaming, a small version of the same dots (`size={9}`) replaces its status dot in the left column. That's what lets you see which agent is busy without opening its thread.

### 5. Real brand icons everywhere a source or tool is named

Every place a channel or integration is named as text — approval-card source, thread channel tag, connected-tools row — uses that app's real icon from the canonical `/integrations/*.svg` set already shipped and used by `APP_CATALOG` in [lib/integrations/store.ts](../frontend/avry-user-dashboard/lib/integrations/store.ts). A word like "Telegram" takes a beat to parse; the paper-plane mark doesn't. No new icon assets — this reuses exactly what the rest of the dashboard already renders for connected integrations.

### 6. Mission Control is a view, not a new service

When no thread is explicitly open, the middle column renders a grid of agent cards instead of an empty composer — one per `PREBUILT_AGENTS` entry plus Aivory Console. Each card shows the same `AgentAvatar` the left column and rail already use, a status word (`Idle` / `Thinking…` — reusing the existing `streamingAgentType` signal from Phase 5 — / `Needs you` when that agent has a pending approval), the pending count, and the last-message preview + relative timestamp `AgentColumn` already computes per Phase 7. Clicking a card does exactly what clicking that agent in the left column does today: opens its most recent thread, or starts a fresh one.

The load-bearing decision is what this *isn't*: not a new fetch, not a new aggregation endpoint, not a summary the backend computes. Every field on a card is already sitting in state the three-column shell fetches for the left column and rail — Mission Control just lays it out as a grid instead of a list, one extra render path over data that's already there. That's what "ringan" means concretely here: the overview is free in data-fetching terms, it costs only a new component.

### 7. The rail becomes a Notification Center, approvals become one entry type

`AgentRail` stops being three hardcoded sections and becomes one chronological feed of notification items, each carrying a `kind`:

- **`approval`** — exactly today's card (pill badge, bold heading, Approve/Deny). No visual change.
- **`status`** — exactly today's `Bar`/`BarAction` molecule: "not deployed anywhere yet," "could not load approvals," a dropped channel. No visual change.
- **`activity`** *(new)* — a thread got a reply while you were looking at a different agent. Plain text, click to open. This is the one kind of event the shipped rail has no way to represent at all today.

All three kinds already exist as visuals; Phase 10's job is giving them one shared feed and adding the missing kind, not inventing new UI. `activity` items are *derived*, not fetched: a new hook diffs `sessionsByAgent`'s per-thread `updatedAt` against a "last seen" timestamp already conventionally stored the way `chatPersistence.ts` stores everything else — localStorage, keyed per session. No backend change, no new poll interval; it rides data already resident in `useChat`'s state.

Grouped by agent header, same as macOS groups notifications by app — a pending approval and a missed reply from the same agent sit under one heading, not scattered across sections that don't know about each other.

**Superseded 2026-09-01 (see Phase 10's scope-correction note):** "grouped by agent" turned out to mean *within* the one agent already open in the rail, not a cross-agent feed — that's Mission Control's job. `status` (not-deployed, approval-load errors) also didn't become a real `Notification` variant; it stayed an ad hoc render in `AgentRail`, since those are standing conditions, not timestamped events.

## Mockups

Two published artifacts (private, session-owned):

- **Layout + rail behaviour + attributed thinking + real icons** — interactive, all agents clickable, composer sends and gets an agent-attributed reply, rail mode toggles between push/float/auto, "Simulate an approval arriving" demonstrates the toast-not-a-forced-open behaviour.
- **This implementation plan**, same visual system, as a second artifact.

(Links live in the conversation that produced this doc — both are re-publishable from `/private/tmp/.../scratchpad/cerveau-office.html` and `office-build-plan.html` if a fresh link is needed.)

## Two problems found while reading the current code

Both block the layout work and are fixed first, in Phase 0.

### The sidebar's conversation list is dead code

`useConversationHistory` ([hooks/useConversationHistory.ts](../frontend/avry-user-dashboard/hooks/useConversationHistory.ts)) reads/writes its own localStorage key, `aivory_conversation_history_v2`, seeded with an empty array. **Nothing in the codebase ever adds a conversation to it** — its only consumer, `ConversationHistory.tsx`, passes `onSelect={() => {}}` on every row. That's why the sidebar shows "No conversations found" on accounts that have clearly used Console.

Real sessions live in `lib/chatPersistence.ts`'s `listSessions()`, already surfaced through `useChat` as `sessions` / `switchSession`. The left column of the office is built on those — not a relocation of the dead list.

### A thread does not remember which agent it belongs to

`agentTarget` is `useState(null)` in [contexts/ModeContext.tsx](../frontend/avry-user-dashboard/contexts/ModeContext.tsx:18) — not persisted, not attached to any session. `PersistedSession` has `id`, `title`, `messages`, `createdAt`, `updatedAt`, and no agent field. Today, switching agents mid-session silently redirects the next message to a different brain with no record of the switch.

Nesting threads under agents is a data-model fix, not a rendering change — and it's worth doing on its own regardless of the office layout.

## Implementation plan

### Phase 0 — data-model fixes (blocking)

Not layout work. Both problems above get fixed here, with no UI change yet.

**Exit gate:** a session created while an agent is selected reloads with that agent still selected; sessions are real and inspectable via `listSessions()`. ✅ Met — see Phase 1 verification below.

### Phase 1 — data model ✅ Done, 2026-08-31

| File | Change | Status |
|---|---|---|
| `lib/chatPersistence.ts:16` `PersistedSession` | Add `agentType: string \| null`. Migrate on read: missing field → `null` (Generalist / Aivory Console). No backend change. Also added `getSession(id)` to look up one session's stored agent. | Done |
| `hooks/useSession.ts` | `save()` takes an optional `agentType` and forwards it. Added `getAgentType(id)`. | Done |
| `hooks/useChat.ts:52` | Stamp `agentType` at every `saveSessionMessages` call site (agent-branch send, stream-branch send, approval resolve, new-chat archival). Mount effect restores `agentTarget` from the current session's stored `agentType`. `switchSession` restores `agentTarget` from the session it opens. | Done |
| `contexts/ModeContext.tsx` | **Not touched.** Considered "derive `agentTarget` from the active session" as originally scoped, but `useChat` explicitly calling `setAgentTarget` at the three points that matter (mount, switch, and implicitly via the AgentSelector) is simpler and avoids a second source of truth. `ModeContext` stays a plain `useState`. | Simplified from plan |
| `hooks/useConversationHistory.ts`, `types/conversation.ts` | **Deferred to Phase 2.** Deleting them now breaks `ConversationHistory.tsx`, which `components/shared/Sidebar.tsx:341` still renders — the deletion is only safe once Phase 2 replaces that render with `AgentColumn`. | Deferred |

**Exit gate:** every stored session has an `agentType`; a session survives reload and `switchSession` under the correct agent. ✅ Verified live against the running dev server (`npm --prefix frontend/avry-user-dashboard run dev`, port 9000, `/dashboard/console`) with the network response stubbed (no local backend):
- Sent a message under **Ticket Ops Agent** → reloaded the page → AgentSelector and the conversation both came back on Ticket Ops Agent (previously always reset to the Generalist).
- Started a second thread under **Leads Qualifier Agent**, then clicked back to the Ticket Ops thread in the (currently unreachable, see below) history list → AgentSelector switched back to Ticket Ops Agent automatically.
- `localStorage.aivory_chat_sessions` confirmed both threads carry the correct `agentType` (`customer_service`, `leads_qualifier`).
- `tsc --noEmit` — 0 errors, project-wide, before and after.

**Additional finding, not in original scope:** `app/console/page.tsx`'s "Chat History" `<aside>` (the real, working flat session list — separate from the dead `ConversationHistory` sidebar) has no button anywhere that calls `setSidebarOpen(true)`. It renders correctly and `switchSession` works against it, but a user cannot currently open it. Phase 2's `AgentColumn` supersedes it, so this is left as-is rather than wiring a throwaway toggle.

### Phase 2 — the shell ✅ Done, 2026-08-31

The middle column is the existing Console, untouched, to keep streaming/agentic-phases/uploads/intent-router out of the blast radius.

**Correction to the original plan:** `/api/agents` is a *different* product concept — persistent agents referenced as steps inside workflows (`types/agents.ts`: `workspaceId`, `model`, `provider`, `runtime`), unrelated to Console's deployable chat agents. The left column lists only `PREBUILT_AGENTS` (the same five `AgentSelector` already used), not a merge with `/api/agents`. Pulling in workflow-builder agents would have been exactly the "infer a feature's backend from a matching request shape" mistake this project has been burned by before.

| File | Change | Status |
|---|---|---|
| `hooks/useChat.ts` | Added `sessionsByAgent` — sessions grouped by `agentType` (`'null'` key for Aivory Console), preserving `listSessions()`'s updatedAt-desc order per group. | Done |
| `components/office/OfficeShell.tsx` (new) | Three-column flex frame (agents \| chat \| rail) inside `<main>`; the global nav `Sidebar` is a sibling in the root layout, untouched. Rail push-vs-float breakpoint is still Phase 4 — today the rail is a fixed-width column that only collapses to a 56px stub on manual toggle. | Done |
| `components/office/AgentColumn.tsx` (new) | Row per `PREBUILT_AGENTS` entry + "Aivory Console". Clicking an agent with an existing thread opens its most-recent one (`switchSession`); clicking one with none starts a fresh thread under it (`handleNewChat` + `setAgentTarget`). A hover "+" always starts a new thread under that agent without switching away. Channel badges (Telegram/Slack icons from `/integrations/*.svg`) via the same `listDeployments()` call `AgentSelector` used to make. | Done |
| `components/office/AgentRail.tsx` (new) | Waiting on you (raw `listPendingApprovals()` filtered client-side by `_agent_type` — **not yet deduped against inline chat approvals, that's Phase 3**), Running now (honest empty state — no backend data source exists for live executions), Connected channels (same `listDeployments()` data, real icons). | Done |
| `components/console/ConsoleTopBar.tsx` | `AgentSelector` dropdown removed — the left column now owns switching agents, so this was becoming a second, redundant control. Top bar keeps a read-only label showing which agent is active. | Done |
| `components/header/AgentSelector.tsx` | **Deleted.** Zero remaining consumers after the above (confirmed by grep before deleting). | Done |
| `app/console/page.tsx` | Wrapped the existing return in `OfficeShell`; the Console JSX inside is byte-for-byte unchanged. | Done |
| `components/shared/Sidebar.tsx:259,341` nav rename, `useConversationHistory`/`types/conversation` deletion | **Still deferred, now to Phase 3.** Renaming the `approvals` nav item to point at `/console` before `/approvals` actually redirects there (Phase 3) would leave two separate, competing approval surfaces live at once. Bundling the nav change with the redirect keeps it a single atomic step. | Deferred to Phase 3 |

**Exit gate:** Console behaves exactly as before, now inside three columns. ✅ Verified live (dev server, port 9000, `/dashboard/console`, network stubbed):
- Three columns render; rail shows honest empty/error states with no local backend (`Could not load approvals`, `Not running anything right now`, `Not deployed anywhere yet`) rather than fabricated data or a crash.
- Clicking **Ticket Ops Agent** with no prior thread → blank composer, agent switches. Sent a message (stubbed reply) → thread **"Check the refund queue"** appears nested under it.
- Clicking **Leads Qualifier Agent** → new blank thread, previous Ticket Ops thread preserved and collapsed.
- Clicking **Ticket Ops Agent** again → reopens the existing "Check the refund queue" thread (does **not** create a duplicate blank one) — confirms the most-recent-thread-first click behavior.
- The per-row "+" on Ticket Ops Agent → new blank thread under the *same* agent, composer cleared, agent selection unchanged.
- Rail collapse/expand toggle works (56px stub ↔ 330px panel).
- `tsc --noEmit`: 0 errors. `eslint` on every touched file: 0 problems (one `react-hooks/set-state-in-effect` finding fixed with the same documented sync-from-prop pattern already used in `useChat.ts`'s own mount effect).

### Phase 3 — approvals, split by where they came from ✅ Done, 2026-08-31

**Correction to the original plan:** grepped the whole repo (backend routes, `vps-bridge/telegram-agent.js`, blueprint/workflow code) for anything constructing a `/approvals?...`-style link for email or Telegram notifications — found none. The `/approvals` references that exist are all backend/gateway API paths (`/webhook/approvals`), not dashboard deep links. So "Route stays alive for existing notification links" had no real link to preserve a contract for; the redirect below still forwards `id`/`approval` defensively, without building agent-lookup-and-focus machinery for a consumer that doesn't exist today.

| File | Change | Status |
|---|---|---|
| `lib/agentApprovals.ts` | Added `listPendingApprovalsByAgent()`, grouping the existing list by `_agent_type` (`'unknown'` for any row missing it). No endpoint change. | Done |
| `hooks/useAgentApprovals.ts` (new) | Polls every 60s (same cadence Sidebar already used), groups by agent, filters out any id in `excludeIds`, exposes `resolve()` (calls `resolveApproval` then removes the item from local state) and `total`. Console's page calls it once with the open thread's inline approval ids as `excludeIds`; `AgentColumn` and `AgentRail` both read from that single call via props — one subscription, not three. Sidebar calls it separately with no `excludeIds` (undeduped, matching what the nav badge always showed). | Done |
| `components/office/AgentColumn.tsx` | Per-agent pending badge now reads `approvalsByAgent[row.key]?.length` instead of always 0. | Done |
| `components/office/AgentRail.tsx` | No longer fetches approvals itself — takes `approvalsByAgent`/`approvalsError`/`onResolveApproval` as props. Added a `resolveError` state + message; the Phase 2 version had no catch around the resolve call, which surfaced as a real unhandled-promise-rejection bug during testing (see below). | Done |
| `components/shared/Sidebar.tsx` | Swapped the bespoke `listPendingApprovals().then(...)` + `setInterval` block for `useAgentApprovals()`. Removed the `approvals` nav row entirely — its badge moved onto the existing `console` row, since a separate nav entry pointing at the same destination made no sense once approvals live inside Console. Deleted the now-fully-unused `ApprovalsIcon`. | Done |
| `app/approvals/page.tsx` | Rewritten as a client redirect to `/console` (forwarding `?approval=` or `?id=` as `?approval=` if present). | Done |
| `hooks/useConversationHistory.ts`, `types/conversation.ts`, `components/sidebar/{ConversationHistory,ConversationGroup,PinnedChats,SearchBar}.tsx` | **Deleted**, deferred from Phase 1/2. Re-checked "keep for reuse" from the Phase 1 write-up: `AgentColumn` ended up with its own inline JSX rather than reusing these, so nothing referenced them any more (confirmed zero remaining consumers by grep before deleting) — no partial credit left lying around. | Done |
| `app/console/page.tsx` | Also removed the old "History sidebar" `<aside>` and its `sidebarOpen` state — confirmed in Phase 1 that nothing could ever open it, and `AgentColumn` now does its job properly (nested by agent, actually reachable). | Done (opportunistic cleanup) |

**Exit gate:** an approval raised in chat appears once, in chat. One from Telegram appears once, in the rail. An old `/approvals` link still resolves. ✅ Verified live (dev server, port 9000, network stubbed with two approvals under `customer_service`: one mirrored as the chat's own inline `pending_approval`, one only in the list endpoint):
- Before sending a message: Ticket Ops Agent's badge shows **2** (nothing inline yet to exclude).
- After sending, the inline approval card appears in chat *and* the badge drops to **1**, the rail shows exactly **1** item ("Slack — Message") — the Gmail one shown inline never appears a second time.
- Resolving the rail's item removes it from the rail and the badge in the same click; the inline card is untouched.
- The global nav's `Console` badge does **not** dedupe (by design) and only updates on its own 60s cycle — confirmed as expected staleness, not a bug.
- `/approvals?id=xyz` → `/console?approval=xyz`; bare `/approvals` → `/console`.
- `tsc --noEmit` and `eslint .` (whole project, not just touched files): 0 errors both times.

**Bug found and fixed during this pass:** `AgentRail`'s resolve handler had no `catch` — a failed `resolveApproval()` call (confirmed live: my first test stub didn't cover the `/resolve` endpoint, so the real request fell through to the unreachable `backend.aivory.id`) surfaced as an unhandled promise rejection instead of a user-visible error. Fixed with a `resolveError` state rendered inline, same pattern as the approvals-list error already had.

### Phase 4 — rail behaviour ✅ Done, 2026-08-31

**Scope trim from the original plan:** "badge pulse + toast" became badge-pulse-only. A toast-on-arrival needs id-diffing pushed through page.tsx into a cross-component notification, which is real surface area for a behaviour the exit gate doesn't actually require (the gate is about *not reflowing* and *not self-opening*, not about notifying). Said so here rather than quietly dropping it.

| File | Change | Status |
|---|---|---|
| `hooks/useRailMode.ts` (new) | `ResizeObserver` on `OfficeShell`'s root; `mode: 'dock' \| 'float'`, threshold 1500px (708px chat reading-measure floor + 330px rail + nav/agent-column widths — below that, pushing would squeeze the chat under its own floor). | Done |
| `components/office/OfficeShell.tsx` | Now `relative` (anchor for the float overlay) and `overflow-hidden`; calls `useRailMode` and injects `mode` into `AgentRail` via `cloneElement` — the shell decides the breakpoint, the rail decides how to render itself at that breakpoint. | Done |
| `components/office/AgentRail.tsx` | Dock mode: unchanged (flex child, 330px open / 56px stub). Float mode: the 56px stub stays in the normal flex flow (chat width never changes because of it) while the full panel renders as `position: absolute; right:0; top:0` with a blurred, semi-opaque background, overlaying the chat instead of pushing it. `open` now starts `false` and flips to `true` exactly once, automatically, the moment approvals finish their first load *if* something was already pending — gated by `approvalsLoaded` (new field on the hook, see below) so it can't fire on the pre-fetch empty state. After that one check, `open` only ever changes from the two toggle buttons — confirmed by grep, exactly 3 call sites total. | Done |
| `hooks/useAgentApprovals.ts` | Added `loaded: boolean` (`true` once the first fetch settles, success or error) — the signal `AgentRail`'s one-time auto-open and `AgentColumn`'s arrival-pulse both need to tell "no data yet" apart from "loaded, genuinely zero". | Done |
| `components/office/AgentColumn.tsx` | Added the pulse: tracks each agent's previous approval count in a ref, and when a count *increases* after the initial snapshot (not on the snapshot itself — that's existing work surfacing, not an arrival), applies `.pending-badge-arrived` for ~2.9s. | Done |
| `styles/globals.css` | Added `@keyframes pendingBadgeArrived` (two soft box-shadow pulses) + `.pending-badge-arrived`, same file/convention as `thinkingDotsWave`. | Done |

**Exit gate:** at 1280px with the rail open, chat does not reflow. Nothing opens itself while the composer has focus. ✅ Verified live (dev server, port 9000, one stubbed approval under `customer_service`):
- At 1680px width: rail starts **collapsed** (default agent is Aivory Console, which has no pending approvals — correctly not auto-opened). Switching to Ticket Ops Agent (1 pending) does **not** auto-open it either — the one-time check already fired at mount and found nothing for the then-active agent.
- Manually opened the rail at 1680px → measured chat column width: **1154px** (dock mode, rail pushing).
- Resized to 1280px with the rail still open → chat column: **754px** — exactly `1280 − 220 (nav) − 250 (agent column) − 56 (stub)`. The full 330px is *not* subtracted; the panel switched to floating over the chat, confirmed visually (composer and suggestion chips visible bleeding under the blurred panel edge).
- `document.body.scrollWidth === window.innerWidth` at every width tested — no horizontal overflow introduced by the float overlay.
- `tsc --noEmit` and `eslint .` (whole project): 0 errors, after fixing two more instances of the same `react-hooks/set-state-in-effect` finding from Phase 2 (same documented sync-from-prop pattern, same fix).

### Phase 5 — thinking, attributed ✅ Done, 2026-08-31

The smallest phase by file count, and the one that surfaced the two most consequential bugs of the whole project — both because its own exit gate ("switch to another mid-answer... the reply lands in the right thread") was specific enough to actually test the claim, rather than settle for "looks right."

| File | Change | Status |
|---|---|---|
| `components/ChatMessage.tsx` | Added `agentName` prop (defaults to `'Aivory'`), replaces the hardcoded `"Aivory is thinking..."`. | Done |
| `app/console/page.tsx` | Derives `activeAgentName` from `agentTarget` + `PREBUILT_AGENTS`, passed to `ChatMessage`. | Done |
| `components/office/AgentColumn.tsx` | A row's icon becomes `<ThinkingDots size={9} dotSize={1.6} />` when `row.type === streamingAgentType` — regardless of which agent/thread is currently being viewed. | Done |
| `hooks/useChat.ts` | Added `streamingAgentType` state — see bug #1 below for why this needed its own sentinel value, not just reusing `agentTarget`. | Done |
| `components/ui/ThinkingDots.tsx` | Untouched, as planned. | Done |

**Exit gate:** send on one agent, switch to another mid-answer — the dots follow the agent answering, not the screen being viewed, and the reply lands in the right thread. ✅ Verified live (dev server, delayed fetch stub, explicit mid-flight agent switch):
- Sent under Ticket Ops Agent, immediately switched to Leads Qualifier Agent before the (stubbed, delayed) reply arrived → Ticket Ops Agent's row showed the dots the whole time, Leads Qualifier's did not.
- When the reply resolved, the dots disappeared cleanly (no false positive — see bug #1).
- Switched back to Ticket Ops Agent → both the user's message and the agent's reply were present and correct, exactly as sent.
- `tsc --noEmit` and `eslint .`: 0 errors.

**Bug #1 — found and fixed: `null` meant two different things.** `streamingAgentType` initially reused `agentTarget`'s type (`string | null`), with `null` doing double duty for both "Aivory Console is streaming" and "nothing is streaming" (the reset value). The moment a reply finished, the reset to `null` was indistinguishable from Console genuinely being busy — so the **finished** state incorrectly lit up the Aivory Console row's dots. Caught live: after a reply resolved, dots appeared on Console even though nothing was happening. Fixed by giving "not streaming" its own sentinel (`undefined`), leaving `null` to mean only "Console itself is streaming" — `row.type === streamingAgentType` then can't accidentally match when nothing is in flight, since `row.type` is never `undefined`.

**Bug #2 — found and fixed: switching agents mid-reply could silently erase the original thread.** This one is more serious than a display bug. `messages` is a single flat array representing "whichever thread is currently open." When a reply resolves *after* the user has switched to a different agent, the old code's `setMessages(prev => prev.map(...))` searched for the placeholder message inside `prev` — which by then held the *new* thread's messages, not the original one. The map found no match, returned the new thread's array unchanged, and then `saveSessionMessages(currentSessionId, updated, ...)` wrote that unrelated content into the *original* thread's storage slot — because `currentSessionId` was still correctly closed over as the original session, but `updated` was not. Net effect: switching away mid-reply could overwrite the original thread down to **zero messages**, silently deleting the user's own message along with the reply. Reproduced and confirmed via `localStorage` inspection before the fix (a thread dropped from 2 messages to 0 after switching away mid-answer); confirmed fixed after (2 messages, correct content, every time).

This bug predates all five phases — the underlying single-shared-`messages`-array design was already there. But it's called out specifically here because **Phase 2's own `AgentColumn` is what made the trigger trivial and inviting**: a one-click affordance to jump between agent threads mid-conversation didn't exist before this project. Fixed by capturing `sentSessionId` / `sentAgentTarget` / a full message snapshot at the moment `handleSend` is called, and checking a `currentSessionIdRef` at completion time: if the user is still on the same thread, update it live as before; if they've moved on, persist the correct final content directly to storage without touching whatever's currently on screen. Both the agent-chat branch and the Aivory Console SSE-streaming branch (including its per-chunk updates, which had the identical issue) were fixed the same way.

### Phase 6 — thread delete, and the office stops being liked ✅ Done, 2026-08-31

A small addition first: a hover-revealed trash icon per thread in `AgentColumn`, wired to `deleteSession()` in `lib/chatPersistence.ts` — that function already existed, fully implemented, with zero callers. `useChat.ts` gained `deleteThread()`: deletes the session, and if it was the one open, starts a fresh empty thread under the same agent rather than pointing the view at a session that no longer exists. Confirmed live: deleting the active thread falls through to a blank composer, deleting an inactive one leaves everything else untouched. `confirm()` before deleting, matching the pattern already used for destructive actions elsewhere (workflows, agents, integrations).

Then the user reviewed the shipped office live and said, plainly, that they weren't happy with it — two specific complaints:
1. The approval rail shouldn't be collapsible once an agent is selected — status the user might need to act on shouldn't be a click away from hidden.
2. An agent with zero deployed channels should surface that immediately, not as a quiet line buried at the bottom of the rail.

### Phase 7 — a real agent identity, everywhere ✅ Done, 2026-08-31

Interleaved with Phase 6's feedback: the user supplied a real mascot asset — `frontend-nextjs/public/images/Office Agent/Office Agent icon.svg`, a purple headset character, the only piece of per-agent artwork that exists anywhere in the repo (confirmed by grepping for "Generalist"/"Ticket Ops"/etc. — nothing else turned up). Copied into this app's own `public/agents/office-assistant.svg`.

First pass used the mascot only for Office Assistant and generic `Bot`/`Terminal` icons for the rest — the user corrected this immediately: **every** agent uses the *same* mascot artwork, told apart only by the avatar circle's background color (matching each agent's existing accent). `components/office/AgentAvatar.tsx` (new) is the one shared definition — `AGENT_VISUALS` keyed by agent type, each just a `{ bg, accent }` pair — used identically by `AgentColumn`, `AgentRail`'s header, and (new) `ChatMessage`'s avatar, which previously showed a generic Aivory logo regardless of which agent was actually answering.

**Superseded 2026-09-01 (see Phase 9's follow-up note below):** the single-shared-mascot approach was replaced with a distinct portrait per agent once real per-agent artwork existed. `AgentAvatar.tsx` stayed the one shared definition throughout — this was a change to what it renders, not a second place agent identity got defined.

Alongside this: `AgentColumn` gained a per-row last-message preview + relative timestamp (closer to a real conversation list) and its own collapse-to-56px-icon-rail, same pattern as the main nav sidebar (`hooks/useAgentColumnCollapse.ts`, own storage key). Assistant chat messages were wrapped in a bubble surface matching the user bubble's shape language, replacing flowing unbounded text.

### Phase 8 — fixed-ratio layout and an approval design system ✅ Done, 2026-09-01

Landing on Phase 6's two complaints took three iterations, documented here in order because each one taught something real.

**Iteration 1 — un-collapsible rail, broke Phase 4's premise.** Removed the rail's collapse toggle outright (`open` always `true`) and added `AgentDeployNotice` (new) — a slim, full-width, underlined-link announcement bar shown in the chat pane the instant an undeployed agent opens, styled after a reference screenshot of a real product's site-wide notice bar. Centralized the deployments fetch that had been duplicated in both `AgentColumn` and `AgentRail` into `hooks/useAgentDeployments.ts` while touching both files anyway.

**The bug this caused, caught live before shipping:** with the rail permanently open, Phase 4's push-vs-float breakpoint (float below ~1500px, so the reading column keeps its width) now meant a *permanently* floating semi-transparent panel at narrow widths — verified via screenshot: the deploy notice's own "Deploy" button was visually clipped underneath the rail. Float-while-collapsible had never been a bug because the float was temporary; float-while-permanent is just an overlay that hides content. Deleted `hooks/useRailMode.ts` and the push/float split entirely rather than patch around it.

**Iteration 2 — the fixed-ratio grid (kept).** The user's own framing resolved the design cleanly: bring collapse back, but make it a *push*, and give each panel a *fixed screen ratio* — "persis seperti Grok Bot." `OfficeShell.tsx` became a real CSS Grid: `minmax(220px,18%) / 1fr / minmax(280px,20%)` when both panels are open, either side track dropping to a flat `56px` when collapsed. Collapse state moved out of each panel's own hook call and up into `OfficeShell`, which now owns both `useAgentColumnCollapse` and the new `hooks/useRailCollapse.ts` and injects `collapsed`/`onToggleCollapse` into the pre-built `agentColumn`/`rail` elements via `cloneElement`. Verified at both 1680px and 1280px: collapsing either panel visibly hands its space to chat, `document.body.scrollWidth` never exceeds `window.innerWidth`, nothing is ever covered.

**Iteration 3 — the approval visuals, three rounds of direct correction.** The user pushed back hard and specifically here, each round narrowing the target:
- *"design nya seperti reference, gunakan tailwind css"* (a Tavily-style slim announcement bar) → rewrote `AgentDeployNotice` and every passive rail status line (empty states, load errors, "not deployed") onto one shared `Bar` molecule: a tinted strip with an inline underlined action where one exists (`onRetryApprovals` wired through from `useAgentApprovals`'s existing, previously-unused `refetch`), plain text where none does.
- *"list approval nya juga... buat variasi nya"* against a fuller reference (a light SaaS billing card: pill badge, large bold heading, dark rounded-full button) → a pending approval stopped being a `Bar` row and became its own card: pill badge, `text-[19px] font-semibold` heading, solid accent pill button with a `Check` icon for Approve, a quiet underlined text link for Deny — deliberately unequal weight, not two same-size buttons.
- *"jelek banget, beneran gak sama dengan reference"* on the first version of that card (14px text, everything tinted amber) → this was the correct call: the heading was nowhere near the reference's visual dominance and the uniform amber wash read as muddy rather than confident. Fixed by making the card surface neutral (`#3a3a36`, no tint) and reserving amber for the pill badge alone, closing the actual gap in prominence rather than adjusting shades.
- *"gaya illustrasi... untuk background"* → added a soft multi-color radial-gradient wash behind the card content (`background-image`, three `radial-gradient()` layers using Aivory's own sage/amber/blue accents at 16–22% opacity), echoing the reference's blurred mesh-gradient card background without introducing a new color or an image asset.

**Exit gate:** both panels collapsible without ever covering chat; an undeployed agent's status is impossible to miss on open; a pending approval reads as the most important thing in the rail, not one line among several. ✅ Verified live at 1680px and 1280px (dev server, stubbed approvals): collapse/expand both panels independently, no `scrollWidth` overflow at either width, approval card renders with the gradient wash + pill badge + bold heading + Approve busy-state (`aria-busy`, disabled, "Approving…" text) all present. `tsc --noEmit` and `eslint .`: 0 errors after every round, including the two corrections. Pushed to `Aivory-hub88/avry-user-dashboard main` (`c0e5dc9` thread-delete, `0c45fbf` the layout/approval rework) and deployed; both verified 200 post-deploy.

### Phase 9 — Mission Control ✅ Done, 2026-09-01

**Correction to the original plan:** `useChat`'s session-init effect always resolves a `currentSessionId` on mount ([useChat.ts:82–99](../frontend/avry-user-dashboard/hooks/useChat.ts)) — there is no "no session" state to key Mission Control's default visibility off, and overloading that would have touched Phase 1's session-restore logic, already the site of two real bugs (Phase 5). Instead Mission Control is a separate, explicit UI state (`showMissionControl`, default `false`) that a persistent "Mission Control" row/icon in the agent column toggles — one click away, not the default landing. This trades the doc's original "default view" framing for zero risk to the reload-restores-your-last-thread guarantee Phase 1 shipped.

| File | Change | Status |
|---|---|---|
| `components/office/MissionControl.tsx` (new) | Grid of agent cards, one per `PREBUILT_AGENTS` entry + Aivory Console. Reads `sessionsByAgent`, `approvalsByAgent`, `deployments`, `streamingAgentType` — all already fetched/held by `app/console/page.tsx` for the existing columns, passed down as props. No new fetch, no new hook. | Done |
| `components/office/AgentColumn.tsx` | Added a persistent "Mission Control" row (expanded state) / icon button (collapsed state) above the agent list, plus `missionControlActive`/`onOpenMissionControl`/`onExitMissionControl` props. Every existing "active" highlight (`isActiveAgent`, a thread's `active` state) is gated on `!missionControlActive` so the column never shows two things as selected at once. `openAgent`/`startThread`/the inline thread-switch button all call `onExitMissionControl` — needed because `switchSession` itself no-ops when the target is already `currentSessionId` (true whenever you reopen the agent that was active in the background), so exiting the overview can't rely on that call alone. | Done |
| `app/console/page.tsx` | Added `showMissionControl` state and `openAgentFromMissionControl()` (same open-or-start-thread logic `AgentColumn` runs, kept independent rather than threaded through as a shared prop — consistent with the rail and column already duplicating small pieces of logic rather than sharing state). The chat pane's ternary gained one more branch: Mission Control renders in place of both the empty-composer view and the thread view when `showMissionControl` is true; the rail is untouched (it keeps showing whatever `agentTarget` is in the background — unifying that is Phase 10's job). | Done |

**Exit gate:** ✅ Verified live (dev server, port 9000, `/dashboard/console`, real backend unreachable so approvals/deployments show their existing honest error/empty states):
- Clicking "Mission Control" (expanded and collapsed agent-column variants both tested) shows all six cards with real per-agent status (`Idle`), last-message preview, and deploy state — no new network request fires (confirmed by inspection: only the same `useAgentApprovals`/`useAgentDeployments` polls already running).
- Clicking a card exits to that agent's most recent thread (or starts one) — identical behavior to clicking the same agent in the left column.
- Clicking the card for the agent already active in the background (edge case: `switchSession` alone would no-op since `currentSessionId` hasn't changed) still correctly exits Mission Control and shows the existing thread, via the added `onExitMissionControl` call.
- Reopening Mission Control after switching agents doesn't disturb the background `agentTarget`/session — the previously-active agent's row shows no false "active" highlight while the overview is open, and the rail continues reflecting it correctly underneath.
- `tsc --noEmit` and `eslint` on the three touched/new files: 0 errors.

Pushed to `Aivory-hub88/avry-user-dashboard main` (`1d37fd0`) and deployed (VPS `avry-user-dashboard` container rebuilt via `docker compose -f docker-compose.prod.yml build/up avry-user-dashboard`); verified 200 on `/dashboard/console` post-deploy, clean container startup log.

**Follow-up, same day — per-agent portrait avatars supersede Phase 7's single shared mascot.** The user dropped 5 new illustrated portraits into `frontend-nextjs/public/images/Office Agent/` (`Office Agent Header 2 copy-01..05.svg`). [AgentAvatar.tsx](../frontend/avry-user-dashboard/components/office/AgentAvatar.tsx) — the one shared definition Phase 7 built specifically so the column/rail/chat-message/Mission-Control avatars can't drift apart — now maps each `PREBUILT_AGENTS` entry to its own portrait (`public/agents/{autonomous,customer_service,leads_qualifier,finance_invoice_ops,office_assistant}.svg`, copied in and rendered with `object-fit: cover` so each portrait's own baked-in circular background fills the avatar with no manual per-file crop math needed) instead of one mascot differentiated only by circle color. Mapping of which face got which agent is aesthetic, not derived from anything. Aivory Console explicitly does **not** get a portrait — on the user's direction it now shows the actual Aivory brand mark (`/Aivory_Avatar.svg`) on its tinted circle, since it isn't a deployable agent like the other five. The old shared mascot (`public/agents/office-assistant.svg`) is deleted — confirmed zero remaining references before removal. Verified live at 24–38px (every size `AgentAvatar` is actually rendered at across the column, rail header, and Mission Control grid): all 5 portraits stay legible and correctly cropped to a circle at avatar scale. `tsc --noEmit`/`eslint`: 0 errors. Pushed (`28f0772`) and deployed; verified 200 on `/dashboard/console` and on the new asset path post-deploy.

### Phase 10 — Notification Center ✅ Done, 2026-09-01

**Scope correction to the original plan:** the design decision's "grouped by agent, same as macOS groups by app" was written before implementation forced a concrete choice: `AgentRail` has only ever shown ONE agent's data at a time (`agentTarget`) — it was never a cross-agent list. Making it genuinely cross-agent would duplicate Mission Control's job (Phase 9), which already answers "what's happening across all my agents" as a grid. So the rail stays scoped to the open agent; "one feed" means *that agent's* approvals + missed replies in *its other threads* merge into one list, not a feed spanning every agent at once. `status` also didn't become a real `Notification` variant — `types/notifications.ts` only has `approval` and `activity`; "not deployed"/"could not load approvals" stayed ad hoc `NotificationCard` renders in `AgentRail` itself, since they're standing conditions with no natural timestamp to sort into a feed, not discrete events.

| File | Change | Status |
|---|---|---|
| `types/notifications.ts` (new) | `Notification = {kind:'approval', approval} \| {kind:'activity', sessionId, title, updatedAt}` — a thin union over data that already exists in two places (approvals, session state). | Done |
| `hooks/useThreadActivity.ts` (new) | Derives `activity` items by fingerprinting each thread's last message (`length:contentLength:last16chars`) and comparing against a fingerprint stored in `aivory_thread_last_seen` (localStorage, same convention as `chatPersistence.ts`). **Not `updatedAt`** — see the bug below. Baselines any never-before-seen thread to its current fingerprint on first sight, so pre-existing history never reads as "new" the moment the hook starts running. | Done |
| `hooks/useNotificationFeed.ts` (new) | Merges `useAgentApprovals`'s approvals with `useThreadActivity`'s activity into one per-agent map. Also passes through the raw `approvalsByAgent` unchanged, for Mission Control (Phase 9) — which only ever wanted approval counts and doesn't need to know activity exists. | Done |
| `components/office/AgentRail.tsx` | Renders the merged feed (sliced to `agentTarget`) through `NotificationCard` (see the design correction below) instead of three hardcoded sections. `Running now` and `Connected channels` (the non-empty case) stay separate, unchanged — they're standing reference state, not notifications. | Done |
| `components/office/AgentColumn.tsx` | Per-row badge (`notificationsByAgent`) now counts approvals + activity together, and the existing `.pending-badge-arrived` pulse fires on either. | Done |
| `app/console/page.tsx` | Swapped `useAgentApprovals` for `useNotificationFeed`; added `onOpenThread` wired to `switchSession` (+ exits Mission Control if it was open) for activity-card clicks. | Done |

**Bug found and fixed during this pass — `updatedAt` alone can't detect real activity.** First attempt kept `useThreadActivity`'s baseline as each thread's `updatedAt` timestamp. Caught live: `chatPersistence.ts`'s `saveSessionMessages()` unconditionally bumps `updatedAt` on *every* save — including the content-preserving save `switchSession()` makes on the thread you're **leaving**. Reproduced directly: switch from thread A to B, then back to A — A reappeared in the feed as "new activity" purely because leaving it re-saved it with a fresh timestamp, not because anything changed. A second candidate (message *count*) also fails, for the opposite reason: Phase 5's delayed-reply race fills an already-counted placeholder message's `content` after the user has switched away, so the count never changes even though real content just arrived. Fixed by fingerprinting the last message's `length:contentLength:tail` instead of trusting either signal alone — a content-preserving re-save produces an identical fingerprint (no false positive), while a placeholder filling in with real text changes it (correctly detected). Verified both cases live with seeded session data before and after the fix.

**Design correction, same day — the notification cards themselves, on direct user feedback ("jelek", read: inconsistent).** The first pass kept Phase 8's oversized gradient-wash approval card (19px heading, multi-radial-gradient background) sitting next to the plain flat `Bar` rows used for activity/status — one glammed-up card beside several undecorated strips read as mismatched rather than tidy, especially in the common case where an agent has a status warning *and* an activity item but no approval. Researched actual macOS Notification Center conventions (one neutral rounded card shape — icon, title, secondary line, timestamp — used for every kind of notification, hierarchy carried by a badge/accent rather than a different card language per type) and rebuilt around that: new shared `components/office/NotificationCard.tsx` renders approval, activity, and status items identically (28px icon circle, 13px title, 12px muted subtitle, optional actions row), with only a small badge and a left-edge accent line marking anything urgent. The approval card's Approve/Deny buttons also gained `active:scale-[0.97]` press feedback (missing before) and a one-shot `notification-card-in` mount animation (`styles/globals.css`, 220ms `cubic-bezier(0.23,1,0.32,1)`, matching the emil-design-eng skill's entrance/easing/duration rules) — applied per the skill's explicit invocation, per the standing rule to use it for all Aivory UI work.

**Second bug found and fixed, same day — a global `main h1`–`h4` prose style was overriding every office header label.** On direct user feedback ("icon dan text gak sejajar") the rail title turned out to render at 24px instead of the intended 11px, despite the correct Tailwind class being present. Root cause: a site-wide, un-layered CSS rule targeting `main h1`/`h2`/`h3`/`h4` (written for blog/markdown prose) sets font-size/color/margins on *any* heading tag inside `<main>` — and un-layered CSS always beats Tailwind's `@layer utilities` classes regardless of selector specificity, so `text-[11px]` on an `<h2>` never stood a chance. Every small chrome label in the office that happened to use a heading tag was affected: the rail title, `AgentColumn`'s "Your Agents", all three `AgentRail` section labels, and `MissionControl`'s own `<h1>` (whose margins were also silently inflated to 1.5rem/2.5rem). Fixed by switching every one of these to a plain `<span>`/`<p>` — none of them are real document headings, they're UI chrome. Bundled with two more requested changes: dropped `uppercase tracking-[...]` for normal sentence case everywhere in this set, and added `leading-none` so flexbox centers the actual glyph mass against paired icons rather than an inflated default line-box (verified via `getBoundingClientRect()`: icon and text centers now match to sub-pixel precision, where before the text's forced 24px line-box threw them off). The Mission Control nav row also picked up a `rounded-full` pill treatment with a persistent subtle background, on request, so it reads as a distinct entry point rather than a plain list row. Pushed (`2543ad6`) and deployed; verified 200 and the fixed font-size live via computed styles.

**Follow-up in the same pass — Aivory Console's avatar drops its background circle.** On the user's direct instruction: `AgentAvatar.tsx`'s Console branch no longer wraps the brand mark (`/Aivory_Avatar.svg`) in a tinted circle — it renders the bare icon at 82% of the avatar's footprint, matching how the same asset already appears unadorned in the empty-state header ("what can i do for you?"). The now-unused `bg`/`accent` fields were removed from `AgentVisual`/`AGENT_VISUALS` entirely (confirmed no other consumer read them) rather than left dead.

**Exit gate:** ✅ Verified live (dev server, port 9000, seeded session data + a patched `fetch` for one mock approval): an approval card, a "not deployed" warning, and a missed-reply activity item all render through the same `NotificationCard` shape in one rail session, ordered approval → activity (status warnings pinned above both). Switching A → B → back to A no longer resurfaces A as false activity (the exact bug found above). Clicking an activity card opens that thread and the card disappears from the feed. Approve failing (backend unreachable) surfaces its own warn card without disturbing the approval card underneath. `tsc --noEmit` and `eslint` on every touched/new file: 0 errors, including after the `react-hooks/set-state-in-effect` fix in `useThreadActivity.ts` (same documented sync-from-prop pattern used elsewhere in this codebase). Pushed to `Aivory-hub88/avry-user-dashboard main` (`e1a98ec`) and deployed; verified 200 on `/dashboard/console` post-deploy, clean container startup log.

### Phase 11 — minimum-width guard, and finishing the global CSS sweep ✅ Done, 2026-09-02

The Risks section below had said, since Phase 8, that the office should refuse to render below ~1100px rather than degrade — never actually built. Closed that gap, then a live bug report ("masih banyak bug di size font, padding dan styling UI") turned up the first heading-tag fix (Phase 10) had only fixed half the problem.

| File | Change | Status |
|---|---|---|
| `hooks/useMinWidth.ts` (new) | `ResizeObserver` on a ref, not `window.innerWidth` — measures `OfficeShell`'s own box so it stays correct regardless of the global nav sidebar's collapse state. | Done |
| `components/office/OfficeShell.tsx` | Below 1100px, renders a plain "Widen your window" message instead of the three-column grid. | Done |

**Second bug found and fixed — the `main h1`–`h4` fix from Phase 10 was incomplete.** `styles/globals.css` has a *second* global, un-layered prose rule — `main p:not([class*="restTitle"]):not([class*="descriptionText"])` — that overrides font-size/color/margin on any plain `<p>` tag exactly the way `main h1`–`h4` overrides headings. This had been silently breaking `NotificationCard`'s title/subtitle (forced to 16px instead of 13.5px/12.5px) since Phase 10 shipped, plus `MissionControl`'s title, the new min-width guard's copy, and the unrelated Connectors modal — none of it caught by the Phase 10 verification pass because that pass checked heading tags, not paragraph tags. Swept every remaining `<p>` in the office + console surface to `<span>`/`<div>` (confirmed via `getComputedStyle()` post-fix: 13.5px/12.5px, not 16px). Also confirmed (but did not need to fix) a *third* trap in the same stylesheet: any element whose className contains the substring `"title"` or `"heading"` gets `font-family`/`font-weight` forced `!important` — none of this project's own classNames collide with it, but it's worth knowing about before naming a class in this app again.

**Design correction, same pass — rebuilt `NotificationCard` against an actual macOS/iPadOS Notification Centre screenshot** (the user's own device, not general recollection). Concrete findings applied: the card surface is *always* the same neutral dark regardless of app/kind — colour lives on the icon, never a tinted card background (the previous warn-tone card had both a tinted bg and a coloured left border; both removed, tone now only colours the icon); the icon is a rounded square ("squircle"), not a circle; title and timestamp share one line while the secondary line runs full-width below it; and an actions row gets a hairline divider and spans the full card width rather than indenting under the text column, matching how Keep.../Turn Off sit under Apple's own notifications.

**Exit gate:** ✅ Verified live — office refuses to render at 800px-equivalent container width (measured, not assumed) and renders normally at 1440px; every text node previously forced to 16px now measures its intended size via `getComputedStyle()` (rail title 13.5px/600, subtitle 12.5px/400, Mission Control title 28px/300, approval card unaffected). `tsc --noEmit` and `eslint` on every touched file: 0 errors. Pushed (`bbae163`, guard itself `7a8bdcf`) and deployed; verified 200 post-deploy both times.

### Phase 12 — White-Box Memory ✅ Done, 2026-09-02

The one item from the LobeHub research (see the course correction) that genuinely needed backend work rather than a client-side reframe — a real cross-repo feature (Cerveau gateway + avry-backend + this dashboard), not a Phase-9/10/11-style "ringan" addition. Full write-up, including the tenant-scoping bug fix, the live CI→release→binary-swap deploy, and a real WIP-Discord-code deploy hazard caught and avoided on avry-backend, lives in `docs/CERVEAU-STATUS.md`'s 2026-09-02 entry rather than duplicated here. Dashboard-side summary: a "brain" icon in `AgentRail`'s header opens `MemoryModal` (new), listing the open agent's memory entries with inline edit/delete via `lib/agentMemory.ts` → avry-backend's new `/api/v1/agent-memory` → Cerveau's tenant-scoped `/webhook/memory`. All three layers pushed and deployed; live-verified.

## Risks

- **Deleting `useConversationHistory` looks destructive in a diff.** It isn't — the list is provably always empty (no write path exists). Worth a note in the commit message.
- **Sessions predating `agentType`.** Must land under the Generalist, not vanish from the left column — a migration read, not a write, safe to ship and roll back.
- **The rename is display-only.** "Sales & Leads Agent" is a label; `agent_type` stays `leads_qualifier` everywhere (storage, routing, approvals). Changing the id would orphan deployed bindings.
- **Desktop only.** This product is not built or verified for mobile ([user-dashboard-local-preview memory]); a four-column office is the strongest possible statement of that. ~~Below ~1100px the office should refuse to render rather than degrade.~~ Done — see Phase 11.
- **Client-derived `activity` notifications aren't durable.** Deriving them from a localStorage "last seen" timestamp (Phase 10) means they don't survive a cleared browser or a second device — acceptable under the ringan constraint for v1, but it means Mission Control's "last activity" is a convenience signal, not an audit trail. If that durability is ever actually needed, the fix is a backend event log (see below), not a client patch.

## Deliberately not in scope

- Agent configuration stays on `/agents`. Folding create/edit forms into the office is a separate project; the gear icon in the chat header can deep-link there later.
- No backend change, Phases 0–8 or 9–10. Every field Mission Control, the rail, or the agent column need (`_agent_type`, `_gateway_base`, deployments, tool scope, session timestamps) is already returned by endpoints in use today, or derived client-side from them.
- "Running now" starts read-only. Cancelling an execution from the rail is out of scope for this pass.
- **A durable, cross-device notification/event log (backend table, websocket push).** Phase 10 is entirely client-derived by design — see [Course correction](#course-correction--september-1-2026). Revisit only if real usage shows the client-only version misses signals that matter (e.g., an agent completes a task while no browser tab is open) — not speculatively ahead of that.
