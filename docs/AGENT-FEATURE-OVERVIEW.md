# Agent Feature — Overview

**Amended 2026-08-19:** added the Discord deploy channel (§2, §3, §7) and
corrected the stale `DeployModal` references from the original write-up
below — Deploy is now a tab inside `CustomizeAgentModal`, not a separate
modal/button. Everything else in this doc is unchanged from its original
2026-08-05 write-up and not re-verified as part of this pass.

**Status:** Shipped and live in production (part of the 106-commit backlog
that reached the VPS on 2026-08-05 alongside the Deep Diagnostic Indonesian
rollout — see `[[DEEP-DIAGNOSTIC-INDONESIAN-LANGUAGE-PLANNING]]` §7). Built
across commits `a8a5c1a` → `40420fe` (2026-06 through 2026-07-14) on
`Aivory-hub88/avry-user-dashboard main`, was already on `main` well before
this deploy — this doc exists because the VPS itself had never been
rebuilt against it until now.
**Repo:** `Aivory-hub88/avry-user-dashboard`
**Source:** written after live-VPS deployment surfaced ~103 previously
unshipped commits; this doc captures what's actually in the code, not a
plan.

---

## 0 · Read this first — two unrelated things share the word "agent"

This codebase has **two distinct, non-interoperating "agent" concepts**
that collide on naming and route namespace. Keep them separate when talking
about "the agent feature":

| | **A. Prebuilt deployable agents** | **B. Generic `Agent` CRUD entity** |
|---|---|---|
| Status | ✅ Shipped, working, in daily use | 🔴 Stub/abandoned mid-build |
| Where | `app/agents/page.tsx` | `app/agents/new/page.tsx`, `app/agents/[id]/page.tsx` |
| What | Fixed catalog of 5 chat personas users deploy to Telegram/Slack | A form to define a custom agent (name/model/provider/runtime) for future use in workflow steps |
| Linked? | No navigation connects A and B — they just happen to share `/agents` as a URL prefix | |

Section 1 below is (A) — the real, user-facing feature. (B) is covered in
§6 as a known-broken stub; don't build on it without finishing it first.

## 1 · What is an "agent" (the real feature)

A fixed catalog of **5 predefined chat-agent personas**, defined inline in
`app/agents/page.tsx:95-157` and `lib/agentChat.ts:24-30`
(`PREBUILT_AGENTS`):

1. Autonomous Agent
2. Ticket Ops Agent (was "Customer Service Agent" — renamed to make clear it's internal-facing, not a direct end-customer chatbot)
3. Leads Qualifier Agent
4. Finance & Invoice Ops Agent
5. Office Assistant — **Enterprise plan only**

These are **not** user-authored agents — there's no prompt/tool builder
exposed to end users. What a user *can* customize per-agent is its
**identity**, via `CustomizeAgentModal.tsx`:
`agent_name`, `business_name`, `tone` (multi-select, max 3),
`language_pref` (multi-select), `business_description`, `knowledge`
(freeform FAQ/context), `custom_instructions`, `greeting` — all length-capped
(`CustomizeAgentModal.tsx:17-26`, `FIELD_LIMITS`). Per the modal's own
in-UI copy: *"What the operator saves here is injected into the agent's
system prompt as data (never as instructions)"* — a deliberate
prompt-injection guard, not just a UX note.

Each agent also has a fixed set of **tool capability chips** shown on its
card (e.g. Autonomous Agent: Web search, Leads & tickets, Invoices,
Workflows, Integrations) — real tool execution happens server-side
("bridge-side function calling" per commit `ba242fb`), not in this
frontend.

## 2 · UI surface

- **`app/agents/page.tsx`** — the main page. Renders the 5 prebuilt cards
  plus any admin-published agents pulled from `/dashboard/api/agent-catalog`
  (`page.tsx:911-927`). Each card:
  - **Configure** button → `CustomizeAgentModal.tsx` — one modal, 5 tabs:
    Identity, Connections, Tools, MCP, **Deploy**. (Stale as of an earlier
    version of this doc: there used to be a standalone `DeployModal`
    triggered by its own "Deploy" button, separate from a gear-icon
    "Customize" button — that was merged into this single modal's Deploy
    tab a while back, so settings happen before deploy instead of via a
    competing entry point. `DeploymentRow`/one-click disconnect,
    previously called out at `page.tsx:578-614`, moved with it.)
  - The **Deploy** tab lists five channels, in this order: **Slack** (OAuth
    install), **Telegram** (QR-code pairing), **Discord** (added
    2026-08-19 — see below), **API** (Pro plan+, own app/bot), **WhatsApp**
    (button present; as of this doc's last check it had no `onClick` —
    re-verify before relying on that being fixed).
  - An **Agent Activity** feed of structured actions the agent has taken
    (`page.tsx:810-861`) and a credits-balance pill (`page.tsx:863-889`).

**Discord deploy channel (2026-08-19).** Unlike Telegram (Bot-API webhook,
one shared bot per agent type via a deep-link QR) and Slack (full OAuth
install), Discord pushes messages over a persistent Gateway WebSocket, not
an inbound webhook — so it needed its own always-on connection process,
and there's no deep-link equivalent for auto-redeeming a token. Landed as:
one shared "Aivory Agent" bot across every agent type (deliberate choice,
mirrors the WhatsApp/Kapso "Aivory Agent" decision elsewhere in this
project — not per-tenant bring-your-own-bot); a short human-typed connect
code (`XXXX-XXXX`) redeemed via a `/connect <code>` slash command instead
of a QR scan; binding keyed by `(guild_id, channel_id)`, so a tenant
chooses exactly one channel in their server rather than the bot going
live everywhere it's invited.
- **New:** `backend/avry-backend/app/services/discord_service.py`
  (binding/redeem/message-routing logic, mirrors `telegram_service.py`
  closely), `backend/avry-backend/app/routes/discord.py` (dashboard-facing
  JWT routes + two internal `X-Internal-Token` routes the listener calls:
  `/redeem`, `/message`), `backend/vps-bridge/discord-listener.js` (the
  always-on Gateway process — deliberately thin, translates Discord
  Gateway events into calls against `discord_service.py`'s internal
  routes and relays the reply back; all real logic — credit/tier gating,
  attachment handling, calling the shared agent gateway — stays in
  Python, same shape as Telegram's Bot-API-webhook-into-Python pattern),
  `frontend/avry-user-dashboard/lib/discordDeploy.ts` (dashboard API
  client, mirrors `telegramDeploy.ts`).
- Routes through the **same channel-agnostic agent gateway** every other
  channel uses (`vps-bridge`'s `/telegram/message` — the route name is
  legacy, the handler is generic over `channel`), so Discord gets full
  tool-calling (Composio integrations, n8n workflow triggers, and
  Cerveau's native tools for `engine='cerveau'` tenants) with zero new
  tool-layer code.
- No native Discord buttons/message-components yet for the F-1 pending-
  approval flow (Telegram has inline Approve/Deny buttons) — a pending
  approval surfaces as plain text asking the user to reply "approve" or
  "deny". Real buttons need a second, signature-verified HTTP Interactions
  endpoint (Ed25519, the app's Public Key) in addition to the Gateway
  connection — deferred, not required for v1.
- **Not yet committed to git** — like the rest of this repo's known
  local-vs-VPS divergence (`[[dashboard-local-vps-divergence]]`), these
  files were patched directly onto the live VPS source
  (`/home/ubuntu/avry-user-dashboard`, `/home/ubuntu/AVRY-V2-Main/backend/
  avry-backend`, `/home/ubuntu/AVRY/vps-bridge`) and rebuilt/redeployed
  from there, with `.bak-pre-discord-20260819`-suffixed backups left next
  to each modified file. Worth a proper commit+push once this has run a
  few days without incident, same as the Cerveau `cerveau-main-v0.8.4`
  branch from the same day.
  - An **Agent Activity** feed of structured actions the agent has taken
    (`page.tsx:810-861`) and a credits-balance pill (`page.tsx:863-889`).
- **`components/header/AgentSelector.tsx`** — despite the folder name, this
  is *not* a global header component. It's mounted only in
  `components/console/ConsoleTopBar.tsx:14`, i.e. scoped to the AI Console
  page. It's a dropdown ("replaces the old mode dropdown" —
  `AgentSelector.tsx:3-7`) letting the user pick "Aivory Console" (default
  zeroclaw brain) or one of the 5 prebuilt agents as the chat target.
  Picking an agent sets `agentTarget` in `contexts/ModeContext.tsx`;
  `hooks/useChat.ts:100-116` then routes messages through
  `sendAgentMessage()` (single non-streaming JSON reply — "the agent may
  run tools before answering") instead of the normal SSE zeroclaw stream.
  The Office Assistant option shows a lock icon when the account isn't
  Enterprise, but per `AgentSelector.tsx:5-6` **enforcement is server-side**
  — the lock icon is cosmetic only.

## 3 · Backend integration

The prebuilt-agent feature is a **frontend surface over an existing
backend service**, not new backend logic added by this deploy:

- `lib/agentProfiles.ts`, `lib/agentActions.ts`, `lib/agentChat.ts` all call
  **`avry-backend`** directly (`NEXT_PUBLIC_BACKEND_URL` →
  `https://backend.aivory.id`), via `authedFetch()` in `lib/deployAuth.ts`
  (JWT wrapper with token-refresh-on-401):
  - `GET/PUT/DELETE /api/v1/agent-profiles/{agentType}`, `GET /api/v1/credits`
  - `POST /api/v1/agent-actions`
  - `POST /api/v1/telegram/agent-chat`, `/api/v1/telegram/bindings`,
    `/api/v1/slack/installations`
  - `POST /api/v1/discord/deploy-link`, `GET /api/v1/discord/link-status/
    {code}`, `GET/DELETE /api/v1/discord/bindings*` (dashboard, JWT). Two
    more Discord routes exist but are **not** called from this repo —
    `/api/v1/discord/redeem` and `/api/v1/discord/message` are internal,
    `X-Internal-Token`-gated, called only by `vps-bridge/discord-
    listener.js`.
- This is a **deliberate bypass of the zeroclaw/VPS-bridge path** the rest
  of the Console uses — the default Console chat goes through
  `config.VPS_BRIDGE_URL` → zeroclaw gateway
  (`app/api/console/stream/route.ts:33`, `config/services.ts:22-27`), but
  `AgentSelector`'s agent-chat path hits `avry-backend`'s own
  `/telegram/agent-chat` endpoint instead.
- **Not confirmed from this repo:** whether `avry-backend` internally routes
  agent completions through zeroclaw, a different LLM path, or something
  else — that logic lives outside `avry-user-dashboard`.
- **No relationship found to `workflow_brain`/`analyst_brain` (see
  `[[zeroclaw-mcp-and-agent-routing]]`) or the Cerveau deployable-agent
  runtime project** (`[[deployable-agent-runtime-research]]`) — a full-repo
  grep for those terms returned zero matches. If a relationship exists,
  it's backend-only and not visible from this frontend.

**Best description:** a custom-persona, tool-enabled chat-agent deployment
surface (deploy a fixed persona to Telegram/Slack, customize its identity,
chat with it from the Console) — not a general agent-authoring platform.

## 4 · Data model / persistence

- **No local database, no `migrations/` entries, no `localStorage`** for
  agent profiles, actions, or deployments (verified by grep — none found).
- All persistence (profiles, credits, action log, channel bindings) lives
  server-side in `avry-backend`. This repo is a pure API client.
- The only `localStorage` key in this area is the auth session
  (`SESSION_KEY = 'aivory_auth'`, `lib/deployAuth.ts:16`) — the JWT/refresh
  token, unrelated to agent data itself.

## 5 · Gating

- Page-level: `lib/moduleAccess.ts` registers `agents: '/agents'`
  (`moduleAccess.ts:45`), nav entry in `components/shared/Sidebar.tsx:229`.
  Normal accounts get full access. **Demo accounts do not see `/agents` by
  default** — `DEMO_ALLOWED_NAV_KEYS` (`moduleAccess.ts:26-31`) is
  `['console', 'diagnostics', 'blueprint', 'roadmap']`; an admin must
  explicitly add `'agents'` to a demo account's `allowed_modules`.
- Agent-level: Office Assistant is Enterprise-only
  (`app/agents/page.tsx:145-156`), shown locked elsewhere in the UI but
  **enforced server-side**, not by the frontend.

## 6 · Known issues — read before extending this feature

1. **`app/agents/[id]/page.tsx` calls a route that doesn't exist.** It
   fetches/PATCHes/DELETEs `/api/agents/${id}`, but only
   `app/api/agents/route.ts` exists (list/create — no `[id]` sub-route). This
   page currently fails to load any agent detail. This is part of concept
   (B), the generic CRUD builder — not the shipped prebuilt-agent feature.
2. **Concept (B) is an explicit, self-documented stub.** `types/agents.ts`'s
   header comment: *"Future phases will add: Advanced prompt configuration,
   Tool/capability definitions, Policy enforcement, Execution history
   tracking."* The `new`/`[id]` pages themselves say agents "start in
   'draft' status" and advanced config is "available in upcoming updates."
   Likely stubbed during commit `e4fbcf7` ("implement 7 missing dashboard
   routes, no more 404s") to eliminate a 404 rather than to ship a working
   builder.
3. **WhatsApp deploy option is UI-only** — a rendered button with no click
   handler in `DeployModal` (`app/agents/page.tsx:399-413`).
4. If you're asked to "add agent X" or "let users configure agent tools,"
   clarify first whether the ask is about concept (A) — extending the fixed
   catalog / identity customization (real, working, has a clear pattern to
   follow) — or concept (B) — finishing the generic builder (bigger, needs
   the missing `[id]` API route at minimum, plus real backend support for
   arbitrary agent execution, which may not exist yet in `avry-backend`
   either).

## 7 · Relevant files

- **Feature (A) — prebuilt agents:** `app/agents/page.tsx`,
  `components/agents/CustomizeAgentModal.tsx`,
  `components/header/AgentSelector.tsx`, `lib/agentProfiles.ts`,
  `lib/agentActions.ts`, `lib/agentChat.ts`, `contexts/ModeContext.tsx`,
  `hooks/useChat.ts`, `lib/discordDeploy.ts` (Discord deploy, 2026-08-19)
- **Discord deploy channel, other repos:** `backend/avry-backend/app/
  services/discord_service.py`, `backend/avry-backend/app/routes/
  discord.py`, `backend/vps-bridge/discord-listener.js`
- **Concept (B) — generic CRUD stub:** `types/agents.ts`,
  `app/agents/new/page.tsx`, `app/agents/[id]/page.tsx`,
  `app/api/agents/route.ts`
- **Key commits:** `a8a5c1a` (initial dashboard release), `1b1a85c`
  (Telegram QR deploy), `b1d1994` (Slack OAuth deploy), `ba242fb` (tool
  chips + Activity feed), `c752495` (Office Assistant card), `3503b51`
  (Console agent selector wiring), `40420fe` (identity customization modal),
  `d37560e`, `f675697`, `7cc01a7` (identity-editor polish)
