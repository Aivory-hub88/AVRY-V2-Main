# ADR-007 — One-Click Integration Directory (OAuth) for Known Platforms

**Date:** 2026-08-15
**Status:** §5's fork resolved — **user chose Option A**. Option A built, deployed, and live-verified against production the same day; see `docs/CERVEAU-STATUS.md`'s "ADR-007 Option A" entry for the full account (Composio catalog curation, agent-type/risk-tier decisions, Cerveau config wiring on both instances, and a real end-to-end verification including a genuine negative-path proof through Composio's own API). Option B (the design below, §3-4) stays documented as a real alternative, not built — worth revisiting if a platform Composio doesn't support needs this later.
**Context:** Answers the user's brief: today, connecting an agent to an external system means manually filling in the "Customise Autonomous Agent → MCP" form (Name/URL/Transport/Auth header) — correct for bring-your-own/self-hosted systems, heavy friction for platforms Aivory already defaults to (HubSpot, Slack, Zendesk, Asana). The ask was four tasks: (1) audit real usage to confirm the starting platform set, (2) confirm OAuth feasibility per platform, (3) design a one-click connect flow that populates the same `tenant_custom_mcp_servers` record the manual form writes to, (4) confirm this wires into the `connected_account` signal from an earlier "context-aware-resolution" prompt.

Grounded in a real codebase read (`frontend/avry-user-dashboard/lib/workflows/blueprintPlanner.ts`, `lib/integrations/store.ts`, `app/api/integrations/oauth/*`, `services/avry-console/lib/composioClient.ts`, `backend/avry-backend/app/routes/{agent_tool_scope,tenant_mcp_servers}.py`, `components/agents/CustomizeAgentModal.tsx`) and a live query against production Postgres — not assumption. Also grounded in the current MCP authorization spec (2026-07-28) and each platform's own OAuth/MCP documentation, fetched live.

---

## 1. Task 1 — the honest answer: no real usage data exists yet to audit

The brief asked to pull real frequency data before picking a starting set. I looked in the three places that could hold it and none do:

- **Blueprint generation never persists its resolved-integration output anywhere queryable.** `POST /api/console/workflows/from-blueprint` returns `integrations`/`assumptions`/`needsClarification` in the HTTP response and writes nothing. If a caller then hits `POST /api/workflows`, only a bare `integrations: string[]` (no category, no assumption breakdown) reaches `workflowRepository.create()` — which is **file-backed** (`.data/workflows.json` on local disk, explicit in-memory fallback for read-only deploys), not Postgres, not aggregatable, and doesn't survive a redeploy. The real Postgres schemas that do exist (`services/avry-blueprint`, `services/avry-roadmap`, `services/avry-workflows`) store content as opaque `JSONB` blobs or have no integration/category column at all, and no code path in this repo actually calls those services' write APIs with planner output.
- **`product.tenant_custom_mcp_servers` (the manual form's own table) — queried live, right now: 0 rows.** The feature shipped today; there has never been a real manual entry to mine for "what do users keep typing in."
- **`product.agent_toolkit_connections` (the Composio connection cache) — queried live: only `zendesk`, 2 rows.** Zero for HubSpot/Slack/Asana/anything else, consistent with those three being OAuth-connectable via Composio's existing "Connections" tab but granting the agent no tools once connected (§2) — there's no incentive for a real user to have connected them yet, so absence of data isn't evidence of absence of demand.

**So the starting-set question can't be settled by observed frequency — there isn't any yet.** What *does* justify HubSpot/Slack/Zendesk/Asana as the starting four, on structural grounds instead:

1. They're exactly `blueprintPlanner.ts`'s own `DEFAULT_INTEGRATION_BY_CATEGORY` map (CRM/Communication/Helpdesk/Task management) — by construction, every blueprint that declares one of those generic categories resolves to one of these four, deterministically, regardless of what gets measured later.
2. All four (plus Trello, Linear, and 15 others) already have a real, working Composio OAuth-connect precedent in `services/avry-console/lib/composioClient.ts`'s `PROVIDER_MAP` — infrastructure readiness, independent of usage stats.
3. Zendesk — the only one of the four actually wired as an agent tool source today — is also the only one with any real connected accounts. That's the expected shape of a chicken-and-egg gap, not a signal to deprioritize the other three.

**Recommendation:** proceed with the four as given; don't block on usage data that doesn't exist. Separately worth doing regardless of this feature: give blueprint generation a real Postgres write path for its resolved-integration output (a small, independent fix) so this audit is answerable with real numbers next time.

**Two things Task 1 surfaced that need a decision, not just a note:**

- **"Product tracking" is explicitly, deliberately undecided** — confirmed via a real generated blueprint (`blueprintPlanner.graphDeterminism2.test.ts`, `docs/BLUEPRINT-WORKFLOW-GRAPH-DETERMINISM-2026-08-15.md`) that declared `'Product tracking system'` and correctly fell through to `needsClarification` rather than guessing. Composio already has both **Trello** and **Linear** wired — either is a plausible default; "Product tracking" phrasing leans toward Linear (engineering/product work) over Trello (general boards), but this is a real product call, not mine to make.
- **A stale default, found in passing, unrelated to this feature**: `blueprintPlanner.ts:169` still defaults `Payment→Stripe`, but Stripe was retired from Composio in the 2026-08-08 "agnostic tools" pivot (`agent_tool_scope.py:44-49` says so explicitly). Any blueprint that declares a payment category today gets a default that no longer resolves to a real connectable platform. Flagging, not fixing here — out of this ADR's scope.

---

## 2. Task 2 — OAuth feasibility: all four have official, OAuth-native MCP servers

| Platform | Official MCP endpoint | OAuth | Per-tenant URL? | App-level (not per-user) client registration? |
|---|---|---|---|---|
| **HubSpot** | `mcp.hubspot.com` (single shared URL) | OAuth 2.1 + PKCE, read+write CRM scopes (contacts/deals/tickets/etc.) | No — same URL for every tenant | Docs describe "admin connects first" via a registered HubSpot app; doesn't explicitly confirm third-party app-level client_id/secret in the fetched docs — **needs direct confirmation via HubSpot's own developer portal**, not assumed |
| **Slack** | `mcp.slack.com/mcp` (official since Feb 2026) | OAuth 2.0, granular per-user scopes, admin-governed | No — same URL for every tenant | Yes — standard Slack app registration (`api.slack.com/apps`), well-established, self-service |
| **Zendesk** | `https://<subdomain>.zendesk.com/api/mcp` — **first-party, per-tenant subdomain** | OAuth 2.1 PKCE only (no alternative auth) | **Yes — URL genuinely varies per tenant**, derived from the subdomain the user provides | **Confirmed yes** — Zendesk explicitly requires apps serving multiple customers to use one *global* OAuth client, not per-customer credentials. Scopes are granular (`tickets.read`, `tickets.write`, `users.read`, …) |
| **Asana** | `mcp.asana.com/v2/mcp` (v2; the old `/sse` beta endpoint is deprecated, shuts down 2026-11-05) | OAuth 2.0 | No — same URL for every tenant | Needs registration, but Asana **allowlists MCP client redirect URIs** per app — this reads as an approval-gated process, not pure self-service. **Lead time risk: flag before committing to a ship date** |

**The load-bearing finding, confirmed against the MCP spec itself (2026-07-28, `/basic/authorization`):** regardless of how elaborate the OAuth *handshake* is (discovery, PKCE, resource indicators, dynamic client registration), the **result, at the actual request level, is nothing more than a standard `Authorization: Bearer <access-token>` header on every MCP request** — identical to what `tenant_custom_mcp_servers.auth_header_value_encrypted` + `auth_header_name` already deliver today. Cerveau's Rust MCP transport (`guarded_resolve.rs`/`mcp_transport.rs`) needs **zero changes** to consume an OAuth-obtained token — it already attaches whatever static header value is stored per ADR-006 §B2/§B3.

This means the actual new work is narrow: an OAuth **client** (avry-backend, one per platform) that runs the authorization-code+PKCE dance once at "connect" time and on refresh, never a change to how Cerveau talks to the MCP server.

**Refresh tokens**: the spec makes them discretionary per authorization server, not a protocol guarantee (`MUST NOT assume refresh tokens will be issued`). All four platforms are expected to issue them for confidential/server-side OAuth clients (standard practice), but this needs final confirmation against each platform's real token response during actual app registration, not assumed from documentation alone.

---

## 3. Task 3 — design

### 3.1 Flow

```
User clicks a connector card (HubSpot/Slack/Zendesk/Asana)
  → [Zendesk only] prompt for subdomain first (needed to build both the
     OAuth authorization URL and the eventual MCP URL)
  → avry-backend starts the platform's OAuth authorization-code+PKCE flow
    (a NEW per-platform OAuth client module, mirroring the shape of
    Composio's existing connect/callback pair in
    app/api/integrations/oauth/{connect,route}.ts, but Aivory-owned this
    time since there's no Composio broker for these first-party MCP
    endpoints)
  → popup → user approves on the platform's own OAuth screen
  → callback exchanges the code for access_token (+ refresh_token)
  → access_token encrypted with the EXISTING AES-256-GCM primitive
    (app/services/mcp_server_encryption.py, same nonce+ciphertext+tag
    format already used for the manual form's auth_header_value) and
    written into product.tenant_custom_mcp_servers:
      name       = platform slug (e.g. "hubspot")
      url        = the platform's official MCP endpoint (subdomain-
                   substituted for Zendesk)
      transport  = "streamable-http"
      auth_header_name  = "Authorization"
      auth_header_value = "Bearer <access_token>"   (encrypted at rest,
                                                       same as today)
      status     = runs through the EXISTING synchronous verification
                   handshake (§B2/B4 of ADR-006) unchanged — no new
                   verification code needed
  → connector card shows "Connected"
```

**This is the key design win**: because the OAuth exchange produces exactly the shape `tenant_custom_mcp_servers` already expects (a bearer-style header value), *nothing* about the manual form's downstream machinery needs to know or care that a row came from OAuth instead of manual entry — registration route, encryption, SSRF-guarded verification (§B4), `TenantCustomMcpResolver`, the mandatory `Irreversible` risk tier (§B5) all apply identically. The only new code is upstream of that insert: the OAuth client itself, and a refresh path.

### 3.2 Token refresh — on-demand, not a background job

Given ADR-006 §B4's own guardrails (bounded ~20-30s per-call runtime budget for a custom MCP tool call), a refresh should happen **inline, on a 401 from the platform's MCP server, before retrying once** — the same "try, refresh once on 401, retry" shape `frontend/avry-user-dashboard/lib/deployAuth.ts`'s `authedFetch()` already implements client-side for the dashboard's own JWT. Server-side equivalent: `TenantCustomMcpResolver` (or a thin wrapper around it for OAuth-backed rows specifically) catches a 401 from the guarded fetch, calls the stored refresh_token against the platform's token endpoint, re-encrypts and updates `auth_header_value_encrypted`, retries once.

A **background sweep is not needed for correctness** (on-demand refresh alone is sufficient — it only runs when a real tool call needs it) but is worth adding as a **low-frequency hygiene job** (e.g. daily, refresh anything within 24h of expiry) purely to avoid every *first* tool call after a long idle period paying the extra refresh round-trip latency. Not blocking for v1.

### 3.3 New table needed, not a reuse of `agent_api_keys`

The OAuth client needs to persist `refresh_token` (encrypted, same AES-256-GCM) somewhere — `tenant_custom_mcp_servers` only has room for one `auth_header_value_encrypted`, which needs to hold the *access* token (that's what gets sent as the header). A `refresh_token` isn't a header value; it needs its own encrypted column. Cleanest: add `refresh_token_encrypted BYTEA` directly to `tenant_custom_mcp_servers` (nullable — manual-form rows never populate it) rather than a separate table, since it's 1:1 with the row it refreshes.

---

## 4. Task 4 — the `connected_account` signal: **not found in this repo**

I searched the codebase, git history, docs, and this machine's local `~/.claude/plans/` directory for "context-aware-resolution," "connected_account," and related terms and found nothing — no such mechanism, plan, or scoping document exists in what I can read. `resolveIntegrationCategory()` (`blueprintPlanner.ts:174`) is the only real "integration resolution" code that exists today, and it's purely static (category regex → hardcoded platform string), with no concept of a connected account at all.

**I'm flagging this rather than guessing at its shape**, since building Task 3's wiring against an invented signal risks conflicting with whatever was actually scoped in that earlier prompt. If you can point me at it (a doc, a plan file, a different session transcript), I'll finish this section properly. In the meantime, here's the reasonable shape if nothing more specific exists to reconcile against:

`resolveIntegrationCategory(integration, userId?, agentType?)` would, before falling back to the static map, check whether the tenant has a `verified`-status row in `tenant_custom_mcp_servers` (or, per §5 below, an active Composio connection) whose `name` matches the resolved platform — and if so, return that platform with a `source: 'connected_account'` flag instead of `source: 'default_map'`, so the UI/PDF output can say "using your connected HubSpot" instead of "assumed HubSpot." Given Task 3's records land in the same table the manual form already writes to, this check is a straightforward addition to `resolveIntegrationCategory` (which today only runs client-side in `avry-user-dashboard`; it would need either a server-side counterpart or a fetch against `GET /api/v1/tenant-mcp-servers` at generation time). **This is a plausible design, not a confirmed one — needs your input before being treated as final.**

---

## 5. The central open decision: does this duplicate Aivory's existing Composio connect flow?

This is the single most consequential finding from this audit and needs a decision before any implementation starts.

**Aivory already has a working, one-click, OAuth-popup connect flow for HubSpot, Slack, Zendesk, *and* Asana** — the existing "Connections" tab, backed by Composio (`app/api/integrations/oauth/{connect,route}.ts`, `lib/integrations/store.ts`). It already does exactly what Task 3 describes structurally (click → OAuth popup → approve → connected), except:

- Composio hosts and holds the token itself — Aivory only stores a `connectedAccountId` reference, no encryption needed on Aivory's side (fundamentally simpler than the AES-256-GCM path this ADR designs).
- Of the four target platforms, **only Zendesk is actually wired as a tool source** for the agent (`requires_composio_toolkit = "zendesk"` on a `[[mcp.servers]]` entry, live since patch 0024/0036). HubSpot, Slack, and Asana can be OAuth-connected today, but grant the agent **zero tools** — the wiring gap is config, not OAuth.

**Two real paths forward, with very different cost:**

- **Option A — finish wiring the existing Composio path for HubSpot/Slack/Asana**, mirroring exactly what already shipped for Zendesk: a `[[mcp.servers]]` entry per toolkit tagged `requires_composio_toolkit`, plus adding the three toolkit slugs to `TOOLKIT_LABELS`/`TOGGLEABLE_TOOLKITS`. No new OAuth app registration with four external companies, no new encrypted-token storage, no new refresh-token logic, no new directory UI beyond three more `TOOLKIT_LABELS` entries. This is config-and-a-few-labels work, days not weeks, and reuses a mechanism already proven live end-to-end (Zendesk, this same day).
- **Option B — build this ADR's design exactly as scoped**: register Aivory as an OAuth app with all four platforms directly (Zendesk's global-client model, Asana's allowlist gate, HubSpot's admin-connect-first model all need individual confirmation via each platform's own developer portal), build the OAuth-client + token-refresh subsystem in avry-backend, add the `refresh_token_encrypted` column, build the new directory UI. Materially more work, but connects through each platform's **official, first-party** MCP server rather than Composio's own toolkit wrapper — which may expose a different (possibly broader, possibly narrower) tool surface than what Composio wraps, and removes a dependency on Composio for these four platforms specifically.

**If both ship, they will visually collide**: two "Connect HubSpot" surfaces in two different tabs of the same modal, and if Composio ever *also* gets these three wired as tool sources later, the same platform would register tools under two different name prefixes (`composio-hubspot__*` vs `tenant_hubspot__*`) with two different risk-tier regimes (`[tool_risk_tiers]`-assigned vs. hard-locked `Irreversible`) — confusing for the user and ambiguous for the LLM's own tool selection.

**This wasn't something I could resolve by reading more code — it's a real product/architecture call.** I did the work assuming Option B (per the brief's explicit instruction that this populate `tenant_custom_mcp_servers` specifically), but flagging before writing a line of implementation code, since Option A might satisfy 3 of the 4 platforms for a fraction of the cost, and the two paths need an explicit precedence decision even if both eventually ship.

---

## Open decisions for the user

1. **§5 — Option A (finish Composio wiring) vs. Option B (this ADR's new OAuth-directory) vs. both with explicit precedence rules.** The single biggest cost/scope decision in this whole feature.
2. **Product tracking's default platform** (§1) — Trello or Linear, both already Composio-wired precedents.
3. **HubSpot's third-party app-level OAuth client registration** (§2) — docs didn't confirm this explicitly; needs a real HubSpot developer-portal check before Option B could proceed for HubSpot specifically.
4. **Asana's redirect-URI allowlist** (§2) — confirm whether this is instant self-service or has real approval lead time, before committing to a ship date that includes Asana under Option B.
5. **Task 4's `connected_account` signal** (§4) — point me at the actual prior scoping, or confirm the reasonable-guess shape I proposed is close enough to build against.

---

## Critical files

- `frontend/avry-user-dashboard/lib/workflows/blueprintPlanner.ts` — `resolveIntegrationCategory()` / `DEFAULT_INTEGRATION_BY_CATEGORY` (line ~162), where Task 4's signal would plug in.
- `frontend/avry-user-dashboard/app/api/integrations/oauth/{connect,route}.ts`, `app/integrations/callback/route.ts`, `lib/integration-auth.ts` — the existing Composio OAuth connect/callback pair, the direct structural precedent for whichever option ships.
- `services/avry-console/lib/composioClient.ts` — `PROVIDER_MAP`, the real list of 21 already-Composio-wired toolkits (confirms Trello/Linear precedent for Product tracking).
- `backend/avry-backend/app/routes/tenant_mcp_servers.py`, `app/services/mcp_server_encryption.py` — the exact insert/encryption path Task 3's OAuth client would reuse unchanged.
- `backend/avry-backend/app/routes/agent_tool_scope.py` (`TOGGLEABLE_TOOLKITS`, Stripe-retired comment) / `components/agents/CustomizeAgentModal.tsx` (`TOOLKIT_LABELS`, line 75) — what Option A's "finish the wiring" would actually touch.
- `docs/ADR-006-CERVEAU-CLIENT-DEPLOYMENT-API.md` §B2-B5 — the SSRF-guarded verification, encryption, and non-bypassable `Irreversible` tiering every `tenant_custom_mcp_servers` row (OAuth-sourced or manual) already gets for free.
