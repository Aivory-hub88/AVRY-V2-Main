# Cerveau Tier-2 BYO Plan — Smartlead / Prospeo / MillionVerifier

**Status:** scaffolding done 2026-09-16, Composio-side provisioning pending
**Related:** `CERVEAU-STATUS.md` (2026-09-15 Lex audit), `CERVEAU-ERP-INTEGRATION-PLAN.md` (pattern), `SESSION-2026-09-15-ROOM-LEX-AIRA.md` §9 backlog

## Model

Tier-1 = read/draft/QA-only, live. Tier-2 = spend/send eksternal, pure BYO API key per tenant via Composio custom auth config (same shape as ERPNext `ac_ILn9zmSA5cqN`). Cerveau never holds raw keys — only `connectedAccountId` ref via `tenant_entity_query_param = "user_id"` + `requires_composio_toolkit` gate (fail-closed).

## Done (code)

- `backend/avry-backend/app/routes/agent_tool_scope.py`: `smartlead`, `prospeo`, `millionverifier` added to `leads_qualifier` + `autonomous` toggle map.
- `frontend/avry-user-dashboard/app/api/integrations/apikey/connect/route.ts`: three slugs accepted, `generic_api_key` → Composio `connected_accounts`. Auth config IDs via env (`SMARTLEAD_AUTH_CONFIG_ID`, `PROSPEO_AUTH_CONFIG_ID`, `MILLIONVERIFIER_AUTH_CONFIG_ID`), placeholder `ac_REPLACE_*` fails loudly until provisioned.
- `frontend/avry-user-dashboard/components/agents/CustomizeAgentModal.tsx`: labels + per-row API-key form (ERPNext keeps 3-field form, Tier-2 single-key form, per-slug open state).

## Pending — Composio-side (manual, butuh user)

1. ~~Buat 3 custom auth configs (scheme API_KEY)~~ **DONE 2026-09-16 via VPS** (key tidak transit chat):
   - `smartlead` → `ac_pwZitMOtelgi` (custom, API_KEY, ENABLED)
   - `prospeo` → `ac_gKHRfgGyaHpc` (custom, API_KEY, ENABLED)
   - `millionverifier` → **NO TOOLKIT (404)** — Composio tidak punya toolkit ini.
     Keputusan 2026-09-16 (user-approved): pakai `emaillistverify` —
     auth config `ac_BVyjHFnrtPi3` (custom, API_KEY, non-managed) CREATED
     via VPS, IDs dikunci sebagai default di `apikey/connect/route.ts`.
     Direct-API MillionVerifier jadi backlog (aktifkan kalau ada tenant
     yang bukti bawa kredit existing).
2. ~~Catalog curation + MCP server~~ **DONE 2026-09-16 untuk verifier** (smartlead/prospeo curation + server pending):
   - `/tools?toolkit_slug=emaillistverify` mengembalikan 2 slug versi
     `VERIFY_EMAIL`/`VERIFY_EMAIL_DETAILED`, tapi endpoint MCP menolaknya
     (`MCP_InvalidToolsProvided`) — pelajaran HubSpot round berulang:
     jangan percaya katalog, percaya server. Buat dengan `allowed_tools`
     kosong (full set) → **201**, server melaporkan 12 slug kanonisnya
     sendiri (`VERIFY_SINGLE_EMAIL`, `VERIFY_SINGLE_EMAIL_DETAILED`,
     `CHECK_BLACKLISTS`, `CHECK_DISPOSABLE`, `FIND_CONTACT`, `GET_CREDITS`,
     `GET_API_FILE_INFO`, `GET_EMAIL_JOB`, `GET_MAILLIST_PROGRESS`,
     `UPLOAD_EMAIL_LIST`, `DOWNLOAD_MAILLIST`, `DELETE_MAILLIST`).
   - **Live MCP server**: `aivory-emaillistverify`,
     id `1b6387f0-898f-400d-95f2-2c846081c686`,
     URL `https://backend.composio.dev/v3/mcp/1b6387f0-898f-400d-95f2-2c846081c686`.
     Gagal-create tidak meninggalkan orphan (400 = tidak tercipta).
   - Tiering untuk deploy Cerveau: reads → reversible + auto_approve
     (verify single/detailed, blacklists, disposable, find, credits,
     file-info, job, progress); **irreversible** (spend kredit) →
     `UPLOAD_EMAIL_LIST`, `DOWNLOAD_MAILLIST`, `DELETE_MAILLIST`.
     Wire prefix (`composio-emaillistverify__*`) wajib dikonfirmasi dari
     live server sebelum tulis `[tool_risk_tiers]`.
   - Catatan: daftar `GET /mcp/servers` terpaginasi (10 baris, server slack/
     zendesk tidak muncul) + ada 2 kandidat orphan `aivory-outlook-probe` /
     `probe2` — TIDAK dihapus tanpa sign-off (mungkin milik work in-flight).
3. ~~Pending: curation + MCP server untuk **smartlead** dan **prospeo**~~ **DONE 2026-09-16 via VPS**:
   - `smartlead`: katalog 19/19 diterima apa adanya (attempt pertama, 201).
     **Live**: `aivory-smartlead`, id `318c274f-e443-4a00-8680-4f5c1ae7f622`,
     URL `https://backend.composio.dev/v3/mcp/318c274f-e443-4a00-8680-4f5c1ae7f622`.
     Tiering: 15 reads → reversible + auto_approve (GET_*, LIST_*, SEARCH_*);
     **irreversible** → `CREATE_CAMPAIGN`, `CREATE_DELIVERY_FOLDER`,
     `DELETE_CAMPAIGN`, `DELETE_DELIVERY_FOLDER`.
   - `prospeo`: katalog 8/8 diterima apa adanya (201).
     **Live**: `aivory-prospeo`, id `718626af-eab4-4313-ae6a-ccd1633db2b0`,
     URL `https://backend.composio.dev/v3/mcp/718626af-eab4-4313-ae6a-ccd1633db2b0`.
     Tiering: 6 single/search → reversible + auto_approve (ENRICH_COMPANY,
     ENRICH_PERSON, GET_ACCOUNT_INFORMATION, SEARCH_COMPANIES,
     SEARCH_PEOPLE, SEARCH_SUGGESTIONS); **irreversible** →
     `BULK_ENRICH_COMPANIES`, `BULK_ENRICH_PEOPLE` (spend kredit massal).
     Caveat terdokumentasi: single enrich juga makan kredit mikro tenant —
     diterima sebagai reversible karena read-only + key milik tenant sendiri.
   - Wire prefix (`composio-smartlead__*`, `composio-prospeo__*`) wajib
     dikonfirmasi dari live server sebelum tulis `[tool_risk_tiers]`.
4. Verifikasi tidak ada orphan: list servers (dengan paginasi), hapus trial gagal.

## Pending — Cerveau config (VPS `:3100` + `-b`, butuh maintenance window + sign-off)

**DONE 2026-09-16 — `:3100` only (`-b` sudah di-teardown 2026-09-12, tidak ada yang di-patch):**
- Patch 1: 3 `[[mcp.servers]]` (`composio-smartlead-outbound`, `composio-prospeo-enrich`,
  `composio-emaillistverify-verify`; empty headers = runtime-inject, zero `x-api-key`
  di live config) + 3 bundle + assignments + tiers.
  Backup `config.toml.bak-pre-tier2-20260916`, doctor 77 ok/20 warn/0 err (baseline identik).
- **Insiden tertangkap verificare + diperbaiki hari yang sama:** `str.index("reversible = [")`
  match substring di dalam `"irreversible = ["` (index 2) → 30 reads mendarat di irreversible.
  Buktinya: full-chain melempar Pending `irreversible` untuk LIST_CAMPAIGNS.
  Fix (`config.toml.bak-pre-tier2-fix-20260916`): rebuild irreversible tanpa reads,
  append reads ke reversible (newline-anchored), + 3 bundle ke `[agents.leads_qualifier]`,
  + reads ke `agent_leads_qualifier`/`agent_autonomous` auto_approve.
  Pelajaran: jangan pernah match `"reversible = ["` tanpa `\n`-anchor; validasi via
  parsed TOML (bukan cuma tomllib lolos — cek membership per list).
- Verification protocol (3 LLM calls, deepseek flash):
  1. fail-closed PASS — leads_qualifier tanpa row: denial, zero wire tools.
  2. full-chain PASS (rerun tenant fresh, hindari negative-cache TTL resolver) —
     gate grant → `SMARTLEAD_LIST_CAMPAIGNS` dieksekusi → Composio
     "no connected account", `pending_approval: null`.
  3. isolation PASS — customer_service: denial, zero wire tools.
  4. cleanup PASS — memories/agents/connections 0 sisa (2 tenant throwaway).
- Satu baris pending orphan `pa_a7fe48f9` (dari run bertier-salah, tenant sudah
  dihapus) dibiarkan di SQLite WAL — preseden: jangan sentuh file live-write
  untuk audit row harmless; invisible untuk tenant real (filter per-tenant).

Per server, yang live sekarang (simetris — hanya `:3100` yang ada):

```toml
[[mcp.servers]]
name = "composio-smartlead-outbound"  # / prospeo-enrich / millionverifier-verify
transport = "http"
url = "https://backend.composio.dev/v3/mcp/<uuid>"
tenant_entity_query_param = "user_id"
requires_composio_toolkit = "smartlead"  # / prospeo / millionverifier

[mcp.servers.headers]
x-api-key = "<CERVEAU_COMPOSIO_API_KEY>"

[mcp_bundles.outbound-smartlead]  # / enrich-prospeo / verify-millionverifier
servers = ["composio-smartlead-outbound"]
```

- `[agent_type_mcp_bundles.leads_qualifier]` += tiga bundle; `.autonomous` += tiga bundle.
- `[tool_risk_tiers].irreversible` += semua Tier-2 write/send slugs (reads → reversible + auto_approve, writes → irreversible, hard floor seperti HubSpot gate `bak-pre-lex-hubspot-gate-20260915`).
- Backup `config.toml.bak-pre-tier2-YYYYMMDD`, TOML validate lokal + VPS, atomic `.new`+`mv`, `doctor` 78 ok, staged restart `:3100` → `-b`, stability window 90s.
- Verifikasi: fail-closed tanpa row, full-chain dengan synthetic `ACTIVE` row, isolasi cross-tenant, cleanup rows (ikuti `CERVEAU-TOOLKIT-EXPANSION-PLAN.md:93`).

## Pending — skills

Vendor `smartlead-*`, `prospeo-*`, `millionverifier-*`, `zapmail-domain-setup-public`, `positive-reply-scoring` dari upstream cold-outbound ke `cerveau-skills/leads-qualifier/` VPS + mirror AVRY-Cerveau. Cleanup artefak `._*` (macOS AppleDouble) sebelum audit — pernah menolak seluruh direktori skill.
