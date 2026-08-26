# Cerveau × Odoo Integration Plan

**Status:** approved 2026-08-24 — self-host approach confirmed, `erpipe-org/mcp-odoo` as default, writing the setup guide
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

1. **A setup guide** (docs, possibly a dashboard help panel) walking a tenant through: install `erpipe-org/mcp-odoo` (recommended default — multi-instance-capable, real gated-write story, MIT) via Docker or pip, point it at their Odoo with an API key, expose it over `streamable-http`, register the resulting URL in the MCP tab. `ivnvxd/mcp-server-odoo` noted as the lighter-weight alternative if a tenant only has one Odoo database and wants fewer moving parts.
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

**Real finding worth flagging in the guide**: the server refuses to bind beyond localhost by default — `docker run` with a published port fails outright unless `MCP_ALLOW_REMOTE_HTTP=1` (or `--allow-remote-http`) is set, with its own error message warning this must only be done "behind external authentication, TLS, and network policy." Good default; the guide needs to tell tenants exactly that, not just how to bypass it.

## Decisions (2026-08-24)

1. **Self-host, register via the existing MCP tab — confirmed as the whole scope.** Aivory-hosted-shared-instance deferred indefinitely, not assumed to be needed.
2. **`erpipe-org/mcp-odoo` is the recommended default** in the setup guide; `ivnvxd/mcp-server-odoo` noted as the lighter single-database alternative.
3. Setup guide: `docs/ODOO-MCP-SETUP-GUIDE.md`, written for a real tenant to follow end-to-end (not just internal reference).

## Success criteria

A real tenant can point Cerveau at their own Odoo instance and have agent writes correctly land as `Irreversible`-tier, F-1-gated pending approvals — using entirely existing Cerveau machinery, with the new surface area limited to documentation (and optionally a small UI preset), not new backend/infra work.
