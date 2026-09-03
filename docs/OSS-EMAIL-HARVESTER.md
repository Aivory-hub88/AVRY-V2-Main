# OSS Email Harvester — Self-Built Design (Stage 2 of the OSS Email-Finder Pipeline)

**Status: DRAFT (2026-08-12).** Implementation design for the custom harvester that replaces theHarvester in [`OSS-EMAIL-FINDER-PIPELINE.md`](OSS-EMAIL-FINDER-PIPELINE.md). Built because theHarvester has **no license** (unsafe to embed commercially) and its harvest targets don't match our Indonesian B2B need.

## Purpose & scope

Given a company domain (and optionally a target person), discover **business emails published on the company's own web properties**, extract `(email, name, role, page_url)` pairs, and either:

1. **Direct-hit** the target person (their own email is published → highest-confidence result, no SMTP verification needed), or
2. **Infer the domain's email naming pattern** from published pairs → feeds candidate generation in the pipeline.

### Hard scope boundary (legal)

- Crawl **only the company's own site**. No LinkedIn scraping, no personal-email harvesting from third-party sources.
- Only emails the company chose to publish → UU PDP / GDPR exposure stays low.
- Respect `robots.txt`, throttle per-domain, skip on 403/timeouts. This is a polite crawler, not a scraper hammer.

## Inputs / outputs

**Input:** `{ domain: string, company_name?: string, target?: { first_name, last_name } }`

**Output (JSON):**
```jsonc
{
  "domain": "acme.co.id",
  "pages_scanned": 6,
  "page_urls": ["https://acme.co.id/tentang-kami"],
  "emails": [
    { "email": "budi@acme.co.id", "name": "Budi Setiawan",
      "role": "Direktur", "page_url": "...", "kind": "individual" }
  ],
  "pairs": [ { "name": "Budi Setiawan", "email": "budi@acme.co.id" } ],
  "pattern": { "winner": "first", "confidence": 0.8,
               "ranked": ["first", "first.last", "f.last"] },
  "direct_hit": null,
  "notes": ["cf-obfuscation-decoded: 2", "robots-blocked: /hr"]
}
```

## Pipeline

```
domain (+ optional target)
  → 1. Seed page discovery     (candidate paths + sitemap.xml)
  → 2. Fetch (bounded, polite) (depth 1, per-page timeout)
  → 3. Email extraction        (regex + obfuscation decoders)
  → 4. Name pairing            (DOM-aware proximity, card/li blocks)
  → 5. Filter & classify       (keep/drop rules; kind: individual / role / external)
  → 6. Pattern inference       (pairs → winner + ranked list)
  → 7. Dedup + normalize       (lowercase, page-seen set, dedupe by email)
  → 8. Output contract
```

### 1. Seed page discovery

- Candidate paths (all 404-safe, fetched lazily in priority order): `/`, `/contact`, `/contact-us`, `/kontak`, `/hubungi-kami`, `/team`, `/about`, `/about-us`, `/tentang-kami`, `/people`, `/direksi`, `/management`, `/founder`, `/about/team`.
- Parse `/sitemap.xml` and `/robots.txt` for extra URLs matching keywords (`team`, `contact`, `about`, `founder`, `people`, `staff`, `direksi`, `management`).
- Budget: cap at **10 pages / lead**, depth 1, dedupe via page-seen set.

### 2. Fetch

- Per-page timeout 5s; honor `robots.txt`; retry once on transient 5xx.
- Skip non-HTML content types (pdf, zip, images).
- If a page is JS-rendered (Cloudflare / React without SSR) → note it, accept lower coverage. Headless browser (Playwright) is a phase-2 option only if benchmark shows it's worth the cost.

### 3. Email extraction

Regex + obfuscation decoders:

- Plain: `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`
- `mailto:` links.
- HTML entities: `&#64;`, `&#46;`.
- Text obfuscation: `name [at] domain [dot] com`, `(at)`, `(dot)`, ` at `.
- **Cloudflare `data-cfemail`**: implement the well-known XOR decoder (hex XOR against key; public algorithm).
- JS-encoded (`atob(...)`): skip in v1 (rare, low yield).

### 4. Name pairing (DOM-aware)

- **Verified (2026-08-12, read-only on VPS): the native-bridge has NO DOM/HTML parser.** `package.json` deps are only `@modelcontextprotocol/sdk`, `express`, `zod` — it is a thin MCP→n8n-webhook proxy and never parses HTML. A parser must be added. Recommend **`cheerio`** (MIT, jQuery-like, purpose-built for server-side scraping, cheap); `parse5` is an alternative if a raw WHATWG parser is preferred, but `cheerio` gives selection for free.
- Group by plausible unit: `li` / `article` / `.team-card` / `.profile` / `section`. Within a unit containing an email, extract the name as the nearest title-cased 2–4 word sequence (allow `Dr.`, `Hj.`, `Ir.`, `R.` prefixes; Indonesian names are multi-word — don't over-tokenize).

### 5. Filter & classify

| Kind | Rule | Use |
|---|---|---|
| `individual` | local part looks like a person (not role-based); matches a harvested name | pattern inference + direct-hit |
| `role` | `info@`, `sales@`, `support@`, `admin@`, `hello@`, `noreply@`, `kontak@`, `cs@` … | drop from pattern inference; keep as company contact only |
| `external` | different domain (e.g. person's own domain, gmail published on team page) | keep, flagged; never used for pattern inference |

Role-based blocklist is an explicit list + `local_part` heuristics (no digits unless person-like, no known roles).

### 6. Pattern inference

For each `individual` pair: normalize first/last, compare against local part, classify pattern (candidate set below), tally votes. Winner = highest vote count; tie-break by global fallback priority.

Pattern candidates (ordered by default priority): `first`, `first.last`, `f.last`, `firstl`, `flast`, `first_last`, `last.first`.

Confidence: `max(votes / total_individual_pairs, 0.5)` when ≥1 pair; else no winner (empty pattern → pipeline uses default priority list).

### 7. Dedup & normalize

Lowercase, trim dots/hyphens at edges, dedupe by email; track page-seen set; dedupe identical `(name,email)` pairs.

## Module layout (Node, native-bridge)

```
lib/email-harvester/
  harvester.mjs        # orchestrates 1→8, per-lead budget + politeness
  seeds.mjs            # path candidates, sitemap/robots parsing
  extract.mjs          # regex + obfuscation decoders (incl. data-cfemail)
  pairs.mjs            # name/email proximity pairing
  filter.mjs           # keep/drop rules, kind classification, role blocklist
  patterns.mjs         # inference + ranked output
  robots.mjs           # robots.txt honor (or reuse existing if present)
```

Interface: `export async function harvest({ domain, company_name, target }) → contract`. Pure functions (extract, filter, patterns) are fully unit-testable without network.

## Test plan

**Unit (no network):**
- Regex edge cases: quoted local parts, `+tag`, subdomains, `.co.id`.
- All obfuscation decoders incl. known `data-cfemail` vectors.
- Indonesian name normalization: `Budi Setiawan`, `Dr. Siti Nurhaliza`, `Hj. Rina`, `Ir. Agus`, one-word names.
- Role blocklist classification, external-domain flagging.
- Pattern inference on synthetic pair sets (winner, confidence, tie-breaks, empty).

**Fixtures:** 6–8 sample HTML pages (EN contact/team, Indonesian `/tentang-kami` + `/kontak`, Cloudflare-obfuscated, one JS-rendered) stored under `test/fixtures/`.

**Live (integration, low volume):** 10–15 known Indonesian company sites with published team pages; assert pairs extracted, no crashes on 403/robots/timeouts, per-domain throttle honored.

## Open questions

- ~~Does the native-bridge already ship a DOM/HTML parser we can reuse?~~ **Answered 2026-08-12: no.** Only `@modelcontextprotocol/sdk`/`express`/`zod`. Plan: add `cheerio`.
- Should `external` personal-domain emails (e.g. gmail published on a team page) ever be returned to the customer, or only ever used internally as signals?
