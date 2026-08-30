# Aivory Cerveau — Technical Reference

**This is a living reference, not a changelog.** It describes Cerveau as it stands today (last synthesized 2026-08-30). For the dated history of how it got here — every bug, patch, and decision — see `docs/CERVEAU-STATUS.md`. For the original design rationale behind any specific subsystem, the individual `ADR-00N-*.md` files remain the source of truth; this doc summarizes and cross-references them rather than replacing them.

If something here conflicts with the code or with CERVEAU-STATUS.md's most recent entries, trust the code/STATUS.md and treat this doc as due for an update.

---

## 1. What Cerveau is

Aivory Cerveau is Aivory's fork of [zeroclaw-labs/zeroclaw](https://github.com/zeroclaw-labs/zeroclaw) — a Rust, Apache-2.0-licensed, multi-tenant AI agent runtime. It's the engine intended to replace the bespoke Node.js `telegram-agent.js` currently running behind the user dashboard's deployable agents (Telegram, Slack, WhatsApp, Office Assistant).

**Why this engine:** it was already running in Aivory's own production infrastructure (Console/Assistant/Workflow-builder) at an idle RSS of **6.6 MB**, and a later 500-tenant load test on the tenant fork confirmed the same lightness at scale (idle 7–10 MB, peaking ~213 MB at 20 concurrent in-flight requests). That footprint — not feature parity — is the practical reason a fork was chosen over building a new engine from scratch.

**Fork discipline:** additive only, per ADR-001 — no daemon rearchitecture, no second orchestration engine (Restate etc.) adopted. Repo: `Aivory-hub88/AVRY-Cerveau`, branch `cerveau-main`, based on upstream v0.8.3, later independently upgraded to v0.8.4 (2026-08-18, a 50-commit rebase). Local clone convention: `~/Documents/AVRY-Cerveau`.

Cerveau's continuous CI/deploy discipline (never build Rust on the VPS, GitHub Actions artifact + sha256 verification, atomic binary swap, staged restart with a health-check window) is documented in full in CERVEAU-STATUS.md's operational notes and is assumed throughout this doc.

---

## 2. Architecture

### 2.1 Multi-tenancy model

A **tenant** is a `user_id × agent_type` pair, mapped to a synthetic memory-agent id `t_<user_id>_<agent_type>`. Isolation rides zeroclaw's existing memory agent-dimension (composite `(key, agent_id)` rows) — a tenant is not a config `[agents.<alias>]` entry, has no workspace directory, and needs no config reload to provision.

Identity source of truth: `product.agent_profiles` in `avry-postgres` — the same table the legacy bridge already reads — resolved via a read-only, bounded-LRU-cached resolver (~5 min TTL) inside Cerveau. `agent_profiles.engine` (`'legacy'` | `'cerveau'`) is the per-tenant routing flag: flipping it moves that tenant's traffic between the old Node bridge and Cerveau with an instant (~30s) rollback.

### 2.2 Wire protocol

`POST /webhook` is the main message endpoint. Tenant-scoped calls carry:

```
X-Webhook-Secret: <shared secret>
X-Tenant-Id: <user_id>
X-Agent-Type: <one of the 5 agent types, §5>
X-Session-Id: <optional>
```
```json
{"message": "..."}
```

Optional `?agent=<alias>` selects a **Cerveau-config agent alias** (an `[agents.X]` TOML entry) — a different concept from the tenant's `X-Agent-Type`; omit it and the legacy/default pick applies for tenant traffic.

These headers thread through `process_message` via an internal `TenantContext` (tenant_id, persona, session_id). The webhook secret is mandatory whenever tenant headers are present.

### 2.3 Production topology

Two systemd-managed instances plus an HAProxy load balancer, all `127.0.0.1`-bound (no public traffic reaches Cerveau directly today):

| Component | Unit | Bind |
|---|---|---|
| Instance A | `zeroclaw-cerveau.service` | `127.0.0.1:3100` |
| Instance B | `zeroclaw-cerveau-b.service` (own config dir, `LimitNOFILE=65536`) | `127.0.0.1:3101` |
| Load balancer | HAProxy 2.8.16 (systemd, not Docker) | `127.0.0.1:3105` |

**Note on the LB choice**: ADR-005 originally designed this with Traefik. That was reversed the same week — Traefik lives in its own Docker network namespace and can't reach the loopback-bound instances — and HAProxy (round-robin, `/health` checks, `fall 2 rise 2`) replaced it. HAProxy is the correct, current answer; treat ADR-005's Traefik section as superseded.

Both instances share:
- `rate_limit_backend = "redis"`, `redis_key_prefix = "cerveau:ratelimit:"` (same Redis instance the vps-bridge's BullMQ queue uses)
- `max_concurrent_llm_requests = 40`, `admission_queue_timeout_secs = 15`

Live-verified behavior: the per-tenant rate limit is a true aggregate across both instances (not doubled by having two), and per-instance semaphore backpressure returns `503` + `Retry-After` under overload. `telegram-agent.js`'s `callCerveau()` already targets the LB port (`:3105`) — wired, but per §8 not yet exercised at real scale.

A separate, non-tenant vanilla `zeroclaw.service` (`:3010`) still serves Console/Assistant/Workflow-builder, upgraded to v0.8.4 alongside the tenant fork.

### 2.4 Config, storage, environment

- Postgres schema: `cerveau` (auto-created — `agents`, `memories`, `schema_version` tables) inside `avry-postgres`.
- Config directory: `~/.zeroclaw-cerveau/` per instance.
- Env file: `/etc/zeroclaw-cerveau.env` — `CERVEAU_TENANT_DB_URL` (libpq key=value form, **not** a `postgresql://` URL — the prod password contains `@`/`#`), `CERVEAU_WEBHOOK_SECRET`.

### 2.5 Current scale ceiling

`tencent-vps` (4 vCPU / 7.5 GB) saturates a single instance at **~80–90 concurrent requests**. The original design target of 1,000–10,000 concurrent tenants was formally cancelled 2026-08-09 as a product-direction call — Cerveau now targets the ceiling actually demonstrated in production, with the two-instance/HAProxy/Redis scaling work (ADR-005) kept as headroom rather than an active goal.

500-synthetic-tenant load test (2026-08-06), real numbers: 2,000 requests, ~$0.004/active tenant LLM cost ($1.53 total, 664 calls, 97.7% cache-hit rate), ~2.7 KB/tenant-session on disk.

---

## 3. Durability and memory

### 3.1 F-2 — idempotency ledger

SQLite ledger (`control_plane/tool_idem.rs`), three-state claim protocol (`Claimed` / `AlreadyDone` / `InFlight`), key = `SHA-256(principal, task_id, turn_id, tool, args)`. Wired into the live tool-call path: every non-`Safe`-tier call claims/completes/releases against it. Fails open on ledger I/O error.

### 3.2 F-1 — durable resume

Two related but distinct things share the "F-1" name in Cerveau's history:

1. **Auto-resume of crashed goal tasks** — a crashed `Goal`-kind task parks `Paused`/`DaemonRestart` instead of terminal `Lost`, and one F-2-gated auto-continuation fires on restart. Forward-looking infrastructure: `TaskKind::Goal` currently has zero producers in this fork (the `/goal` command is parser-only), so this isn't fixing an observed failure yet.
2. **Approval turn-resume** (the one every real proof in this codebase actually exercises) — a pending approval carries its tenant/session/origin context, so `POST /webhook/approvals/{id}/resolve` resumes the *original conversation* on approve/deny, rather than executing the tool out-of-band. See §7 for the full approval system.

### 3.3 Memory lifecycle (ADR-004)

Postgres-backed only (SQLite's `hygiene` module never touches Postgres). Retention is set-based SQL: age-based per category (`core` exempt), per-tenant budget via a `row_number() OVER (PARTITION BY agent_id ORDER BY importance, created_at)` window, per-tier quota table (`cerveau.tenant_quota`). Driven by `cerveau-lifecycle.timer`, daily at 03:30 with 15-minute jitter.

Embeddings: 768 dimensions (locked — changing this means re-embedding everything), `text-embedding-3-small` via OpenRouter (confirmed working with the existing API key, no new key needed). Storage is `vector` (float32) today; a `halfvec(768)` migration exists as a queued, non-blocking follow-up. **`vector_enabled=false` as of the latest confirmed snapshot** — the pgvector extension still isn't installed on the `avry-postgres` image. A fix for a related bug (the embedding column was never actually read/written even when enabled) exists and is CI-green, but is not yet deployed to the VPS.

---

## 4. Agent types (the product surface)

Five real agent-type keys, consistent from the dashboard's UI down to Cerveau's own TOML config (`agent_type_mcp_bundles`, `risk_profiles`):

| Key | Dashboard label | Notes |
|---|---|---|
| `autonomous` | **Generalist Agent** | Union of the other four types' toolkits. Renamed from "Autonomous Agent" 2026-08-30: every Cerveau agent is autonomous, so the word distinguished nothing and implied the other four are not. The distinction is breadth — this is the only type carrying every toolkit |
| `customer_service` | Ticket Ops Agent | Internal key kept for compatibility; renamed in the UI to avoid implying a direct end-customer chatbot |
| `leads_qualifier` | Leads Qualifier Agent | |
| `finance_invoice_ops` | Finance & Invoice Ops Agent | |
| `office_assistant` | Office Assistant | **Enterprise plan only**, enforced server-side |

**Agent-type keys are permanent; only labels change.** The keys above are stored in `product.agent_profiles.agent_type` and `product.tenant_custom_mcp_servers.agent_type` rows, referenced by Cerveau's `agent_type_mcp_bundles`, and are members of the Telegram/Discord deploy union types. A rename is a copy change; renaming a key would be a data migration.

There is **no `workflow_builder` agent type** — the workflow builder is a separate dashboard feature (§9), not one of these five personas.

These are not user-authored personas — there's no end-user prompt/tool builder. What a tenant customizes per agent is identity only (name, business name, tone, language, description, knowledge, custom instructions, greeting) via the dashboard's Customize Agent modal, injected into the system prompt strictly as data, never as instructions.

A separate, unrelated generic `Agent` CRUD entity shares the `/agents` URL prefix in the dashboard (`app/agents/new`, `app/agents/[id]`) — this is an abandoned stub (the `[id]` route 404s), not the deployable-agent feature described here.

---

## 5. Tools and toolkits

### 5.1 Composio-backed toolkits (live)

Ten toolkits, all via Composio-hosted MCP servers — zero new Aivory-run processes per toolkit:

| Toolkit | Catalog → curated | Auth |
|---|---|---|
| Zendesk | — | OAuth2 |
| HubSpot | — | OAuth |
| Slack (toolkit, distinct from the native Slack bot — §9) | — | OAuth (Composio-owned app) |
| Asana | — | OAuth |
| ERPNext | 52 → 26 | API key (tenant's own Frappe key+secret) |
| Gmail | 23 → 14 | OAuth |
| Google Calendar | 28 → 13 | OAuth |
| Trello | 150 → 10 | OAuth |
| Linear | 21 → 12 | OAuth |
| Outlook (mail only) | 286 → 10 | OAuth (Microsoft) |

**Connection flow**: tenant clicks a connector card → OAuth popup (or API-key entry for ERPNext) → Composio holds the token, Aivory stores only a `connectedAccountId` reference → `product.agent_toolkit_connections` gets an `ACTIVE` row per (tenant, toolkit) → `apply_toolkit_connection_gate` checks this table before exposing any tool for that toolkit, failing closed on zero rows → tools are further scoped per agent-type via `agent_type_mcp_bundles`.

Every Composio tool call, whether from Cerveau's own MCP transport or from n8n (§10), hits `POST https://backend.composio.dev/api/v3/tools/execute/<SLUG>` with `user_id: <tenant_id>`, reusing the one connection the tenant made via the dashboard — n8n never holds its own OAuth credentials for a tenant integration.

**Mail providers (2026-08-30).** Gmail and Outlook are both wired, and which one answers is settled at run time by the connection gate — an unconnected toolkit contributes no tools, so no dashboard setting chooses a provider. Outlook had been in the dashboard's connector catalogue with a live OAuth button since well before this, but no MCP server existed and no Cerveau config referenced it: connecting Outlook gave the agent zero Outlook tools. Reads and drafts are `reversible` and auto-approved on both providers; sending is `irreversible` and approval-gated. Gmail's `CREATE_EMAIL_DRAFT` was already `reversible` but not auto-approved, so drafting prompted while sending merely required approval — it is now auto-approved, since a draft is not sent and is deletable.

**Zoho has no usable Composio path**: the `zoho_mail` toolkit exists and advertises OAuth2, but returns zero tools. Reaching Zoho requires the bring-your-own SMTP/IMAP route (§5.4), not this one.

(2026-08-26: the dashboard OAuth callback's connection-status reconciliation was fixed — `connectedAccounts.get()` replaces a removed `composio.getEntity()` call — so `ACTIVE` rows now correctly reflect a completed OAuth flow; previously connections silently stayed `Not connected` and never reached this gate.)

### 5.2 Risk tiering

Global `[tool_risk_tiers]` (`safe` / `reversible` / `irreversible`) drives idempotency and default gating. Actual approval *behavior* lives in per-agent `[risk_profiles.*]` with an `AutonomyLevel` of `read_only` / `supervised` / `full` — `full` is never actually used in practice, since it would bypass even the `irreversible` hard floor.

Two profiles cover everything today:
- **`erp-semi`** — reads auto-approved, every write prompts.
- **`erp-auto`** — reads and draft-writes auto-approved as a standing grant; submit/cancel/delete/workflow-action actions stay `always_ask` in **both** modes. This is a hard floor no autonomy setting exempts.

The agent always states write intent in its reply before executing, in both modes. A separate `auto_approve` bucket exists for tools with zero external side effect (writes only to Aivory's own internal Postgres — `create_lead`, `create_ticket`, `create_invoice`, and as of 2026-08-30 `update_deal` and `pipeline_summary`).

**A tool tiered in neither list is hard-denied by default** (patch 0013), so `[tool_risk_tiers]` is behaviour, not documentation. This is load-bearing in both directions: it is why Lightpanda's interactive tools are safely inert without an explicit deny, and it is the first thing to check when a wired tool mysteriously never runs.

Two categories of tool are deliberately excluded rather than risk-tiered: raw/opaque passthroughs that a config can't meaningfully classify (Linear's `RUN_QUERY_OR_MUTATION`, Odoo's `ODOO_CALL_ODOO_JSONRPC`), and tools Composio itself rejects with no working alternative (Trello's card-update-by-id and member-assignment tools).

---

### 5.3 Non-Composio toolkits (Aivory-run)

Not everything goes through Composio. Four toolkits are Aivory's own, and they matter because they are where the zero-signup experience lives — a tenant gets them without connecting anything.

| Toolkit | Shape | Notes |
|---|---|---|
| **Native bridge** (`aivory-native-bridge`, `127.0.0.1:4100`) | HTTP MCP, one route per agent type | Leads, tickets, invoices, meeting summaries against Aivory's own `aivory_ops` Postgres. No tenant signup, no OAuth |
| **Lightpanda** | stdio MCP, `--block-private-networks` | Headless browsing. 22 read tools auto-approved; `click`/`fill`/`evaluate`/`session_*` deliberately untiered, therefore hard-denied |
| **pdf-oxide** | stdio MCP via a custom shim | `pdfoxide_read`/`_create`/`_fill_form` auto-approved; `pdfoxide_edit`'s nine mutating ops untiered, hard-denied |
| **Tenant custom MCP** | HTTP MCP, tenant-supplied | §8 |

**Lightpanda's `search` needed a real backend.** Without `BRAVE_API_KEY` or `TAVILY_API_KEY` the tool does not fail — it scrapes DuckDuckGo's HTML endpoint, which bot-blocks, and returns the anti-bot challenge page *as search results*. It is auto-approved on four agent types, so any turn reaching for web search was reasoning over a CAPTCHA page and pulling attacker-influenceable text into context on a path that looks like a search API. Fixed 2026-08-30 with a Tavily key in `/etc/zeroclaw-cerveau.env`; the `approval-slack-notify` timer now also watches the monthly credit balance and warns at 80% and 100%.

**Why not RAGflow, or any other RAG engine.** `zeroclaw-memory` already is one, in Rust: `chunker.rs`, `embeddings.rs`, `retrieval.rs`, `vector.rs`, `dedup.rs`, `consolidation.rs`, `knowledge_graph{,_pg}.rs`. RAGflow needs 16 GB RAM, 50 GB disk and an Elasticsearch/MySQL/Redis/MinIO stack; this VPS runs with a few hundred MB free. Swiftide and Rig are the closest Rust analogues and would duplicate `zeroclaw-memory` outright. EdgeQuake is the best-matched candidate but needs Apache AGE, which is not available on the `avry-postgres` image — and its headline advantage over the existing pipeline, table/layout recovery, is a vision-model call per page rather than proprietary parsing, so it can be added to the existing extractor instead. See §13 for what genuinely is missing.

### 5.4 Bring-your-own email (foundation only)

`product.tenant_email_accounts` exists (created 2026-08-30) for tenants who want the agent to work from a mailbox they create *for it* — which is what makes storing a password acceptable: the blast radius is one purpose-made box, revoked by deleting it. **Nothing reads the table yet.**

Design agreed but unbuilt: the connector lives in the Integrations tab; the form shows three fields (address, password, from-name) with SMTP/IMAP host and port auto-filled from the domain; a real SMTP *and* IMAP login must succeed before the row persists; hosts are checked against `guarded_fetch`'s DNS-pinning deny-list, or "SMTP host = 127.0.0.1:25" is an internal-relay SSRF. It will be implemented in the **native bridge**, not via n8n's IMAP/SMTP nodes, because those require a *stored* n8n credential — which would put the tenant's password in a second resting place. Which account sends is an explicit tenant choice ("Send as", shown only when 2+ are connected), and a partial unique index makes "at most one sending address per tenant" a database guarantee.

**Never offer this for a primary Microsoft 365 mailbox**: Exchange Online has rejected 100% of Basic-auth SMTP AUTH since 30 April 2026. For Microsoft, OAuth (§5.1) is the only path.

---

## 6. ERP integrations

### 6.1 ERPNext — live

Composio-hosted MCP server, 52 tools curated to 26 (12 read / 6 draft-write / 8 hard-floor irreversible), API-key auth. Assigned to `finance_invoice_ops` (full set) and `office_assistant`/`autonomous` (reads + draft writes / union). Live-verified end-to-end 2026-08-22 (fail-closed, full-chain, cross-tenant isolation).

### 6.2 Odoo — live, self-hosted

Composio has no usable Odoo toolkit — its `odoo` slug is document-OCR/parsing only (invoice/expense/bank-statement parsing), and its one raw-access tool (`ODOO_CALL_ODOO_JSONRPC`) was rejected as an un-tierable passthrough, same reasoning as Linear's.

Instead, Odoo reuses the **custom MCP server mechanism** (§8) unmodified: the tenant self-hosts an Odoo MCP bridge and registers its URL, exactly like any other custom server. Recommended default: **`erpipe-org/mcp-odoo`** (MIT, 41 tools — reads/writes/diagnostics/accounting/cross-instance, own preview→validate→execute write gate independent of Cerveau's own approval gate, writes disabled by default). Lighter alternative for a single database: `ivnvxd/mcp-server-odoo` (MPL-2.0, ~10 tools).

Every tool on a custom Odoo server gets Cerveau's mandatory `Irreversible` tier — no per-tool split, no auto-approve, stricter than ERPNext. Setup guide for tenants: `docs/ODOO-MCP-SETUP-GUIDE.md`. Measured footprint: 53.5 MiB idle RAM, ~0.2% CPU — comfortably runs on the cheapest VPS tier.

**Odoo Discuss** (Odoo's internal channel messaging) doubles as a Tier-2 approval notification channel — see §7.2.

### 6.3 SAP — not built

`docs/CERVEAU-ERP-SCALING-PLAN.md` is a draft plan only, nothing executed. Scoped-if-approved: OData v2/v4 read + bounded write (sales orders, business partners); BAPI/RFC explicitly deferred. Whether Composio even offers a SAP OData toolkit is unchecked — that's the plan's own unresolved first step.

### 6.4 Explicitly deferred, not proposed

- A generic `erp_query`/`erp_create` abstraction layer — gated on SAP landing first.
- An eval harness with deterministic replay for multi-tool ERP scenarios.
- An Aivory-hosted shared/multi-tenant Odoo MCP instance (would need a new VPS process, a new encrypted credential store, and a tenant→instance mapping layer with no Composio-equivalent — real new engineering, not revisited unless self-hosting proves too much friction for real tenants).

---

## 7. Approvals

### 7.1 The F-1 approval system

`PendingApprovalsStore` (`crates/zeroclaw-runtime/src/control_plane/pending_approvals.rs`) is **per-instance, local file-based** — polling must hit both `:3100` and `:3101`. A `PendingApproval` row carries `id, principal, tool_name, arguments, risk_tier, status, tenant_id, agent_type, session_id, origin_message`. **No channel-routing field exists yet** — see §7.3.

A tool call classified `irreversible` is blocked pre-execution and parked as `Pending` instead of running. Resolution:

- `POST /webhook/approvals/{id}/resolve` — tenant-scoped (`X-Webhook-Secret` + `X-Tenant-Id`/`X-Agent-Type`), approve/deny; on approve, the durable-resume mechanism (§3.2) continues the original conversation automatically.
- `GET /webhook/approvals?status=pending` — tenant-scoped list, same auth.
- `GET /admin/approvals?status=pending` — loopback-only, unscoped (`crates/zeroclaw-gateway/src/api_approvals.rs`). Its auth also gates remote config reload, so newer tenant-facing work deliberately avoided this endpoint in favor of the narrower `/webhook/approvals` pair above.

### 7.2 How approvals surface to a human — today

| Surface | Status | Interactivity |
|---|---|---|
| Dashboard `/approvals` page | **Live** (functionally fixed 2026-08-25) | Approve/Deny buttons, sidebar badge with polled pending count — the universal fallback for every channel. Built earlier but non-functional until 2026-08-25: two real bugs (a missing `CERVEAU_WEBHOOK_SECRET` container env var, and the route calling `127.0.0.1:3100/3101` from inside a Docker container where that's unreachable) meant every real approve/deny succeeded server-side but always reported "not found" back to the dashboard. See CERVEAU-STATUS.md's 2026-08-25 entry for the full account. (2026-08-26: the shared `describeTool` display helper in `lib/agentApprovals.ts` had its export dropped by a Turbopack JSDoc-parse bug; resolved — see CERVEAU-STATUS.md's 2026-08-26 deploy entry.) |
| AI Console (`/console`, agent picker) | **Live** (shipped 2026-08-25) | Inline Approve/Deny card in the chat itself — same resolve endpoint as the dashboard page, appends Cerveau's durable-resume reply as a new message on success. |
| Slack | **Live** | Notification only (Tier 2) — Composio, not Aivory, owns the Slack OAuth app registration, so Aivory has no access to configure a Slack Interactivity Request URL. This is a structural ceiling, not a temporary gap. |
| Odoo Discuss | **Live** (shipped 2026-08-24) | Notification only (Tier 2) — posts via `chatter_post` to a resolved Discuss channel with a link back to the dashboard. Deliberately does not attempt to parse a Discuss reply into a decision. |
| Telegram | **Not built** | Planned Tier 1 (real inline-button resolution) — `vps-bridge` already owns the bot/chat/callback infrastructure this would need, but the resolution wiring itself was never built. |
| Discord | **Not built** | Planned Tier 1 — native slash-command infrastructure exists in the fork (`zeroclaw-channels/src/discord/mod.rs`), but no approval routing is built on it. |
| WhatsApp | **Unchecked** | Present in Cerveau's config surface; whether its quick-reply primitives could support real interactive resolution hasn't been verified. |

Both live notification paths (Slack, Odoo Discuss) run from the **same** systemd timer — `/usr/local/bin/approval-slack-notify.py`, every 3 minutes, not tracked in any git repo (same standalone-VPS-script precedent as `composio-connection-sync.py`). State is tracked per `{approval_id}:{channel}` key, so one channel failing (no Slack workspace connected, no Odoo server registered) never blocks or duplicates the other. The Odoo path authenticates via avry-backend's own internal decrypted-server endpoint (it holds no AES key itself — decryption only ever happens inside avry-backend, per ADR-006 §B3) and speaks MCP directly to the tenant's bridge.

### 7.3 Design for real channel-native (Tier 1) resolution — not yet implemented

`docs/CERVEAU-CHANNEL-NATIVE-APPROVAL-PLAN.md` proposes adding an `approval_route: Option<String>` field to `PendingApproval` (same `channel_key:recipient` shape the fork's separate SOP approval broker already uses for a different subsystem), fired on park, resolved through the same `/webhook/approvals/{id}/resolve` endpoint a channel's own button/reply would call. Not started for Telegram/Discord as of this writing.

---

## 8. Custom MCP servers — "bring your own" (ADR-006 Part B)

A tenant on Pro or Enterprise can register any MCP server they control for their own agent — the dashboard's Customize Agent → MCP tab (`CustomizeAgentModal.tsx`), backed by `product.tenant_custom_mcp_servers` (`tenant_mcp_servers.py`). Fields: Name, URL (https only), Transport (`streamable-http`/`sse`), optional Auth header name/value.

- **Verification**: a synchronous, SSRF-guarded MCP `initialize` + `tools/list` handshake through `guarded_fetch.py` (https-only, DNS-pinned, deny-listed, size-capped, no auto-redirect) — the single most dangerous surface in avry-backend, since a tenant-supplied URL that resolves to `127.0.0.1` would otherwise let "verification" probe Cerveau's own webhook from inside Aivory's trust boundary. Threads the server's `Mcp-Session-Id` from `initialize` into the `tools/list` call (fixed 2026-08-27) — streamable-http is stateful, and this verification could never actually pass against a real session-issuing MCP server before that fix.
- **Encryption**: the auth header value is AES-256-GCM-encrypted at rest (`mcp_server_encryption.py`) and never returned by any dashboard-facing route — only avry-backend's internal endpoint (`X-Internal-Token` auth) hands back the decrypted value, and only to Cerveau-side or internal-tooling callers.
- **Risk tier**: every tool on a custom server is hard-locked to `Irreversible` — no per-tool classification, no auto-approve, no exception.
- **Quota**: per (tenant, agent type), scaled by plan — Operational 1, Business 3, Enterprise 10 (`_MAX_SERVERS_BY_TIER`, 2026-08-30). It was previously a flat 1 for everyone, which made the cheapest paid rung and Enterprise identical on the one axis this feature scales along, and left a superadmin — Enterprise-equivalent everywhere else — unable to register a second server at all. Enterprise is bounded rather than unlimited on purpose: every tool here is a black box Aivory never reviewed, so one account's blast radius stays finite.
- **Gates**: Pro plan and above (widened down from Enterprise-only, 2026-08-15); hard-requires `agent_profiles.engine = 'cerveau'` — the legacy engine has no risk-tier/approval concept at all, so arbitrary tenant-supplied tool execution against it would have no safety net.

Odoo's self-host path (§6.2) is a direct, unmodified reuse of this exact mechanism.

---

## 9. Deployment channels and the API

- **Generic API deploy** (ADR-006 Part A): tenant-scoped API key (`avk_live_...`), `POST /api/v1/agent-api/message`. Pro + Enterprise.
- **`POST /api/memory`** is tenant-aware as of 2026-08-30. Send `X-Tenant-Id` + `X-Agent-Type` *and* a configured host alias as `agent`, and the write is scoped to `t_<user_id>.<agent_type>` via `create_memory_for_tenant` — the same structural jail (empty cross-agent allowlist) a tenant turn runs under. Fail-closed: malformed or half-specified tenant headers, or tenant headers with no `agent`, all return **400** rather than degrading to the install-wide `state.mem`. Before this it had no tenant path at all, and its no-`agent` fallback wrote to that shared store.
- **Telegram**: real, live messaging channel via `vps-bridge`'s own bot/chat-mapping/callback infrastructure. QR-based binding.
- **Slack**: native Slack App with Aivory's own credentials (distinct from the Composio-owned Slack *toolkit* in §5.1) — OAuth deploy flow exists; approval-awareness is not yet built into it (plain-text notifications only today, no Block Kit buttons).
- **Discord**: shared bot, `/connect` code binding. Slash-command infrastructure exists but isn't wired to approvals yet.
- **WhatsApp**: present in the dashboard UI but the deploy button currently has no click handler — not functional.

**Standing product constraint**: every deployed agent must be operable through plain-language prompts, not slash commands, because most users aren't developers. This is confirmed followed for in-conversation behavior (e.g. the n8n orchestration work deliberately resolves Slack-channel selection, calendar scoping, and email-provider choice conversationally rather than via dashboard settings fields) but is **not confirmed** for the channel *binding/deployment* flow itself, and Discord's only built interactivity primitive today is slash-command-based — whether that conflicts with the constraint or is scoped to internal use only is unverified. Worth checking before building further Discord interactivity.

---

## 10. n8n's role

n8n is used, but deliberately narrow — it is **not** the agent orchestrator, and Cerveau's Rust runtime remains the actual decision-maker throughout. n8n exists purely as a deterministic executor for a small, fixed set of pre-defined, genuinely multi-step, cross-system flows, invoked as a single tool call from Cerveau's native bridge (`aivory-native-bridge/server.mjs`).

An earlier "one n8n workflow per tool action" design was explicitly rejected — wrapping every individual action in its own workflow doesn't reduce LLM hallucination (the LLM still picks the tool and arguments upstream of n8n), it only adds latency and a new failure point.

Four named scenarios were scoped (lead capture, support escalation, task handoff, invoice approval); only the invoice-approval **Slack notifier** is live. The original invoice-approval design had n8n call ERPNext directly via Composio, bypassing F-1 entirely — this was caught and rejected as a second, parallel approval mechanism before shipping; the corrected design keeps invoice creation as a normal F-1-gated Cerveau tool call, with n8n only polling Cerveau's admin approvals endpoint to notify Slack. The other three scenarios are not started (paused 2026-08-23).

**Narrowed further, 2026-08-30.** Seven of the leads agent's eight tools were one SQL statement each and now run in the native bridge against Postgres directly (`db.mjs`, an optional per-tool `handler`); only `enrich_lead_contact` — wallet pre-check, provider call, conditional debit, merge — remains on the n8n path. The n8n CRUD branches are deliberately left in place but unused, so rolling back is reverting one file rather than restoring a workflow. Separately, the bridge shared secret left the workflow definitions: authentication is now the Webhook node's own `headerAuth` backed by a credential, so exports carry no secret and rejection happens before any node runs. `Native Customer Service Bridge` is archived and could not be migrated (the API refuses to update an archived workflow), so it still holds the old literal.

**Credential placement, three categories:** tenant credentials never enter n8n (they live encrypted in Postgres and are used by the bridge); Aivory's own infrastructure credentials (the native-ops Postgres connection, provider API keys) belong in n8n's credential store, which is what it is for; nothing belongs in a node parameter — that was the actual defect.

Operationally: n8n runs as a Docker container on the VPS; Cerveau runs as a native systemd process on the host — Docker's network isolation means loopback-bound Cerveau ports aren't reachable from inside an n8n container without an explicit bridge, which shaped several of the above design choices.

---

## 11. Workflow versioning and fixture replay

A dashboard feature (`avry-user-dashboard`), adjacent to but not part of Cerveau's runtime — covers the visual workflow builder, not the five agent-type personas.

- **Versioning**: snapshot-on-write (full spec+canvas JSON, not diffs) into `dashboard.workflow_versions`, triggered at 4 edit points (manual edit, status change, title change, Copilot apply-to-existing). Restore is non-destructive (writes to the local draft store, creates a new `restore`-tagged version) — but restore does **not** currently propagate to an already-deployed, live n8n workflow, and the UI gives no warning about that gap.
- **Fixtures**: a captured real n8n execution's raw run data, used for regression comparison against future runs. "Replay against fixture" isn't a true replay — n8n's REST API has no ad-hoc trigger endpoint, so the workaround pins the fixture data (`pinData`) onto the live workflow and asks the user to trigger it themselves; this mutates the live workflow until manually cleared, with no auto-expiry.
- No tier gating beyond whole-module access.

Full detail: `docs/WORKFLOW-VERSIONING-AND-FIXTURES-OVERVIEW.md`.

---

## 12. Current phase and maturity

Per `docs/DEPLOYABLE_AGENT_RUNTIME_PLANNING.md`'s own phase markers:

| Phase | Status |
|---|---|
| 0 — blocking questions | ✅ passed |
| 1 — fork bootstrap | ✅ passed |
| 2 — multi-tenant identity + isolation | ✅ passed |
| 3 — memory/lifecycle | ✅ exit gate met |
| 4 — tool orchestration | 🟡 far along (Composio-MCP, capability graph, concurrent tools, approval gate all landed) |
| 5 — 500-tenant load test | ✅ passed (against the revised, non-10k target) |
| 6 — channel migration | 🟡 6.1 landed (per-tenant routing flag exists) — **not yet exercised at real scale, no real tenant flagged yet** |
| 7 — voice | ⬜ not started |
| 8 — scale validation + cutover | ⬜ not started |

**Honest read**: this is a mature, continuously-shipping production *engine* with extensive internal/synthetic verification — real deploy discipline, a real production outage recovered, real bugs caught under real operational load — sitting right at the threshold of Phase 6's real-tenant cutover. As of the most recent entries, ERPNext and the Gmail/Calendar/Trello/Linear toolkits both carry the same open item: verification has been via synthetic/throwaway test tenants, and no confirmed paying customer has yet used these newest integrations end-to-end. Treat "live and verified" throughout this document as "live and verified against real external systems, pending real-tenant traffic" unless stated otherwise.

**2026-08-30 CI update:** `cerveau-build` is now 4 parallel jobs (~12-14 min wall, was 29) with `concurrency` + `paths-ignore: docs/**`; `cerveau-quick` (tenant isolation only, ~3 min) runs on every PR. Branch protection requires all 4 jobs on `cerveau-main`. Dashboard (`avry-user-dashboard`) and backend (`avry-backend`) now have their own fast gates (`dashboard-ci`: `tsc` + `lint` + `vitest` + `next build`; `backend-ci`: `py_compile` + `unittest` 53 tests) — the `useChat.ts:109` type bug was caught there before reaching the VPS.

---

## 13. Known gaps (honest list)

- **Document knowledge does not reach the vector pipeline.** `agent_profiles.knowledge` is a flat 12 000-char field injected into every prompt, and the document-upload endpoint merges extracted text *into that field* — so a long PDF is truncated and every turn pays for the whole blob regardless of relevance. The Cerveau side of the fix shipped 2026-08-30 (§9, tenant-aware `/api/memory`); the backend side — routing uploads there instead, and giving them a category exempt from `purge_after_days = 30` — is not built. `retention_days_by_category` is empty, so ingested documents would silently vanish after a month.
- No deep document parsing: scanned PDFs, tables and multi-column layouts degrade to whatever plain text extraction yields. The cheapest fix is a vision-model fallback in `attachment_extractor`, not a new RAG stack (§5.3).
- `halfvec(768)` storage migration not done. (pgvector itself **is** installed — `vector 0.8.6`, with `cerveau.memories.embedding vector(768)` populated and in use. Earlier revisions of this doc listed it as the outstanding blocker; that is no longer true.)
- **`.zeroclaw-cerveau-b`'s config has drifted** behind `:3100`'s and it is in the HAProxy round-robin, so it serves roughly half of all turns. It has no `enrich_lead_contact` entry at all. Individual toolkits have been patched into it one at a time; it has never been properly resynced.
- `aivory-native-bridge`, the n8n workflows and Cerveau's `config.toml` were untracked until 2026-08-30 and now live in `services/aivory-native-bridge/`, the `avry-n8n` repo and `ops/cerveau-config/` (redacted). The VPS is still where all three execute — there is no deployment pipeline, only copy-and-restart.
- Stripe toolkit fully retired in favor of the native n8n-backed bridge — a stale config entry may still be wired as dead weight pending cleanup; `frontend/frontend-nextjs`'s `blueprintPlanner.ts` still defaults Payment→Stripe though Stripe was retired from Composio 2026-08-08.
- No proactive/scheduled task execution scoped to a channel — no dashboard channel-selection UX, and Cerveau's goal/cron primitives have zero producers wired for this.
- No dedicated per-agent "manage" page in the dashboard (per-agent toolkit visibility, unified deployment view, channel-scoped automation config, per-agent activity/usage) beyond the identity-editing modal.
- Capability graph (Phase 4.2) is built but config-gated off by default.
- SAP connector, generic ERP adapter, deterministic-replay eval harness — all draft-only, nothing executed (§6.3–6.4).
- Telegram/Discord Tier-1 interactive approvals, Slack-native approval-awareness — designed, not built (§7.2–7.3).
- Discord slash-command binding vs. the natural-language-only product constraint — unverified whether it conflicts (§9).
- Bring-your-own SMTP/IMAP: table exists, nothing reads it (§5.4).
- Outstanding credential rotations flagged in CERVEAU-STATUS.md's operational notes — check that section before assuming any previously-exposed secret has been rotated.

---

## 14. Where to look next

- `docs/CERVEAU-STATUS.md` — the full dated changelog; the only place to see *how* something got built, not just what's true now.
- `docs/ADR-001` through `ADR-007` — original design rationale per subsystem.
- `docs/CERVEAU-TOOLKIT-EXPANSION-PLAN.md`, `CERVEAU-ERP-INTEGRATION-PLAN.md`, `CERVEAU-ERP-SCALING-PLAN.md`, `CERVEAU-ODOO-INTEGRATION-PLAN.md` — the individual integration build plans behind §5–6.
- `docs/CERVEAU-APPROVAL-UX-PLAN.md`, `CERVEAU-CHANNEL-NATIVE-APPROVAL-PLAN.md`, `CERVEAU-N8N-ORCHESTRATION-PLAN.md` — the plans behind §7 and §10.
- `docs/ODOO-MCP-SETUP-GUIDE.md` — the tenant-facing setup guide for §6.2/§8.
- `docs/WORKFLOW-VERSIONING-AND-FIXTURES-OVERVIEW.md` — full detail behind §11.
- `docs/DEPLOYABLE_AGENT_RUNTIME_PLANNING.md` — the master phased execution plan behind §12.
