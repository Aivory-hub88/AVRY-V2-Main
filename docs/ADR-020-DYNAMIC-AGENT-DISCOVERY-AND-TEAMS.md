# ADR-020 — Dynamic agent discovery and Teams: the user's deployed/selected agents define who talks to whom

**Status:** Proposed 2026-09-29. **P1 and P2 shipped and deployed 2026-09-29** (avry-backend#7/#8 endpoint, AVRY-V2-Main#12 bridge header, AVRY-Cerveau#15 delegate scoping, Cerveau `f802b2c`); P3+ not started. Live end-to-end check (a real turn delegating to an undeployed agent) still pending. Every "today" claim below was read on 2026-09-29 from live `config.toml` on `:3100`, `AVRY-Cerveau@7daab3a8a`, and `avry-user-dashboard` main, i.e. before P1/P2.
**Related:** ADR-008 (delegation engine), ADR-014 (envelope/ledger, `context_id`), ADR-019 (Team Space rooms).

## 1. Decision

Users do not configure agent-to-agent wiring. They **pick agents and deploy** them; Aivory derives the roster.

- **Active agent** = union of (A) any agent with a channel deployment (Telegram binding, Slack installation, API key, later WhatsApp/Odoo) and (B) any agent the user explicitly selects in a **Room**. Both count; no extra setup step.
- **"Room" is a user-dashboard surface, and there are two:** the **AI Console** Room (Mission Control, `@mention` of agents, Direct/Room toggle) and the **Workspace** (Team Space threads and docs, where agents are invited per space/doc). Both are first-class Team channels (§3.3), same as Telegram/Slack.
- **Team** = a named set of agents owned by one user/tenant, attachable to one or more channels (a Telegram group, a Slack channel, an Odoo widget, a WhatsApp group, an API key). Members of a Team discover each other automatically.
- Discovery is **per turn**, from the tenant's active set. Agents outside it are invisible and undelegatable.

### 1.1 Decisions (owner, 2026-09-29)

1. **A Team belongs to exactly one user** (the leader). No cross-user agents; `teams` carries the leader's `user_id` and there is no sharing model.
2. **Teams are `isolated` by default.** A turn arriving on a channel bound to a Team may delegate only within that Team's members. Channels not bound to a Team (e.g. a 1:1 chat with one agent) use the tenant-wide active set (P2 behaviour).
3. **Workspace agents belong to the leader.** In a Workspace, the leader is the workspace owner (`workspace_members.role = 'owner'`). Other members are humans who *interact with* the leader's deployed agents; they do not deploy their own there.
4. **Agent turns in a Workspace run in the leader's tenant**, not the requesting member's. The member is the *requester*, recorded for attribution and audit, and still needs `canWrite` on the space.
5. **Credits for those turns are billed to the leader.**

**Gap this exposes (verified):** `lib/spaceAgentRun.ts:134` forwards the acting user's own JWT to `/api/v1/telegram/agent-chat`, so today a member's `@Lex` runs in the *member's* tenant (their memory, their credits/tier, their deployments). That contradicts decisions 3-5 and must change in P3: the dashboard calls a backend mode that acts on behalf of the leader using a service credential plus `acting_as` (leader) and `requested_by` (member), which the backend verifies against `workspace_members` (member must belong to the workspace; `acting_as` must be that workspace's owner; a caller cannot name an arbitrary `acting_as`). The member-JWT path must not be usable for Workspace agent turns.

### 1.2 Agents hand work to each other (owner decision, 2026-10-03)

Groups and Workspaces exist so agents actually collaborate, so an agent's reply that writes `@Name` now hands work to that teammate, who answers **in their own message** (not as text inside the caller's). This replaces ADR-019's "only humans trigger agent-to-agent chains" and ADR-008's depth-1 rule for Team Space tasks.

- **Rules** (`lib/agentHandoff.ts`, shared by both surfaces): only a deliberate `@Name` (bare names, code, `@all/@here/@everyone` never count); only teammates in the room (the picked Team in the Console, invited agents in a Space); never self. A chain is bounded: depth ≤ 2 hops after the human message, 8 turns per chain, 2 turns per agent (stops ping-pong), no agent queued twice. A parked approval ends that branch; Stop aborts the chain. A roll call forbids `@`.
- **Console Room:** a turn queue in `handleSendRoom`; the receiver's payload carries `<handoff from= hop= max=>` and the last-hop rule.
- **Team Space:** `runAgentTask` links the mention, then enqueues and runs a task (`created_by agent:<type>`, `chain_root`, `chain_depth`; `migrations/workspace-agent-handoff.sql`) under the **same user credential**, so acting-as-leader (§1.1), credits billed to the leader and the approval gate are unchanged. The execute route still rejects service credentials.
- **Cost:** every handoff is a paid turn on the tenant (the leader's in a Space). The caps above are the budget; they are constants, change them in one place.
- **Not done:** agents still never start a conversation unprompted; every chain starts at a human message. No per-chain credit ceiling beyond the turn cap. Not yet exercised against live Cerveau when this was written.

## 2. Today (verified)

| Fact | Where |
|---|---|
| Delegate roster is a pure function of `Config` (no tenant): `reachable_delegate_target_configs`. Live wiring is global: Aira→5 (`independent`, depth 2), Geno↔4 specialists (`bounded`, depth 1), specialists→Geno only. | `zeroclaw-config/src/schema.rs:4127`, live `config.toml` |
| `delegate` builds its target list from that function. | `zeroclaw-runtime/src/tools/delegate.rs:1301` |
| `TENANT_CONTEXT` is scoped per turn and already read by `delegate.rs`; it carries `tenant_id`, `platform_user_id`, `agent_type`, **no roster**. | `agent/tenant.rs:35,324` |
| vps-bridge fills `X-Tenant-Id` / `X-Agent-Type`. | `backend/vps-bridge/telegram-agent.js:845,1013` |
| Dashboard "deployments" = Telegram bindings + Slack installations + agent API keys. WhatsApp and Odoo have **no deploy route** in the backend yet. | `lib/agentChat.ts:75`, `app/routes/{telegram,slack,agent_api_keys}.py` |
| Workspace already records invited agents per doc: `dashboard.workspace_agent_acl(doc_id, agent_type, role)`; Team Space tasks are keyed by `space_id` (`workspace_agent_tasks`). Console Room state (which agents were @mentioned, floor holder) lives client-side in the dashboard, not in a table. | `migrations/workspace-agent-acl.sql`, `workspace-space-agent-tasks.sql` |
| Team Space agents act only when `@`-mentioned; proactive posts never mention agents (loop guard). | ADR-019 |

## 3. Design

### 3.1 Active set
New backend read model `GET /api/v1/active-agents` (internal, service token): per tenant, `[{agent_type, sources:[telegram|slack|api_key|team|...]}]`. Deployment sources are derived from existing tables; Team membership from the new `teams` tables (§3.3). No new source of truth for deployments.

### 3.2 Delivery to Cerveau
vps-bridge adds `X-Active-Agents: a,b,c` beside `X-Tenant-Id`/`X-Agent-Type` (allow-list of the 6 known types, capped length). The gateway authenticates it the same way as the other two and stores `active_agents` on `TenantContext`.

### 3.3 Teams
```
teams(id, tenant_id, name, created_at)
team_members(team_id, agent_type, PRIMARY KEY(team_id, agent_type))
team_channels(team_id, kind, ref, PRIMARY KEY(team_id, kind, ref))  -- kind: console|workspace|telegram|slack|odoo|whatsapp|api_key
```
A channel message on `team_channels` resolves to the Team; that Team's members are the active set for the turn (isolated by default, §1.1). A Workspace space resolves to the *leader's* Team for that space and the turn runs in the leader's tenant (§1.1). `console` and `workspace` channels need no new deploy route: a Console Room maps to the tenant's Team named in the Room toggle; a Workspace `space_id` maps to a Team whose members are seeded from `workspace_agent_acl` (invited agents), so inviting an agent to a space makes it discoverable to the others in that space with no extra step. The Console Room's client-side state moves to `team_members` when the user saves the group. Channels that do not exist yet (WhatsApp, Odoo) plug in by adding a `kind` and a deploy route; nothing else changes.

### 3.4 Cerveau (Rust, AVRY-Cerveau)
- `TenantContext.active_agents: Option<Vec<String>>`.
- Roster = `reachable_delegate_targets(caller)` ∩ `active_agents` when present; unchanged when absent (**fail-open to today's behaviour**, so an old bridge is safe).
- Apply in both places: `parameters_schema` (what the model sees) and delegate admission (what actually runs). Doing only the first is a prompt-level filter, not a control.
- **Mesh:** allow specialist↔specialist within the active set by treating same-team agents as implicit delegates (`delegate_same_risk_profile`-style rule keyed on `active_agents`). Depth stays 1 for specialists, 2 for Aira.
- **Intro card:** prepend a short "active teammates" block (name, title, one-line specialty from `agent_roster`) to the turn's system context. Text is engine-generated, not user content.

### 3.5 Guardrails (unchanged, restated)
`max_delegation_depth`, per-agent hourly/daily budgets, `context_turn_cap` (ADR-014 P1), loop detector, `velocity_gate`, untrusted framing of peer output. Agents still do not start conversations on their own: a human message or Aira starts every chain. Open-ended agent↔agent chat is a separate, later decision.

## 4. Phasing

1. **P0 — this ADR, review.**
2. **P1 — Backend + bridge:** `active-agents` read model (deployments only), header, tests. No behaviour change until Cerveau reads it.
3. **P2 — Cerveau:** `active_agents` in `TenantContext`, roster intersection in schema + admission, tests incl. absent-header and empty-set cases. CI, rolling release, deploy via the standard swap recipe.
4. **P3 — Teams:** backend `acting_as`/`requested_by` mode for Workspace agent turns (leader tenant, leader-billed; replaces the member-JWT path in `spaceAgentRun.ts`) first, then tables, dashboard "create team, pick agents, attach channels". Console Room and Workspace first (in-dashboard, no external dependency), then Telegram group + Slack channel (routes exist).
5. **P4 — New channels:** WhatsApp, Odoo deploy routes as `team_channels` kinds.
6. **P5 — Mesh + intro card** behind a flag, canary on one tenant, watch delegate cost/loop metrics for a week.

## 5. Open questions

- ~~Cross-user Teams~~ — decided **no** (§1.1).
- ~~`isolated` default~~ — decided **on** (§1.1).
- Workspace credit billing — decided **leader** (§1.1). Open: what happens when the leader is out of credits (members' agent calls should fail with a clear message, not fall back to member credits).
- Workspace with several leaders/owners: pick the doc/space owner as `acting_as`; confirm behaviour for ownerless (claimable) docs.
- WhatsApp provider (Cloud API vs. via Composio) and Odoo widget auth are their own ADRs.
- Confirm live `chief_of_staff` mode: live config has `independent`, `services/cerveau/ROOM-DELEGATES.md` says `bounded`. Doc is stale or config drifted.

## 6. Not verified
- How the Console Room persists its agent set across sessions (believed client-only; to confirm in `components/office/*` and `useChat`).
- Whether the gateway rejects unknown headers or needs an allow-list entry for `X-Active-Agents`.
- Whether any tool other than `delegate` (e.g. `send_message_to_peer`, `peer_groups.room_team`) also needs the same intersection.
