# ADR-006 — Aivory Cerveau: Deploy via API & Environment Adaptation

**Date:** 2026-08-12
**Status:** Proposed
**Context:** Answers the user's original question — how a client deploys their Cerveau agent to a channel/environment of their own choosing (not just Aivory-hosted Telegram/Slack/Console), and how the agent can "smartly adapt" to that environment (read the client's own system data). Extends [ADR-002](ADR-002-CERVEAU-TENANT-DESIGN.md)'s "bridge stays the front layer" decision and the 2026-08-06 user direction recorded in `docs/CERVEAU-STATUS.md`: keep the existing channels, but *also* add a generic API-based deployment surface. Companion capabilities: **Part A** (inbound, tenant infra → Aivory) and **Part B** (outbound, Cerveau → tenant infra).

Grounded in a real codebase read (`backend/avry-backend`, `frontend/avry-user-dashboard`, `backend/vps-bridge/telegram-agent.js`, `docs/CERVEAU-STATUS.md` through patch 0036) — not assumption.

---

## 0. Invariant preserved by both parts

Cerveau's Rust process is never directly reachable from a tenant-controlled client, in either direction. Today it's only reachable at loopback (`127.0.0.1:3100`/`:3101`, fronted by HAProxy at `:3105`) from the bridge. Its `X-Webhook-Secret` is a single **shared** secret trusted because only Aivory-controlled processes hold it — it is not a per-tenant credential, and `X-Tenant-Id` is trusted *only because* the secret gate already ran. Handing this secret (or a raw path to `/webhook`) to a tenant would let that tenant set `X-Tenant-Id` to any other user and read/write a stranger's agent. **Part A therefore cannot be "expose Cerveau's webhook to tenants" — it must be a new avry-backend-authenticated front door that internally reuses the existing bridge→avry-backend/bridge→Cerveau trust chain, never handing the shared secret out.** Same invariant for Part B: registration and verification happen through avry-backend (JWT-authenticated dashboard surface), never against Cerveau directly.

---

## Part A — Deploy via API

### A1. The dispatch path is already channel-agnostic

`telegram_service.py::route_console_message` builds a *pseudo-binding* (`chat_id=0`, synthetic `binding_id`) and calls `_route_to_agent(binding, text, channel="console")`, which POSTs to the bridge's `/telegram/message`. Inside `telegram-agent.js`'s handler, the channel is picked from an explicit whitelist (`['console', 'telegram', 'slack']`, per Part B's 2026-08-12 work). Everything downstream — credit gating, the `engine` branch (`profile.engine === 'cerveau' ? callCerveau(...) : runAgentLoop(...)`), history keying — is already generic over channel.

**Consequence: Part A needs no new dispatch logic.** The only bridge-side change is adding `'api'` to that same whitelist. Engine routing, credit consumption, tool loop, and Cerveau forwarding are inherited for free.

### A2. Auth model — new tenant-scoped API key

Today avry-backend has exactly two auth shapes: dashboard JWT (`get_current_user_payload`) and one global `X-Internal-Token` shared secret (`require_internal_token`). Neither fits "a tenant's own bot authenticates as *that tenant*." This is genuinely new.

**Postgres table** (new `app/routes/agent_api_keys.py`, same self-migrating idiom as `agent_profiles.py`/`agent_tool_scope.py` — `CREATE TABLE IF NOT EXISTS`, not a migration file):

```sql
CREATE TABLE IF NOT EXISTS product.agent_api_keys (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       TEXT NOT NULL,
    agent_type    TEXT NOT NULL,
    key_prefix    TEXT NOT NULL,              -- e.g. "avk_7f3a" — shown in the UI list
    key_hash      TEXT NOT NULL,              -- sha256 hex of the full key; plaintext never stored
    label         TEXT,                       -- tenant-chosen, e.g. "Discord bot prod"
    status        TEXT NOT NULL DEFAULT 'active',
    last_used_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at    TIMESTAMPTZ,
    CONSTRAINT agent_api_keys_status_check CHECK (status IN ('active','revoked'))
);
CREATE INDEX IF NOT EXISTS agent_api_keys_user_agent_idx ON product.agent_api_keys (user_id, agent_type);
CREATE UNIQUE INDEX IF NOT EXISTS agent_api_keys_hash_idx ON product.agent_api_keys (key_hash);
```

Real Postgres, not the file-JSON `DatabaseService` convention `telegram_bindings`/`slack_installations` use — a leaked API key is a bearer credential (message-send capability), unlike a chat binding; it needs a hashed, uniquely-constrained, atomically-revocable row, the same reasoning `agent_profiles`/`billing.user_credits` already established. Multiple keys per `(user_id, agent_type)` allowed — a tenant plausibly runs more than one integration (a Discord bot *and* a website widget), each independently revocable.

**Key format:** `avk_live_<32-byte url-safe token>` via `secrets.token_urlsafe(32)` (same primitive `create_link_token` already uses at a shorter length). Stored as `sha256(key).hexdigest()` — the input is already high-entropy random, not a human password, so bcrypt adds nothing (same reasoning already implicit in `X-Internal-Token`'s handling).

**Routes:**

Dashboard-facing (JWT):
```
POST   /api/v1/agent-api-keys            {agent_type, label}
       -> 201 {id, key, key_prefix, label, agent_type, created_at}   # plaintext key shown ONCE
GET    /api/v1/agent-api-keys?agent_type=...
       -> {keys: [{id, key_prefix, label, status, last_used_at, created_at}]}
DELETE /api/v1/agent-api-keys/{id}       -> {ok: true}   # status='revoked'
```

Tenant-infra-facing (new auth — a dedicated header, not `Authorization: Bearer`, so it never collides with the JWT path or gets misparsed by it):
```
POST /api/v1/agent-api/message
Headers: X-Aivory-Api-Key: avk_live_...
Body:    {"text": "...", "session_id": "optional-caller-chosen-thread-id"}
Response 200: {"reply": "...", "session_id": "..."}
```

`session_id` is caller-supplied and optional — mirrors `route_console_message`'s `conversation_id` handling — lets one API key serve many end-users (a Discord channel id, a website visitor id) with separate agent histories, without minting one key per end-user.

`route_api_message` mirrors `_route_to_agent`, but **does not** swallow bridge failures into a friendly chat string the way `_route_to_agent` does for a Telegram chat bubble — a programmatic caller needs a real HTTP status to build UX on, so bridge errors propagate as real 502/504s.

**Credit pre-check**, before calling the bridge at all: `credit_service.get_status(user_id)`, 402 immediately on exhaustion — cheaper than round-tripping to the bridge for a 200-with-a-sorry-message. The bridge's own row-locked `consume()` stays the authoritative, race-safe enforcement; this is a fast-fail layer on top, same relationship Part B/C's `approval_resume` credit reason has to the underlying ledger.

**Tier re-check at message time, not just key-creation time** — a tier downgrade after a key was minted must not leave a working key forever; re-resolved on every call the same way `credit_service`'s own tier logic already works.

**Per-key rate limiting — confirmed needed by the user 2026-08-15**, distinct from the credit balance gate: credits bound *cost*, this bounds raw request *volume* against one key (a misbehaving integration, or a leaked key used for abuse before the tenant notices and revokes it). Implemented via the existing (previously uncalled) `check_rate_limit()` in `app/utils/cache.py`, a plain Redis INCR/EXPIRE fixed-window counter — keyed per API key (`agent_api_key:{key_id}`), not per user, so one noisy key doesn't throttle a tenant's other keys. 60 req/min on Pro, 300 req/min on Enterprise, 429 on breach. Fails open on a Redis hiccup — same posture as every other resolver in this codebase (an infra blip must not block a paying tenant's traffic), explicitly wrapped in `try/except` since `check_rate_limit()` itself has no internal fallback.

### A3. Dashboard UI

`DeployModal`'s state machine (`app/agents/page.tsx`) extends cleanly: `view: 'channels' | 'telegram' | 'slack' | 'api'`. New "API" tile, same visual convention as the existing channel tiles, decorative lock badge for Foundation tenants (server enforces, badge is cosmetic — the same convention already used elsewhere in this dashboard, most recently confirmed in this exact session's Tools-tab work).

`view === 'api'` panel: list of keys (label/prefix/status/last-used), "Create key" flow, reveal-once + copy button (no existing component for this specific pattern — build on `MessageActions.tsx`'s copy-to-clipboard interaction), a `curl` snippet against `/api/v1/agent-api/message`.

### A4. Tier gating

**Pro + Enterprise** (Foundation excluded) — packaging, not risk containment. Part A introduces no new execution surface: it's the exact same message/reply loop Telegram/Slack/Console already run, just a new transport. **Confirmed by the user 2026-08-15** — matches what was already deployed (`agent_api_keys.py`'s `_MIN_TIER = "pro"`).

### A5. Engine scoping

**Both `engine='legacy'` and `engine='cerveau'`, no gate.** The dispatch path (§A1) lives entirely upstream of the `engine` branch — a `legacy` tenant hitting the new route gets exactly the `runAgentLoop` experience they'd get from Telegram today. No new execution surface, so no reason to restrict.

---

## Part B — Environment adaptation

**Product motivation.** Out of the box, an Aivory Cerveau agent only knows what Aivory curated for it — the native bridge, OfficeCLI, and whichever Composio toolkits (Stripe, Zendesk, …) a tenant has connected. It has no way to see or act on the specific systems a given business actually runs on: their own inventory database, an internal ticketing tool, a proprietary ERP, a homegrown API. Part B closes that gap: a tenant registers their own MCP server, and from then on their agent can read and act on *their* environment directly — the same mechanism that already makes Cerveau MCP-native for Aivory-curated tools, just extended to let a tenant plug in their own. This is what makes an agent feel like it genuinely understands a specific business's context, not a generic assistant answering from Aivory's own toolkit alone — directly answering the original product question this whole ADR exists to address (see the ADR's own "Context" line at the top: "how the agent can 'smartly adapt' to that environment, read the client's own system data"). Every tool this exposes is a black box Aivory never reviewed, which is exactly why §B4 (SSRF containment) and §B5 (mandatory `Irreversible` tiering, non-tenant-overridable) exist — the capability is powerful specifically because it's arbitrary, so the safety rails have to be non-negotiable, not opt-in.

**For guidance on actually building the shim itself** (stateless design, lightweight/resource-efficient runtime and hosting choices, generating it from an existing OpenAPI spec instead of hand-writing MCP protocol code, and why Cerveau's own `deferred_loading` already handles the token-efficiency side for free) — see [TENANT-MCP-SERVER-GUIDE.md](TENANT-MCP-SERVER-GUIDE.md). That doc is reference material for whoever builds a tenant shim (a tenant, or a future Aivory starter kit); this ADR stays focused on Aivory's own side of the design.

### B1. Scope: MCP server, not generic "call any REST API"

Cerveau is already MCP-native for every non-native tool source (`[[mcp.servers]]`, `agent_type_mcp_bundles`, Composio-as-MCP, and — as of this same session — the tenant-toggleable scope layer, `agent_tool_scope`/`apply_toolkit_scope_gate`, patch 0036). A second, ad hoc "arbitrary REST API with tenant-defined schema" tool type would double the integration surface (and the SSRF/approval work) for no benefit an MCP registration doesn't already cover — if a tenant's system is a plain REST API, the tenant (or a thin shim) exposes it as an MCP server; Aivory supports exactly one registration mechanism.

### B2. Postgres table

```sql
CREATE TABLE IF NOT EXISTS product.tenant_custom_mcp_servers (
    id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                       TEXT NOT NULL,
    agent_type                    TEXT NOT NULL,
    name                          TEXT NOT NULL,          -- becomes the tool-name prefix shown to the LLM
    url                           TEXT NOT NULL,           -- https:// only, enforced in the route
    transport                     TEXT NOT NULL DEFAULT 'streamable-http',
    auth_header_name              TEXT,
    auth_header_value_encrypted   BYTEA,                   -- AES-256-GCM: nonce(12)+ciphertext+tag(16)
    status                        TEXT NOT NULL DEFAULT 'pending_verification',
    risk_tier                     TEXT NOT NULL DEFAULT 'irreversible',   -- admin-only, never tenant-set
    last_verified_at              TIMESTAMPTZ,
    last_verify_error             TEXT,
    tool_count                    INTEGER,
    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    disabled_at                   TIMESTAMPTZ,
    CONSTRAINT tenant_custom_mcp_servers_status_check
        CHECK (status IN ('pending_verification','verified','verification_failed','disabled')),
    CONSTRAINT tenant_custom_mcp_servers_transport_check
        CHECK (transport IN ('streamable-http','sse')),
    CONSTRAINT tenant_custom_mcp_servers_risk_tier_check
        CHECK (risk_tier IN ('safe','reversible','irreversible'))
);
CREATE UNIQUE INDEX IF NOT EXISTS tenant_custom_mcp_servers_user_agent_name_idx
    ON product.tenant_custom_mcp_servers (user_id, agent_type, name);
```

`auth_header_value_encrypted` ports the AES-256-GCM `nonce+ciphertext+tag` format already established twice independently (`frontend/avry-user-dashboard/lib/crypto.ts` for `dashboard.n8n_credentials`, `services/avry-careers/app/services/encryption_service.py`) into avry-backend, its own dedicated env var (key rotation stays decoupled from either existing use).

`risk_tier` exists for **Aivory-admin override only**, mirroring `product.agent_profiles.engine`'s "never exposed to a JWT-facing route" precedent — the dashboard routes never accept or return it.

v1 caps at one row per `(user_id, agent_type)` in route logic (schema supports more later without migration).

### B3. Routes

Dashboard-facing (JWT):
```
POST   /api/v1/tenant-mcp-servers   {agent_type, name, url, transport, auth_header_name?, auth_header_value?}
       -> validates https-only, name ~ ^[a-zA-Z0-9_-]{1,40}$, tier=enterprise, engine='cerveau',
          row-count cap, then runs the SSRF-guarded verification handshake SYNCHRONOUSLY (§B4)
          before persisting status='verified' — or persists status='verification_failed' with
          last_verify_error and returns 422.
       -> 201 {id, name, url, status, tool_count, tools: [{name, description}]}
GET    /api/v1/tenant-mcp-servers?agent_type=...     -> never returns auth_header_value
POST   /api/v1/tenant-mcp-servers/{id}/reverify
DELETE /api/v1/tenant-mcp-servers/{id}               -> status='disabled'
```

Internal (Cerveau-facing, `X-Internal-Token`):
```
GET /api/v1/tenant-mcp-servers/internal/{user_id}/{agent_type}
    -> {servers: [{name, url, transport, auth_header_name, auth_header_value, risk_tier}]}
       (decrypted at read time — only status='verified' rows returned)
```

**Cerveau resolves this over HTTP to avry-backend, not direct SQL** (unlike `AgentToolScopeResolver`/`ToolkitConnectionResolver`, which read Postgres directly) — deliberate: the AES key should live in exactly one process (avry-backend, where `encryption_service.py`'s pattern already lives), not duplicated into Rust. Cerveau already pays a comparable per-request Postgres round-trip for persona resolution (ADR-002 D2) and now for two more resolvers (patch 0024, patch 0036) — one bounded-TTL-cached HTTP read is within the existing latency envelope, not a new order of magnitude.

### B4. SSRF security design — the load-bearing piece

The whole stack is colocated on one VPS via loopback ports. A tenant-registered URL of `http://127.0.0.1:3105/webhook` is the single most dangerous payload this architecture can receive — it would let "MCP server verification" directly probe Cerveau's own webhook, or any other loopback-bound internal service, from inside Aivory's own trust boundary.

**Required controls, applied identically at registration-time (avry-backend) and every runtime call (Cerveau):**

1. **`https://` only**, hard reject at parse time, before any network call. Every internal Aivory service speaks plain `http://` on loopback, so this alone rules out the obvious internal targets as an independent second layer.
2. **Resolve DNS explicitly, validate the resolved IP against a deny-list, connect to that pinned IP** — not letting the HTTP client resolve-and-connect implicitly. Deny: loopback (`127.0.0.0/8`, `::1`), RFC1918, link-local (`169.254.0.0/16`, `fe80::/10` — covers both AWS/GCP/Azure's `169.254.169.254` *and* Tencent Cloud's own `169.254.0.23`, relevant since this VPS is Tencent), reserved/multicast.
3. **Pin the validated IP for the actual connection**, `Host`/SNI still the original hostname for TLS. The detail naive filters miss: validate-then-let-the-client-reresolve is a classic DNS-rebinding bypass. Validate once, connect to exactly that address.
4. **No automatic redirect-following** — a redirect target gets the identical IP-validation pass before being followed.
5. **Re-validate on every runtime call, not just at registration** — DNS isn't immutable; "verified once" cannot become a permanent bypass.
6. **Response size cap** (~256 KB) via a streaming byte-counter, not a `Content-Length` check (the tenant's server can lie about or omit it).
7. **Bounded timeouts**: short connect (~3s), short verification (~10s), bounded per-call runtime (~20-30s) — one custom tool must not consume Cerveau's whole ~180s turn budget.

Implementation: a shared guarded-fetcher, built and adversarially tested **before** any tenant-facing UI ships. Python for avry-backend's verification handshake, Rust for Cerveau's runtime calls (a custom DNS-resolver hook that resolves once, validates, and hands back only the validated `SocketAddr` — the standard `reqwest`-idiomatic way to get resolve/validate/connect atomicity without a TOCTOU gap).

### B5. Risk-tier default: Irreversible — now with a live precedent, not just theory

Every existing `[tool_risk_tiers]` assignment is for a tool Aivory wrote or curated — Aivory can read the implementation and knows what it does before assigning a tier. A tenant-supplied MCP server is a black box: Aivory can't know whether a tool named `update_record` mutates a spreadsheet or fires a production transaction. Worse, the tool's *description* flows straight into LLM-visible metadata — tenant-authored, untrusted text, the same class of input `ingress.rs`'s `UntrustedFraming` already exists to contain; a crafted description is a plausible prompt-injection vector against Cerveau's own tool-selection reasoning.

**This is no longer a hypothetical argument.** In this same session, `[tool_risk_tiers].irreversible` went from empty (a real, just-discovered gap — the entire `Pending`-approval mechanism had no live trigger in production) to containing one real entry, `composio-zendesk-support__ZENDESK_REPLY_ZENDESK_TICKET`, and was live-verified end to end: blocked correctly, resolved via the new tenant-scoped route, executed against a real external system, independently confirmed. Part B's tenant-supplied tools should default into the exact same, now-proven-live mechanism — **default every tool discovered on a tenant custom MCP server to `Irreversible`**, non-overridable by the tenant.

**Open gap, explicitly not assumed away**: today's `pending_approvals`/resolve API is Aivory-admin-facing (loopback CLI or the new tenant-scoped Telegram route, both ultimately either an Aivory operator or the tenant's *own* configured channel resolving it). For a tenant's own custom tool, routing every approval through the same tenant-scoped resolve path Part B (Telegram inline buttons) already ships is actually sufficient — a tenant approving their own agent's action on their own registered tool, through their own connected channel, is exactly the shape already proven live. No new admin-facing surface is needed; this is a smaller gap than originally scoped, precisely because Part B (Telegram) shipped first.

### B6. Tier gating

**Revised 2026-08-15 to Pro + Enterprise** (originally Enterprise-only, same reasoning as `office_assistant`'s existing gate — SSRF containment easier to reason about with a smaller, higher-trust population while the guarded-fetcher was new). By the time this decision was confirmed, B1-B5 already had a real, live-verified production track record (§"Phasing and exit gates" below) — 4/5 named exit gates proven live against a real external MCP server, real SSRF rejection, real approval flow. The user opted to open straight to Pro rather than wait for a separate Phase 2, given the guarded-fetcher is no longer unproven. Code: `tenant_mcp_servers.py`'s `_MIN_TIER = "pro"` (was `"enterprise"`).

### B7. Engine scoping

**`engine='cerveau'` only, hard requirement.** The legacy Node loop has no risk-tier/approval-gate concept at all (`ApprovalRequirement::Pending` is entirely a Cerveau-side mechanism). Shipping arbitrary tenant-supplied tool execution against legacy would mean zero safety net — indefensible given §B5.

---

## Phasing and exit gates

Part A first: small, mechanically low-risk (reuses ~95% of existing infrastructure per §A1), real distribution value immediately. Part B needs genuinely new security infrastructure (guarded fetcher, DNS pinning, dynamic per-tenant MCP resolution) that doesn't exist anywhere in the codebase yet — a shipped SSRF hole is a real incident, not a UX bug.

**Status as of 2026-08-15: A1 and B1-B5 all deployed and live-verified in production.** 4 of the 5 named exit gates proven live end-to-end with a real external MCP server and a real approval flow; the 5th (DNS-rebind-after-verification) is proven at the mechanism/unit level only, for a stated reason (no controllable DNS zone available this round). Two real bugs found and fixed live during B5 verification, both deployed and re-verified. See `docs/CERVEAU-STATUS.md`'s top entry for the full account.

| Phase | Scope | Exit gate | Status |
|---|---|---|---|
| **A1** | `product.agent_api_keys` + dashboard CRUD + `POST /api/v1/agent-api/message` + bridge channel-whitelist addition + `route_api_message` + `DeployModal` `'api'` view | A throwaway external client authenticates with **only** a tenant-scoped API key (no JWT, no shared secret ever leaves Aivory infra) and round-trips a message through `avry-backend → bridge → {legacy or cerveau, per profile.engine}`; revoking the key makes the next call 401 immediately; a Foundation-tier account gets 403 creating a key; credit consumption/402-on-exhaustion match the Console path. | ✅ **Deployed + live-verified 2026-08-12.** Its `create_key` route had a real, silently-live tier-check bug — fixed 2026-08-15 during B5, see that row. |
| **B1** | Guarded-fetcher / custom-resolver component, adversarially tested in isolation, no tenant-facing surface yet | 100% of an adversarial matrix — loopback, RFC1918, both `169.254.169.254` and Tencent's `169.254.0.23`, a DNS-rebinding domain, oversized response, redirect-to-private-IP — denied, runnable in CI with no real external network hit. Nothing ships until this is green. | ✅ **Deployed + live-verified 2026-08-15** — two independent implementations, 15+13 unit tests, real-network adversarial verification (real SSRF against loopback and a wildcard-DNS rebind, both denied), now live in production Cerveau (patch 0037/0038) and avry-backend. |
| **B2** | `product.tenant_custom_mcp_servers` + dashboard CRUD wired through B1 for verification-before-save + encrypted auth-header storage | A tenant registers a real MCP server they control, watches it move `pending_verification → verified` with a visible tool list; a URL pointed at `127.0.0.1` is rejected and never reaches `verified`; a legacy-engine or non-Enterprise account is rejected before any network call. | ✅ **Deployed + live-verified 2026-08-15 — full exit gate proven live**: real registration → `verified` with a real tool list; `127.0.0.1:3105` (Cerveau's own HAProxy) rejected and never reached `verified`; a legacy-engine agent got 403 pre-network-call. |
| **B3** | `TenantCustomMcpResolver` in Cerveau (bounded-TTL-cached, fail-open on infra hiccup — same posture as `AgentToolScopeResolver`/`ToolkitConnectionResolver`), dynamic per-turn MCP wiring through B1's guarded transport, tools tagged `Irreversible` by default and non-tenant-overridable | An end-to-end turn against a verified tenant server produces a real `pending_approvals` row, resolvable through the same tenant-scoped `/webhook/approvals/{id}/resolve` route Part B (Telegram) already ships and proved live this session; re-pointing a *previously verified* server's DNS at a private IP and re-running a live call proves the runtime path — not just registration-time — refuses it. | 🟡 **Deployed + partially live-verified 2026-08-15.** First half fully proven live: a real turn produced a real `Pending` row (tool: a mundane "get current time", gated purely by tenant-custom-server origin), resolved via the real tenant-scoped route, and — after patch 0038 fixed a real execution-path bug found by this exact test — actually executed against the real external server. Second half (DNS-rebind-after-verification) proven at the mechanism/unit level only; no controllable DNS zone available this round for the full live reproduction — see `CERVEAU-STATUS.md`. |
| **B4** | Dashboard UI for registering/managing custom MCP servers (not in the original table — folded in here since it's the tenant-facing surface B1-B3 exist to serve) | Enterprise/`engine='cerveau'`-gated tab shows real server status, tool list on success, reason on failure; reverify/remove work. | ✅ **Deployed 2026-08-15** — new "MCP" tab in `CustomizeAgentModal.tsx` + `lib/tenantMcpServers.ts`, live in production (deployed by a concurrent session working the same tree, confirmed byte-identical and healthy). The underlying API it calls is fully live-verified (B2); the tab UI itself still hasn't had a dedicated browser click-through this round. |
| **B5** | Deploy all three systems; live-verify every exit gate above against production, not mocks | Real registration/verification/approval/execution flow against production, not mocks or direct SQL. | ✅ **Done 2026-08-15**, with one exit gate's live DNS-rebind reproduction still open (see B3 row) and two real bugs found + fixed along the way: (1) the dashboard JWT never carried a `tier` claim, silently 403ing `agent_api_keys.py`'s `create_key` for every real non-superadmin user since Part A shipped — fixed by re-loading the tier from Postgres before checking it, same pattern `telegram.py` already used correctly; (2) `execute_approved_tool` only knew about static `[[mcp.servers]]` entries, so an approved tenant-custom-server tool call was recorded but never executed — fixed (patch 0038) by falling back to a fresh `TenantCustomMcpResolver` lookup keyed off the approval row's own authenticated principal/agent_type. |

---

## Open decisions for the user — all four resolved 2026-08-15

1. **Part A tier gate** — ✅ Confirmed Pro+Enterprise (§A4), matches what was already deployed.
2. **Part A rate limiting** — ✅ Confirmed needed; implemented (§A2) — per-key fixed-window limiter, 60/min Pro, 300/min Enterprise, fail-open on Redis unavailability.
3. **Part B tier gate** — ✅ Revised to Pro+Enterprise (§B6) — not the originally-recommended Enterprise-only; the user chose to open to Pro immediately given B1-B5's live-verified track record, rather than gate behind a separate Phase 2.
4. **Part B's approval routing** — ✅ Confirmed sufficient — the existing tenant-scoped resolve path (Telegram) stays the only approval surface for Part B; no new admin-facing route needed.

---

## Critical files

- `backend/avry-backend/app/routes/agent_profiles.py`, `agent_tool_scope.py` — the self-migrating table idiom and internal-vs-dashboard route split both new tables (§A2, §B2) should follow; the latter is a direct, already-live precedent for "a per-tenant Postgres-backed toggle Cerveau reads via its own resolver."
- `backend/avry-backend/app/services/telegram_service.py` — `route_console_message`/`_route_to_agent` is the pattern `route_api_message` mirrors (and deliberately deviates from, for error propagation, per §A2).
- `backend/vps-bridge/telegram-agent.js` — the channel whitelist (one-line Part A change, §A1) and `callCerveau`/`resolveCerveauApproval`/engine-branch logic every part routes through unmodified.
- `frontend/avry-user-dashboard/app/agents/page.tsx`, `lib/agentChat.ts` — `DeployModal` state machine and `AgentDeployment` type to extend for Part A's `'api'` view.
- `frontend/avry-user-dashboard/lib/crypto.ts`, `services/avry-careers/app/services/encryption_service.py` — the two existing AES-256-GCM implementations Part B's `auth_header_value_encrypted` should port into avry-backend.
- `crates/zeroclaw-gateway/src/tenant.rs` (`AgentToolScopeResolver`, `ToolkitConnectionResolver`) — the exact bounded-TTL-LRU-over-Postgres shape `TenantCustomMcpResolver` (§B3) should mirror; both are real, live, tested precedents as of this session, not hypothetical patterns.
- `crates/zeroclaw-config/src/schema.rs` (`apply_toolkit_scope_gate`, `mcp_servers_for_agent_and_tenant`) — where B3's dynamic per-tenant MCP wiring plugs in alongside the three existing per-server scoping steps.
- `docs/CERVEAU-STATUS.md` — patches 0028-0036 for the full live state of the approval/risk-tier/tool-scope machinery this ADR builds on.
- `docs/TENANT-MCP-SERVER-GUIDE.md` — reference guide for whoever actually builds a tenant's MCP shim (stateless design, lightweight runtime/hosting choices, OpenAPI auto-generation, why `deferred_loading` already covers token efficiency). Not design decisions — pure how-to reference, kept separate from this ADR on purpose.
