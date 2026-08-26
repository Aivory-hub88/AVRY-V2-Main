# Cerveau n8n Orchestration Plan — Cross-System Scenarios + Email Provider Choice

**Status:** in progress, paused 2026-08-23 — backend infra for invoice-approval flow fully live and E2E-verified; dashboard UI + Slack notifier remain
**Created:** 2026-08-23

## Progress as of pause (2026-08-23)

**Done, live, E2E-verified in production:**
- `GET /webhook/approvals` (new, tenant-scoped, `X-Webhook-Secret` auth) added to Cerveau alongside the existing resolve endpoint — commit `cbd846cb`, both instances.
- Both Cerveau instances now bind `0.0.0.0` instead of `127.0.0.1` (systemd `--host` flag only, no code change), reachable from Docker containers via the bridge gateway (`172.17.0.1`) — confirmed still blocked from the public internet (ufw allowlists only `172.16.0.0/12` + known host IPs, verified via a real external connection attempt that timed out).
- `avry-backend`'s `agent_approvals.py` rewritten (the original draft called a route that was never registered, `/api/approvals`, and used the wrong tenant_id separator — both caught before ever being exercised) and wired into `main.py`. Missing `httpx` dependency found and added to `requirements.txt` (a latent gap — two other files already imported it with no pin).
- **Full real end-to-end proof**: triggered a genuine agent tool call → real F-1 `Pending` row created → listed via the new avry-backend proxy from inside its Docker container → resolved (denied) via the same path → Cerveau's durable-resume produced the agent's own follow-up reply automatically → row confirmed gone from the pending list. Not simulated — every step used the real production path.

**Phase A shipped 2026-08-24** — `/approvals` page (list + Approve/Deny), sidebar nav entry with a live polled pending-count badge, `lib/agentApprovals.ts` mirroring `agentToolScope.ts`'s exact shape. `avry-user-dashboard` commit `c0cfb32`, built and deployed; JS bundle confirmed to contain the real page copy in a served chunk (same verification bar as every other frontend change this project has shipped — full authenticated-browser click-through still not done, disclosed).

**Slack notifier shipped 2026-08-24** — `/usr/local/bin/approval-slack-notify.py` + `approval-slack-notify.timer` (every 3 min), mirrors `composio-connection-sync.py`'s pattern exactly. Real bug caught and fixed during testing: the first version conflated "seen this poll" with "successfully notified" in its state file, so a row that failed to notify (no Slack channel connected yet, a transient API error) would have been silently treated as done and never retried — fixed to only persist ids that were *either* previously-notified-and-still-pending *or* newly-notified-this-run. Full lifecycle live-verified: real pending approval created → detected (`pending=1`) → notify attempt correctly retried across multiple polls while no Slack channel existed for the test tenant → resolved → correctly dropped from state (`pending=0`) on the next poll. Timer enabled and running.

**This phase (Cerveau approval-flow backend + dashboard + notifier) is now fully done.**

**Remaining for the overall orchestration plan:** the other three scenarios (lead capture, support escalation, task handoff) from the original scope below — not started.

---
**Related:** `CERVEAU-TOOLKIT-EXPANSION-PLAN.md` (the Gmail/Calendar/Trello/Linear toolkits these scenarios orchestrate), `CERVEAU-ERP-INTEGRATION-PLAN.md` (F-1 approval-gate semantics this plan reuses, not replaces), `CERVEAU-ERP-SCALING-PLAN.md` §Phase 0 (the eval harness — the natural test target for these scenarios once both exist)

## Goal

Two scoped pieces, decided in conversation after rejecting a broader "one n8n workflow per single tool action" approach (that doesn't reduce agent hallucination — the LLM still decides *which* tool and *what arguments* upstream of any execution wrapper; it only adds a network hop and a new failure point per toolkit):

1. **n8n as deterministic orchestration for four genuinely multi-step, cross-system business flows** — lead capture, support escalation, task handoff, invoice approval — where explicit step sequencing and data-threading in a workflow definition really does reduce error versus an LLM re-deriving the sequence turn by turn.
2. **Email provider choice for the invoice-approval flow's confirmation step**: Gmail (already wired), plus Outlook and tenant-supplied SMTP.

## Architecture decision — n8n calls Composio directly, never its own OAuth

**The single most important design call in this plan.** n8n has its own native HubSpot/Slack/Gmail/etc. nodes with their own OAuth credential store — **do not use them**. If a scenario's n8n workflow authenticated via n8n-native credentials, every tenant would need to connect HubSpot/Slack/Gmail *twice*: once through the Aivory dashboard (Composio, already wired, already gates via `apply_toolkit_connection_gate`) and again through n8n's own credential UI (which tenants have no access to and no reason to understand). Instead, every external call an orchestration workflow makes goes through an **HTTP Request node hitting `https://backend.composio.dev/api/v3/tools/execute/<SLUG>`** with `user_id: <tenant_id>`, exactly the same `entity_id` resolution Cerveau's own MCP transport already uses. One connected account, one place tenants manage it, reused everywhere.

## How Cerveau triggers a scenario — extend the existing native bridge, not a new mechanism

Confirmed by reading `aivory-native-bridge/server.mjs` and `agents/leads-qualifier.mjs` on the VPS: `customer_service`/`leads_qualifier`/`finance_invoice_ops`/`office_assistant` each already have exactly **one** n8n webhook (`N8N_WEBHOOK_<AGENT_TYPE>`) that every tool ("action") in that agent's native module forwards to — n8n's own workflow branches internally on the `action` field. This is precisely the shape a new orchestration trigger needs.

**Plan: add one new tool per scenario to the relevant existing native module**, forwarding to the *same* existing webhook, with n8n adding a new branch for the new `action`:

| Scenario | Native module | New tool/action | Reuses existing bundle? |
|---|---|---|---|
| Lead capture → notify → follow-up | `leads-qualifier.mjs` | `trigger_lead_capture_flow` | Yes — `aivory-native-leads-qualifier` already wired to `leads_qualifier`/`autonomous` |
| Support escalation | `customer-service.mjs` | `trigger_support_escalation` | Yes — `aivory-native-customer-service` |
| Task handoff | `office-assistant.mjs` | `trigger_task_handoff` | Yes — `aivory-native-office-assistant` |
| Invoice approval | `finance-invoice-ops.mjs` | `trigger_invoice_approval_flow` | Yes — `aivory-native-finance-invoice-ops` |

**Consequence**: zero new MCP servers, zero new bundles, zero new `agent_type_mcp_bundles` entries, zero new Cerveau config wiring. This is strictly cheaper than the toolkit-expansion round — the only new surface is 4 tool definitions (Node) + 4 n8n workflow branches + `tool_risk_tiers` entries for the 4 new tool names.

## Risk tiering — a real divergence from how native tools are tiered today, on purpose

The existing native tools (`create_lead`, `create_ticket`, `create_invoice`, …) all currently sit in `risk_profiles.agent_analyst_brain.auto_approve` — zero gating, because they only ever write to Aivory's own internal Postgres with no external real-world side effect. **The four new trigger actions are different in kind**: they cause real external side effects (a real HubSpot deal, a real Slack message, a real email sent). They must **not** inherit the native module's blanket-trusted treatment.

Proposal: all 4 trigger actions classified `irreversible` (hard floor, `always_ask` — matches Gmail's own send/delete tier from the toolkit expansion round). **One approval gate per scenario invocation, not per internal step** — once a human approves "run the lead-capture flow for this lead," the entire n8n sequence (HubSpot write → Slack message → Gmail send) executes as one atomic block. Cerveau's F-1 approval answers *whether the agent may start this flow*; it does not — and structurally cannot, without new work — pause mid-n8n-execution for a second approval on an individual step inside the workflow.

**This is exactly why invoice approval's "approval via Slack" is a different mechanism, not a second F-1 gate**: that's a human-to-human business checkpoint *inside* the workflow (n8n's own wait-for-webhook / Slack interactive-message pattern — post an "Approve this $4,200 invoice?" message with buttons, suspend the workflow run until someone clicks), not Cerveau asking permission to act. Both exist in the same flow, at different layers, for different reasons — worth being explicit about so nobody conflates them later.

## Per-scenario design

### 1. Lead capture → notify → follow-up (`trigger_lead_capture_flow`)

Input: `{lead_name, company, email, deal_value?, notes?}`. n8n steps: `HUBSPOT_CREATE_CONTACT` → `HUBSPOT_CREATE_DEAL` (if `deal_value` given) → `SLACK_SEND_MESSAGE` to a configured sales channel → `GMAIL_SEND_EMAIL` follow-up (templated). All via Composio HTTP calls with the tenant's `user_id`.

**Open question**: which Slack channel? Needs either a per-tenant config field (dashboard setting) or a sensible default the agent can be told to ask about — not assumed here.

### 2. Support escalation (`trigger_support_escalation`)

Input: `{subject, description, priority}`. n8n steps: `ZENDESK_CREATE_ZENDESK_TICKET` → `SLACK_SEND_MESSAGE`, channel selection branches on `priority` (e.g. `high`/`urgent` → an escalation channel, else the general support channel).

**Open question**: the escalation-channel-vs-general-channel split needs real channel names/ids from the tenant — same config-field need as #1.

### 3. Task handoff (`trigger_task_handoff`)

Input: `{title, description, assignee, tracker: "trello"|"linear"|"asana", due_date?}`. n8n steps: create card/issue/task in the chosen tracker (`TRELLO_ADD_CARDS` / `LINEAR_CREATE_LINEAR_ISSUE` / `ASANA_CREATE_A_TASK`, branch on `tracker`) → `SLACK_SEND_MESSAGE` to the assignee → `GOOGLECALENDAR_CREATE_EVENT` to block time.

**Open question, not assumed**: whose calendar gets blocked? Today's Composio connection is per-*tenant* (one business account), not per-individual-team-member — so "block the assignee's calendar" only works cleanly if the assignee *is* the connected calendar's owner (e.g. a solo operator), not a multi-person team. Needs a real product decision: skip the calendar step when the assignee isn't the tenant owner, or scope this to solo-operator tenants only for v1.

### 4. Invoice approval flow — **redesigned 2026-08-23, not a new orchestration trigger**

**Original design rejected mid-build.** The first draft had n8n call `ERPNEXT_MAKE_SALES_INVOICE` directly via Composio, bypassing Cerveau's own F-1 approval gate entirely (F-1 lives inside Cerveau's runtime, not something Composio's raw REST API enforces) — that would stand up a second, parallel approval mechanism next to the one already built and live-verified today (`CERVEAU-ERP-INTEGRATION-PLAN.md`, `CERVEAU-APPROVAL-UX-PLAN.md` Phase A). Real Slack button interactivity was also a dead end for v1: true clickable approve/deny requires the Slack App's own Interactivity Request URL, and Composio — not Aivory — owns that OAuth app registration.

**Corrected design: n8n is a notifier on top of the existing F-1 pending-approval store, nothing more.** Invoice creation stays exactly as it is today — a normal Cerveau agent tool call, gated by F-1, landing in the same pending-approval store the dashboard's Approvals UI already reads (`CERVEAU-APPROVAL-UX-PLAN.md` Phase A, live). What was actually missing is Phase B of that same plan — a push notification for a pending approval — except Slack, not Telegram as originally sketched.

- **n8n workflow**: Cron trigger (poll interval TBD, e.g. every 2 min) → `GET /admin/approvals?status=pending` on Cerveau's gateway (`crates/zeroclaw-gateway/src/api_approvals.rs::handle_list_approvals` — confirmed this authorizes for free from a loopback caller, no token needed, per `admin_reload_gate`) → diff against previously-seen approval `id`s (n8n's own static data, or a tiny state table) → for each new row, `SLACK_SEND_MESSAGE` via Composio: tool name + arguments summary + a link to the dashboard's Approvals page, using the row's `principal` field to resolve which tenant/channel.
- **No email step in this workflow at all.** Once approved via the dashboard (existing durable-resume path, patch 0028), Cerveau's own agent turn continues and can send the confirmation itself as a normal next step — n8n's job ends at "tell a human an approval is waiting."
- **Networking to verify before building**: `api_approvals.rs`'s loopback allowance is IP-based: n8n runs in a Docker container, Cerveau runs as a native systemd process on the host — `127.0.0.1` inside the n8n container does **not** reach the host's loopback by default. Needs either `host.docker.internal`, the Docker bridge gateway IP, or `network_mode: host` for this specific call — confirm which before assuming the free loopback auth path works as designed.
- **Slack channel default for the poller**: unlike the other three scenarios, there's no agent conversation to ask "which channel?" in — a background poller needs a deterministic default. v1: post to a channel literally named `approvals` if one exists in the tenant's workspace (via `SLACK_LIST_ALL_CHANNELS`), else the first channel returned. Revisit if this proves wrong in practice.

## Email provider choice — Gmail done, Outlook is cheap, SMTP is genuinely new work

- **Gmail**: already live (`CERVEAU-TOOLKIT-EXPANSION-PLAN.md`), reused as-is.
- **Outlook**: confirmed live on Composio's catalog (`GET /api/v3/tools?toolkit_slug=outlook` returns real tools). Same pattern as every toolkit wired this session — catalog curation (send + read at minimum), MCP-server-creation trial, auth-config check (likely OAuth2, needs live confirmation), config wiring if exposed as a direct Cerveau tool too (optional — for this plan it only needs to be callable from n8n via Composio's execute API, which needs no Cerveau-side config at all, just a connected account). **Cheap, proven pattern, no new design.**
- **SMTP (bring-your-own)**: **genuinely new, no reusable pattern in this codebase.** Composio has no SMTP toolkit — SMTP isn't OAuth-shaped, it's raw host/port/user/password credentials. Needs: (a) a small dashboard form (SMTP host, port, username, password, from-address, TLS mode) alongside the existing ERPNext-style API-key form; (b) encrypted storage — reuse the exact AES-256-GCM primitive `app/services/mcp_server_encryption.py` already uses for `tenant_custom_mcp_servers`, either a new column there or a small new table; (c) n8n's workflow fetches the tenant's decrypted SMTP credentials from a new authenticated avry-backend endpoint at run time (mirrors how `tenant_custom_mcp_servers` rows are read today — decrypt only when actually needed, never handed to n8n's own credential store persistently) and uses n8n's native SMTP node for that one send. This is the highest-effort single item in this whole plan — flagged plainly rather than folded silently into "email provider expansion" as if it were free.

**Provider selection UX, not decided here**: is the provider chosen once per tenant (a dashboard setting: "send invoice confirmations via ___") or per-invoice (a field the agent asks about)? Recommendation: per-tenant default, since re-asking per invoice is exactly the kind of friction the earlier "must work via plain prompts, not config-per-action" instruction was about — but this is a real product call.

## Resource-frugality constraints (binding, unchanged)

- n8n is already running on `tencent-vps` (port 5678) — this plan adds workflows to an existing process, not a new one.
- Zero new Cerveau config wiring for the 4 trigger tools (native bridge already covers the transport).
- SMTP credential storage reuses the existing encryption primitive; no new crypto to design.
- CI-verify anything compiled (the native bridge is plain Node, no compile step — n8n workflows are JSON, no compile step either — this plan is unusually light on the "never build on the VPS" concern that dominated the Rust-side work today).

## Decisions (2026-08-23, adopted from this plan's own recommendations — user approved proceeding on this basis)

1. **Slack channel**: no new dashboard setting. The trigger tool's schema requires a `channel` argument; the agent resolves it conversationally (asks the user if not already clear from context) or via `SLACK_LIST_ALL_CHANNELS` name-matching — zero new UI, consistent with the standing "plain-language, not config-per-action" instruction from the toolkit-expansion round.
2. **Task-handoff calendar scoping**: restricted to solo-operator tenants for v1 — the calendar-block step only fires when the assignee is the tenant's own connected identity; skipped otherwise (not silently attempted against a calendar the agent doesn't actually have).
3. **Email provider**: no new settings field. Resolved at send-time by which provider the tenant has connected — Outlook if connected, else Gmail; if both, default Gmail. Same "read the connection gate, don't ask for redundant config" principle as #1.
4. **SMTP deferred, not built this round.** Ship Gmail + Outlook only for v1 — SMTP is disproportionate net-new scope (a whole new encrypted-credential feature) for a bonus provider option; fast-follow if real demand shows up.
5. **Sequencing: invoice approval flow first**, as a real end-to-end proof (Gmail, ERPNext, Slack all already live — zero new toolkit dependencies), then the other three once that path is proven live.

## Success criteria

Each scenario triggerable by a single natural-language request to the right agent type, gated through F-1 exactly once per invocation (not per internal step), executing deterministically via n8n with zero LLM involvement in the actual sequencing; invoice confirmations sendable via at least Gmail and Outlook (SMTP scope pending decision #4); no duplicate OAuth connections anywhere (n8n never touches its own credential store for tenant-facing integrations); zero new VPS processes.
