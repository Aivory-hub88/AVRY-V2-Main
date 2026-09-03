# OSS Email Enrichment — Cache Schema, Service API, n8n Flow

**Status: DRAFT (2026-08-12).** Implementation detail for the OSS email branch of [`OSS-EMAIL-FINDER-PIPELINE.md`](OSS-EMAIL-FINDER-PIPELINE.md), using the harvester design in [`OSS-EMAIL-HARVESTER.md`](OSS-EMAIL-HARVESTER.md). Follows the existing `aivory_ops` schema style (tenant-scoped, `gen_random_uuid()` PKs, `NOW()` defaults — matches `backend/avry-backend/migrations/001_backend_independent_schema.sql`).

## 1. Cache schema (`aivory_ops`, applied on `avry-postgres`)

Two tables, one per cache tier. **Apply as a migration alongside the existing `aivory_ops` tables.**

### `enrichment_domain_cache` — global, factual, no PII (shared across tenants)

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK DEFAULT gen_random_uuid()` | |
| `domain` | `VARCHAR(255) NOT NULL UNIQUE` | normalized, lowercase |
| `company_name` | `VARCHAR(255)` | best-match company name |
| `mx_present` | `BOOLEAN` | domain can receive mail at all |
| `catch_all` | `BOOLEAN` | domain accepts any local part → downgrade results |
| `email_pattern` | `VARCHAR(64)` | `'first.last'` / `'f.last'` / `'firstl'` / `NULL` |
| `pattern_confidence` | `NUMERIC(3,2)` | from harvester pattern inference |
| `pages_scanned` | `SMALLINT DEFAULT 0` | harvest depth used |
| `last_checked_at` | `TIMESTAMP DEFAULT NOW()` | |
| `expires_at` | `TIMESTAMP DEFAULT NOW() + INTERVAL '30 days'` | TTL |

```sql
CREATE TABLE IF NOT EXISTS aivory_ops.enrichment_domain_cache (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain             VARCHAR(255) NOT NULL UNIQUE,
    company_name       VARCHAR(255),
    mx_present         BOOLEAN,
    catch_all          BOOLEAN,
    email_pattern      VARCHAR(64),
    pattern_confidence NUMERIC(3,2),
    pages_scanned      SMALLINT DEFAULT 0,
    last_checked_at    TIMESTAMP DEFAULT NOW(),
    expires_at         TIMESTAMP DEFAULT NOW() + INTERVAL '30 days'
);
CREATE INDEX IF NOT EXISTS idx_domain_cache_expires ON aivory_ops.enrichment_domain_cache (expires_at);
```

### `enrichment_email_cache` — tenant-scoped (respects tenant isolation discipline)

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK DEFAULT gen_random_uuid()` | |
| `tenant_id` | `VARCHAR(64) NOT NULL` | mirrors `tenant_id` on `aivory_ops.leads` |
| `email` | `VARCHAR(320) NOT NULL` | normalized lowercase |
| `domain` | `VARCHAR(255) NOT NULL` | denormalized for joins |
| `lead_id` | `UUID` | nullable; informational, no FK |
| `status` | `VARCHAR(16) NOT NULL` | `deliverable` / `unknown` / `undeliverable` / `catch_all` / `role` / `disposable` |
| `source` | `VARCHAR(16) NOT NULL` | `published` (harvested from company site) / `guessed` (pattern + verified) |
| `confidence` | `NUMERIC(3,2)` | from Reacher + pattern |
| `first_seen` | `TIMESTAMP DEFAULT NOW()` | |
| `last_checked` | `TIMESTAMP DEFAULT NOW()` | |
| `expires_at` | `TIMESTAMP DEFAULT NOW() + INTERVAL '30 days'` | TTL |

```sql
CREATE TABLE IF NOT EXISTS aivory_ops.enrichment_email_cache (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     VARCHAR(64) NOT NULL,
    email         VARCHAR(320) NOT NULL,
    domain        VARCHAR(255) NOT NULL,
    lead_id       UUID,
    status        VARCHAR(16) NOT NULL,
    source        VARCHAR(16) NOT NULL,
    confidence    NUMERIC(3,2),
    first_seen    TIMESTAMP DEFAULT NOW(),
    last_checked  TIMESTAMP DEFAULT NOW(),
    expires_at    TIMESTAMP DEFAULT NOW() + INTERVAL '30 days',
    CONSTRAINT uq_email_cache_tenant_email UNIQUE (tenant_id, email),
    CONSTRAINT chk_email_cache_status CHECK (status IN
        ('deliverable','unknown','undeliverable','catch_all','role','disposable')),
    CONSTRAINT chk_email_cache_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);
CREATE INDEX IF NOT EXISTS idx_email_cache_tenant_expires
    ON aivory_ops.enrichment_email_cache (tenant_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_email_cache_domain
    ON aivory_ops.enrichment_email_cache (domain);
```

### Why two tiers

- **Domain tier = the big win.** One probe/harvest per domain serves every future lead at that company (all tenants). No PII, so sharing across tenants is safe and is the whole point.
- **Email tier is tenant-scoped** because it feeds billing ("re-run within 30d is free") and respects the project's strict tenant-isolation rule — one tenant never sees, or is charged for, another tenant's earlier lookup.

## 2. Enrich service API

Recommend a **separate small service `aivory-email-enrich`** (Node, same "small standalone service" pattern as `pdf-oxide-mcp-shim`; keeps the native-bridge thin and keeps `cheerio` + Reacher client out of the MCP proxy). Owns the two cache tables.

**Proposed internal ports:** native-bridge `:4100`, enrich service `:4200`, Reacher `:4300`.

```
POST /api/email/enrich
Authorization: internal bearer (env-configured, not in n8n credentials)
{
  "tenant_id": "user_...",
  "lead_id": "uuid",
  "first_name": "Budi",
  "last_name": "Setiawan",
  "company": "PT Acme Indonesia",
  "website": "acme.co.id"          // optional, from aivory_ops.leads
}

→ 200 (match)
{ "email": "budi@acme.co.id", "confidence": 0.9, "source": "published",
  "status": "deliverable", "cached": false }

→ 200 (no match)
{ "email": null, "status": "not_found", "cached": false }

→ 200 (cache hit, free re-run)
{ "email": "budi@acme.co.id", "confidence": 0.9, "source": "guessed",
  "status": "deliverable", "cached": true }
```

### Internal behavior

1. **Domain cache lookup** — `mx_present=false` or `catch_all=true` short-circuits cheaply.
2. **Harvest** (if domain cache expired/missing) → pattern + optional direct hit. Writes/updates domain cache.
3. **Candidate generation** → Reacher verify each candidate over `127.0.0.1:4300`.
4. **Email cache write** for every probed candidate (deliverable or not) — so failed verifications also don't get re-probed within TTL.
5. **Billing flag** — `cached=true` when the winning email already exists for this `tenant_id` within TTL (the `UNIQUE (tenant_id, email)` row). Debit decision stays in n8n.
6. Timeout budget: ~15s per request (harvest is capped at 10 pages); the service must return `not_found` gracefully on overrun, never error the whole lead.

## 3. n8n workflow diff (`Native Leads Qualifier Bridge`, `ebaq7yFRfYdrL3gT`)

The enrichment branch keeps its shape — **only the Hunter email node is replaced**; wallet pre-check, phone node, atomic debit, and lead write-back stay untouched.

| # | Node (current) | Node (new) | Change |
|---|---|---|---|
| … | lead lookup, wallet pre-check | unchanged | — |
| 6 | **`Hunter — Email Lookup`** (HTTP Request → `api.hunter.io`, credential `Hunter API Key`) | **`Email Enrich (OSS)`** (HTTP Request → `http://127.0.0.1:4200/api/email/enrich`, JSON body from lead fields, timeout 20s) | replaced |
| 7 | `Has email?` IF | `Has email AND not cached?` IF | **new condition** — debit only when `email != null && cached == false` |
| 8 | `Debit email (consume_enrichment_wallet)` | unchanged (guarded by new IF) | |
| … | Lusha phone node, phone debit, lead update, success/error | unchanged | — |

New guard logic:
- `email == null` → skip email debit, still try phone, mark `email_status='not_found'` on the lead.
- `cached == true` → skip debit (the wallet was already spent on the first lookup within the 30d window), still write the result.
- Failure of the enrich service (HTTP 5xx) → do **not** fail the lead; continue with phone only and surface `email_status='unavailable'`.

Reacher does not appear in n8n at all — it is called only by the enrich service over `127.0.0.1`.

## 4. Durability (avoid repeating the `pricing.py` gap)

FUTURE-SCRAPPER.md warns that `pricing.py`/`entitlements.py` edits were applied inside running containers with no source bind-mount. The enrich service, Reacher, and the migration SQL are **new artifacts** — put them under source control and bind-mount them from day 1 (per the doc's own instruction). The two cache tables are additive DDL on `avry-postgres`; apply via the same migration mechanism used for the existing `aivory_ops` tables.

## 5. Open questions

- Debit parity: should the 30d free re-run window be per `(tenant_id, email)` (as designed) or per `(tenant_id, lead_id, email)`? Per-email is simpler and matches Anymail-style dedup; per-lead is more generous.
- Reacher concurrency: single instance is fine at low volume; scale = horizontal Reacher replicas behind the enrich service when IP-pooling grows.
- Should the enrich service own a small `GET /api/email/status` for n8n health checks (n8n can already watch the existing `/health` pattern on the VPS)?
