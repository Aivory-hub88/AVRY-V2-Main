# Cerveau × Odoo Integration Plan

**Status:** approved 2026-08-24 — self-host approach confirmed, `erpipe-org/mcp-odoo` remains the tenant-facing default. A first-party alternative, `Aivory-hub88/Od-MCP`, was built and measured 2026-09-13 (see §"First-party candidate" below) — preferred long-term direction, but private/proprietary with no tenant distribution path yet, so it has not replaced `erpipe-org/mcp-odoo` in the setup guide. Open decision: pre-built image distribution vs. an Aivory-hosted shared instance.
**Created:** 2026-08-24
**Related:** `CERVEAU-ERP-INTEGRATION-PLAN.md` (ERPNext — the precedent this plan explicitly does NOT follow, and why), `ADR-006-CERVEAU-CLIENT-DEPLOYMENT-API.md` (the "bring your own MCP server" feature this plan reuses as-is), `CERVEAU-ERP-SCALING-PLAN.md` (SAP connector — the same self-hosting/hosting-location tension this plan resolves differently)

## Goal

The user wants Cerveau agents able to connect to a tenant's real Odoo ERP (general business-object CRUD — sales orders, invoices, customers, inventory — "like SAP"), not a narrower feature.

## The Composio path is not available — checked, not assumed

`GET /api/v3/tools?toolkit_slug=odoo` returns exactly **10 tools**, and none of them are general ERP CRUD: `ODOO_PARSE_INVOICE`, `ODOO_PARSE_EXPENSE`, `ODOO_PARSE_BANK_STATEMENT`, `ODOO_PARSE_APPLICANT`, their matching `_GET_*_RESULT` tools, `ODOO_LIST_DATABASES`, and `ODOO_CALL_ODOO_JSONRPC`. This is a **document-OCR/parsing product**, not an Odoo business-object toolkit — a completely different Composio product than what "ERPNEXT" was for Frappe. The one tool that could theoretically reach real business objects, `ODOO_CALL_ODOO_JSONRPC`, is a raw passthrough — the same class of finding that got Linear's `RUN_QUERY_OR_MUTATION` excluded outright yesterday (an opaque call the config can't risk-tier, bypassing the whole approval system). **Not usable for this goal; not proposed here.**

This means Odoo cannot be wired the way Gmail/Calendar/Trello/Linear/ERPNext were (Composio-hosted MCP server + curated tool list + risk tiers in Cerveau's config). A genuinely different mechanism is needed.

## The mechanism: Cerveau already has one — ADR-006's "bring your own MCP server"

Confirmed live in `CustomizeAgentModal.tsx`'s **MCP tab** (real feature, not a mockup — status badges for `verified`/`verification_failed`/`Verifying…`, backed by `tenant_custom_mcp_servers.py`): a tenant can already register **any** MCP server they control (Name, URL, Transport, Auth header) for their own agent, with Cerveau's existing SSRF-guarded verification handshake and a **mandatory `Irreversible` risk tier** applied to every tool on it — the same hard-floor treatment ERPNext's writes get, for free, no new design.

**This is exactly the shape Odoo needs**, because real, actively-maintained, open-source Odoo MCP servers already exist and speak the same MCP protocol Cerveau's custom-server feature already consumes:

| Project | Tools | Auth → Odoo | Multi-instance | Write safety | License |
|---|---|---|---|---|---|
| [`ivnvxd/mcp-server-odoo`](https://github.com/ivnvxd/mcp-server-odoo) | ~10 (search/get/list/aggregate reads; create/update/delete/post_message writes; `call_model_method` escape hatch) | API key or user/pass, via XML-RPC | No — one config = one Odoo DB | Respects Odoo's own ACLs if the optional Odoo-side MCP module is installed; no built-in approval flow of its own | MPL-2.0, 373★, active |
| [`erpipe-org/mcp-odoo`](https://github.com/erpipe-org/mcp-odoo) | 41 (reads, writes, diagnostics, migration helpers, accounting, cross-instance queries) | API key/user-pass, XML-RPC or JSON-2 (Odoo 19+), optional OAuth 2.1 | **Yes** — one server, an `instances` config map, every tool takes an `instance` param | Real preview → validate → execute gate, JSONL audit trail, writes disabled unless explicitly enabled | MIT, richer feature set |

Either integrates with **zero new Cerveau code, zero new Cerveau config, zero new VPS process** — the tenant runs the server (self-hosted, their own machine/cloud, or `erpipe-org`'s hosted SaaS at erpipe.com) pointed at their own Odoo instance, and registers its URL through the MCP tab exactly like any other custom server today.

## What this plan actually proposes to build

Given the mechanism already exists, this is **not** an integration-engineering project the way ERPNext was — it's a **documentation and discoverability** project:

1. **A setup guide** (docs, possibly a dashboard help panel) walking a tenant through: run `erpipe-org/mcp-odoo` (public, self-hostable today, MIT, multi-instance-capable, real gated-write story) via Docker, point it at their Odoo with an API key, expose it over `streamable-http`, register the resulting URL in the MCP tab. `ivnvxd/mcp-server-odoo` noted as the lighter-weight single-database alternative. **`Aivory-hub88/Od-MCP` is Aivory's own first-party server and the preferred long-term direction (lighter, more safety features — see §"First-party candidate") but is not yet tenant-facing**: the repo is private proprietary IP as of 2026-09-13, and no distribution path (pre-built image, or an Aivory-hosted shared instance) exists yet for tenants to actually run it. The setup guide should keep pointing at `erpipe-org/mcp-odoo` until that distribution decision is made.
2. **Explicit security guidance in the doc**: never enable `call_model_method`/YOLO-mode-style escape hatches; if fronting with `streamable-http`, put a real reverse-proxy auth layer in front (both projects' own docs flag this — HTTP transport has no built-in caller auth); the API key used should be scoped to the least Odoo access the agent actually needs, not an admin account.
3. **Optional, small UI touch**: the MCP tab today is fully generic ("register an MCP server you control"). Adding "Odoo" as a named, pre-filled preset (transport defaults, a link to the setup guide) is a real but small frontend nicety — not required for the feature to work, since the generic form already does everything needed.

## Explicitly not proposed here (bigger, different-shaped work)

- **Aivory hosting a shared, multi-tenant Odoo MCP server itself** (leaning on `erpipe-org/mcp-odoo`'s multi-instance config to serve every tenant from one Aivory-run process). This *would* give a Composio-like "just connect, nothing to self-host" experience, but costs real new engineering this plan's own mechanism avoids entirely: a new VPS process (tension with the standing zero-new-processes discipline), a new encrypted per-tenant-credential store (the same class of net-new work flagged for SMTP in `CERVEAU-N8N-ORCHESTRATION-PLAN.md`), and a custom tenant-to-`instance`-parameter mapping layer (Composio's `tenant_entity_query_param` has no equivalent here). Worth revisiting only if the self-hosted path proves too much friction for real tenants — not assumed to be needed now.
- **Using `ODOO_CALL_ODOO_JSONRPC` via Composio at all**, for the reason given above.

## Resource footprint — measured, not estimated (2026-08-24)

Built `erpipe-org/mcp-odoo`'s own Dockerfile from source (`python:3.10-slim` base) and ran it on `tencent-vps` as a throwaway, unexposed container (cleaned up immediately after — no trace left, image removed):

- Image size: 502MB on disk (one-time build/pull cost, not a runtime cost).
- **Idle RAM: 53.5 MiB.** After a real MCP `initialize` handshake: 53.7 MiB — negligible change.
- CPU: ~0.2%, effectively idle.

Comfortably runs on the smallest cloud VM tiers (1 vCPU / 512MB–1GB RAM) — in the same weight class as `composio-connection-sync.py` or the native bridge already running on Cerveau's own VPS. Worth including in the setup guide as a concrete "this won't strain a cheap VPS" data point, not a hand-waved claim.

**Re-verified 2026-09-13** (same throwaway-container methodology, `tencent-vps`, image/source removed after, no trace left): rebuilt from source at the then-current tag, package version **odoo-mcp 1.3.2**. Idle RAM **52.01 MiB**, CPU 0.15–0.18%, image 514MB — all within measurement noise of the 2026-08-24 figures above. No regression or improvement in the newer release; the 53.5 MB number stands as accurate. `streamable-http` transport and the localhost-only-by-default bind behavior both reconfirmed unchanged.

**Lighter alternative found and measured, 2026-09-13 — logged as a real candidate, not adopted as the default:** `rachmataditiya/odoo-rust-mcp` (Rust, single compiled binary, 4 transports — stdio/streamable-HTTP/SSE/WebSocket, full CRUD, Odoo 19+ via JSON-2 API key or <19 via JSON-RPC username/password). Measured on `tencent-vps`, same throwaway-container discipline, own built-in healthcheck confirmed a real MCP `ping` JSON-RPC round-trip succeeded:

- Idle RAM: **2.3 MiB** — roughly 23× lighter than `erpipe-org/mcp-odoo`.
- CPU: 0%, image 149MB.

**Why this isn't the new default despite the resource win — three real trade-offs, not hand-waved:**
1. **No gated-write workflow.** `erpipe-org/mcp-odoo`'s headline feature (preview/validate before a write executes) has no equivalent here — Cerveau's own mandatory Irreversible-tier approval gate remains the binding control either way, but this removes a server-side defense-in-depth layer.
2. **Far less community validation**: 14 GitHub stars vs. 385 (`erpipe-org`) / 384 (`ivnvxd`) — a much younger, less battle-tested project to trust with tenant ERP data.
3. **AGPL-3.0** vs. MIT — acceptable in principle (same license already accepted for Lightpanda, per [[cerveau-context-budget-open-skills]] history), but a real constraint worth naming if this is ever forked/modified and hosted as a service. It also bundles a React config-UI + separate config server (port 3008), a larger surface than a pure MCP server.

Worth revisiting as the default if `erpipe-org/mcp-odoo`'s resource footprint ever becomes an actual constraint (it hasn't — 52 MiB is already trivial on any VPS tier) or if the project's community trust signal improves materially. Superseded as "not swapped now" by the first-party candidate below, which closes exactly the gaps (1) and (3) named above while keeping the resource win.

**Real finding worth flagging in the guide**: the server refuses to bind beyond localhost by default — `docker run` with a published port fails outright unless `MCP_ALLOW_REMOTE_HTTP=1` (or `--allow-remote-http`) is set, with its own error message warning this must only be done "behind external authentication, TLS, and network policy." Good default; the guide needs to tell tenants exactly that, not just how to bypass it.

## First-party candidate — `Aivory-hub88/Od-MCP` (new default, 2026-09-13)

While researching the `rachmataditiya/odoo-rust-mcp` trade-offs above, an internal Aivory repo surfaced: **[`Aivory-hub88/Od-MCP`](https://github.com/Aivory-hub88/Od-MCP)**, created the same day, combining `rachmataditiya`'s Rust/4-transport architecture with `erpipe-org`'s gated-write design — closing both gaps that kept the Rust option from being adopted:

- **Gated-write workflow, same shape as `erpipe-org`**: `odoo_preview_write` (non-executing, returns a `sha256`-derived token) → `odoo_validate_write` (live `fields_get` validation, single-use token, 600s TTL, instance-bound) → `odoo_execute_approved_write` (runs only if `ODOO_MCP_ENABLE_WRITES=1` AND a valid unused token). Every preview/validate/execute event logs to a JSONL audit trail (token stored as a truncated digest, never in the clear).
- **Additional safety features neither prior candidate had**: field-level ACL (deny-list strips fields from every read path, including `read_group` inference protection), per-(tenant, instance, tool) rate limiting, and strict multi-tenant isolation that fails startup rather than silently falling back to the wrong DB on incomplete config.
- **4 transports**: stdio, streamable-HTTP, SSE (legacy), WebSocket — same breadth as `rachmataditiya`, without the bundled React config-UI/second port.
- **License: proprietary** (Aivory-owned internal IP, not MIT/AGPL) — the AGPL concern from the `rachmataditiya` evaluation doesn't apply since this isn't third-party code being adopted, it's Aivory's own.

**Measured 2026-09-13** (throwaway container, `tencent-vps`, cleaned up after, no trace left; `/health` endpoint hit directly to confirm a real response, not just process-alive):

- Idle RAM: **2.6–3.6 MiB** across repeated readings — in the same class as `rachmataditiya`'s 2.3 MiB, ~15–20× lighter than `erpipe-org/mcp-odoo`'s 52 MiB.
- Image size: 144MB.
- Functional: `GET /health` → `200`, correctly reporting `writes_enabled:false` (matching the env passed), instance config, and transport auto-detection (`json2` when given an API key).
- Confirmed the same fail-closed remote-bind default as `erpipe-org`: `--listen 0.0.0.0:8787` without `MCP_ALLOW_REMOTE_HTTP=1` is refused outright with an explicit error, not a silent fallback.

**Two real build bugs found and fixed (commit `dbb2940`, pushed 2026-09-13):**
1. `Dockerfile` pinned `rust:1.82-slim`, too old for a transitive dependency (`time-core 0.1.9`) requiring the `edition2024` Cargo feature — bumped to `rust:1.90-slim`.
2. `reqwest` didn't set `default-features = false`, so `default-tls` (openssl-sys) was pulled in alongside the intended `rustls-tls`, and the builder stage had no `pkg-config`/`libssl-dev` to satisfy it — build failed outright. Fixed by disabling default features on `reqwest`; verified openssl is now entirely absent from `Cargo.lock` and the image builds clean with no extra system packages.

Both fixes verified via the same throwaway-VPS-build discipline before pushing, plus a local `cargo check` (openssl confirmed gone from the resolved dependency graph). Also relicensed from MIT to an internal-proprietary `LICENSE` file (Aivory-owned IP; `Cargo.toml` now uses `license-file` + `publish = false`) at the same time, per the user's explicit call.

**This is now the recommended default for Aivory's own internal use and future product direction** — but **not yet the tenant-facing default in the setup guide**, and that's a distinct, unresolved question: the repo was made **private** the same day (2026-09-13), by explicit user decision, since a public repo contradicted the proprietary relicense. A tenant cannot `git clone` a private repo they have no access to, so today's setup guide still points tenants at `erpipe-org/mcp-odoo` (public, self-hostable, unaffected by this change) until Aivory decides and builds a real distribution path for `Od-MCP` — options include: (a) publish pre-built images to a private/token-gated registry tenants can pull without seeing source, or (b) revisit the previously-deferred "Aivory-hosted shared multi-tenant Od-MCP" model (§"Explicitly not proposed here" above) now that there's a first-party server worth hosting that way. Neither is decided or built yet — this is a new open decision this plan didn't have before today.

## Decisions (2026-08-24)

1. **Self-host, register via the existing MCP tab — confirmed as the whole scope.** Aivory-hosted-shared-instance deferred indefinitely, not assumed to be needed.
2. **`erpipe-org/mcp-odoo` remains the tenant-facing default in the setup guide** (unaffected — still public, still self-hostable). `Aivory-hub88/Od-MCP` (first-party, private, proprietary as of 2026-09-13) is the preferred internal/long-term direction but needs a distribution decision (pre-built image vs. Aivory-hosted shared instance) before it can replace `erpipe-org/mcp-odoo` in tenant-facing docs — tracked as a new open decision, not resolved today. `ivnvxd/mcp-server-odoo` still noted as the lighter single-database alternative.
3. Setup guide: `docs/ODOO-MCP-SETUP-GUIDE.md`, written for a real tenant to follow end-to-end (not just internal reference) — reviewed 2026-09-13, left pointing at `erpipe-org/mcp-odoo` since `Od-MCP` isn't tenant-accessible yet; a forward-looking note added instead.

## Success criteria

A real tenant can point Cerveau at their own Odoo instance and have agent writes correctly land as `Irreversible`-tier, F-1-gated pending approvals — using entirely existing Cerveau machinery, with the new surface area limited to documentation (and optionally a small UI preset), not new backend/infra work.
