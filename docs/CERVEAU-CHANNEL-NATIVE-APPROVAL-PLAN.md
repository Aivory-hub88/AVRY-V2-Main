# Cerveau Channel-Native Approval Plan

**Status:** Odoo Discuss (Tier 2) shipped 2026-08-24; Telegram/Discord (Tier 1) and Slack-native awareness not started
**Created:** 2026-08-24
**Related:** `CERVEAU-APPROVAL-UX-PLAN.md` (Phase A/B — dashboard page + Slack notifier, both live; this plan is the "ask right where the agent is deployed" alternative/complement to Phase B), `CERVEAU-N8N-ORCHESTRATION-PLAN.md` (where the Slack-OAuth-ownership constraint below was first found)

## Shipped: Odoo Discuss notification (2026-08-24)

Extended the existing `approval-slack-notify.py` systemd timer (not a new process) with an Odoo Discuss path, run alongside the Slack one every 3 minutes: for any tenant with a `verified` custom MCP server whose name contains "odoo" (`product.tenant_custom_mcp_servers`), it calls avry-backend's internal endpoint for the decrypted server URL/auth, speaks MCP directly to the tenant's `erpipe-org/mcp-odoo` bridge, finds a Discuss channel (prefers one named "approvals", else the first), and posts a notice via `chatter_post`'s real preview → confirm write gate — Tier 2 as scoped below, notification-only with a link back to the dashboard, no attempt at parsing a Discuss reply into a decision.

State tracking is now per-channel (`{approval_id}:slack` / `{approval_id}:discuss`), not per-approval, so one channel failing (no Slack workspace connected, no Odoo server registered) doesn't block or duplicate the other.

**Real bug found and fixed along the way**: the only existing Odoo custom-MCP-server registration (`product.tenant_custom_mcp_servers`, id `a4ac9962-...`) was under `user_id='aivory-internal'` — a synthetic id from an earlier live-proof session with no matching `product.agent_profiles` row. That meant it was invisible to every real polling/dashboard path keyed off `agent_profiles` (this notifier included) and to the real dashboard's own tenant-scoped queries. Re-pointed the row to the user's actual superadmin account (`user_d0985ab099ef142a`, `irfan.reichmann@aivory.id`, `agent_type=autonomous`, which already has a `cerveau`-engine profile) — same verified row, same 41 tools, now actually reachable.

**Full live proof, not simulated**: triggered a real Cerveau turn asking the agent to post to Odoo Discuss, which correctly parked a genuine F-1 `irreversible` pending approval (`tenant_odoo__chatter_post`) rather than executing it. Ran the notifier — it posted a real notice into the Odoo "general" Discuss channel, independently confirmed by querying `mail.message` directly against the live Odoo instance (message id 19, correct body/timestamp). Ran the notifier again — no duplicate (`new_discuss=0`, idempotency confirmed). Denied the approval via the real `/webhook/approvals/{id}/resolve` endpoint, ran the notifier once more — state file correctly converged to empty.

## Goal

Instead of (or in addition to) approving pending tool-call writes via the Aivory dashboard, ask for approval directly in whichever channel the user has deployed that Cerveau agent to — Telegram, Discord, WhatsApp, Odoo Discuss, etc.

## What's actually there — checked, not assumed

Cerveau has **two separate, unconnected approval mechanisms**:

1. **F-1** (`PendingApprovalsStore`, `crates/zeroclaw-runtime/src/control_plane/pending_approvals.rs`) — the one every proof this session used (ERPNext, the toolkit expansion, Odoo). Its `PendingApproval` struct has **no channel-routing field at all** — `id`, `principal`, `tool_name`, `arguments`, `risk_tier`, `status`, `tenant_id`, `agent_type`, `session_id`, `origin_message`, nothing about *where* to notify. Resolution today: the same `/webhook` response, or `/webhook/approvals/{id}/resolve` (what the dashboard's Approvals page and the Slack notifier both call).
2. **The SOP approval broker** (`crates/zeroclaw-runtime/src/sop/approval/{broker,channel_route}.rs`, upstream "EPIC G") — real, complete channel-delivery infrastructure already built: `ChannelRouteAdapter` sends a notice to any configured channel (`channel_key:recipient` routes, e.g. `discord.ops:123...`), for a **different** subsystem — Standard Operating Procedures (structured multi-step workflows), not ad-hoc tool-call gating. Its own doc comment is explicit that resolution still happens "through the normal HTTP/WS/tool surfaces" — it delivers a *notice*, it doesn't itself turn a channel reply into a resolution.

**Consequence**: this is real new work on F-1, not a rewire of something already built for it — though the SOP broker's design (route-string parsing, fire-and-forget delivery, `Channel` trait) is a genuinely good pattern to borrow rather than invent from scratch.

## Per-channel feasibility — grounded in what this session already found, not assumed uniform

Not every channel can support the same UX. Two real, different tiers:

**Tier 1 — genuinely interactive (a reply/button in the channel can resolve the approval):**
- **Telegram**: `vps-bridge` already owns per-user Telegram wiring (bot, chat mapping, callback infra) — `CERVEAU-APPROVAL-UX-PLAN.md`'s own Phase B already sketched this exact path, just never built. Best first candidate.
- **Discord**: Cerveau's fork has native slash-command support already wired (`zeroclaw-channels/src/discord/mod.rs`, `DiscordSlashCommandResolver`) — a real, working interactivity primitive Aivory already owns (unlike the next one).

**Tier 2 — notification-only is the honest ceiling, checked not guessed:**
- **Slack**: found this exact wall already, building the n8n orchestration plan — **Composio owns the Slack OAuth app registration**, not Aivory, so Aivory has no access to configure a Slack Interactivity Request URL. Real buttons aren't available; a message linking back to the dashboard (what the Slack notifier already does) is the real ceiling here, not a temporary gap.
- **Odoo Discuss**: proved live today that Cerveau can *post into* a Discuss channel (`chatter_post` on `discuss.channel`) — but resolving *from* a Discuss reply would mean parsing free-text intent from an incoming message, not a button click. Fragile compared to Telegram/Discord; a link-back-to-dashboard notice is the safer default here too.
- **WhatsApp**: channel exists in Cerveau's config surface; whether its button/quick-reply primitives are wired deep enough for real interactive resolution is unchecked — needs the same live-verification discipline as everything else before assuming yes.

## Proposed design

1. **Add a routing field to `PendingApproval`** (new nullable column, e.g. `approval_route: Option<String>` — same `channel_key:recipient` shape the SOP broker already uses, for consistency) — set when a tenant turn originates from (or is otherwise associated with) a Tier-1 channel.
2. **On F-1 park** (a tool call becomes `Pending`), if `approval_route` is set, fire a notice to that channel — reusing `ChannelRouteAdapter`'s delivery shape rather than re-inventing it, adapted to read from `PendingApprovalsStore` instead of the SOP broker's own gate state.
3. **Resolution path per tier**:
   - Tier 1 (Telegram/Discord): the channel's own reply/button/interaction triggers a call into `/webhook/approvals/{id}/resolve` — same endpoint everything already uses, just a new caller.
   - Tier 2 (Slack/Discuss/anything else): notice includes a link to the dashboard Approvals page — exactly what's already live, no new resolution mechanism needed.
4. **The dashboard Approvals page and Slack notifier are not replaced** — they stay the universal fallback for every channel, including Tier 1 ones (someone not near Telegram right now can still resolve from the dashboard).

## Open decisions for the user

1. **Scope for v1**: Telegram only (closest to already-planned, `vps-bridge` infra exists), or Telegram + Discord together?
2. **How `approval_route` gets set on a row** — inferred automatically from which channel originated the tenant turn (if determinable), or an explicit per-agent dashboard setting ("notify approvals to my Telegram")? These can give different answers for a multi-channel-deployed agent.
3. **Confirm the Tier 2 channels (Slack, Discuss, WhatsApp pending its own check) stay notification-only** — not attempt to force interactive resolution onto channels that structurally can't do it cleanly.

## Success criteria

A tenant using their agent through Telegram gets an inline-button approval prompt in that same chat for a pending write, resolves it there, and the same durable-resume behavior already proven for dashboard/Slack-linked resolution fires — without weakening the F-1 hard floor or bypassing the dashboard as a fallback for every other channel.
