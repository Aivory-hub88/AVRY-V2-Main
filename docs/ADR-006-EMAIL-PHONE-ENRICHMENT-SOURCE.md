# ADR-006 — Lead Enrichment Data Source: Lusha vs Commercial Alternatives vs OSS Self-Hosted vs Reverse Engineering

**Date:** 2026-08-12
**Status:** Accepted — email: OSS self-hosted (pending validation gate); phone: unresolved, open; reverse engineering: rejected.
**Context:** The enrichment add-on in [`FUTURE-SCRAPPER.md`](FUTURE-SCRAPPER.md) is a paid feature Aivory **resells to its own customers** (per-tenant prepaid wallet, debit-on-match). Original cost model was Hunter ($104/mo) + Lusha ($69.90/mo) = $173.90/mo fixed, on hold over provider cost. User asked whether a free-but-sophisticated Lusha alternative exists. Research across ~12 providers + OSS landscape surfaced three hard constraints that dominate the decision:

1. **Resale is the real blocker, not price.** Every commercial provider researched (Apollo, Hunter, Lusha, LeadMagic, Anymail Finder, Dropcontact, Icypeas) permits its plans for *internal business use only* and prohibits reselling/embedding enrichment into a third-party product without a **signed written agreement**. Free tiers never grant resale rights. Using them to power a resold add-on is a ToS breach.
2. **Indonesia coverage.** Aivory's market is Indonesia (Midtrans, IDR). Global B2B contact databases — including Lusha — have thin-to-absent Indonesian *mobile* coverage (LeadMagic's mobile finder is "USA primary"; 70M+ mobiles). This is a market-fit problem independent of cost.
3. **UU PDP / GDPR exposure.** Harvesting individuals' personal data (emails, phones, LinkedIn profiles) without consent is a direct liability for **Aivory as a company**, not just for whoever runs the scraper.

## Options evaluated

| Option | Email | Phone | Resale-clean | Indonesia coverage | Notes |
|---|---|---|---|---|---|
| **A. Lusha (paid)** | yes | yes | ❌ needs written agreement | unverified, likely thin | API behind Premium $399.90/mo per Lusha docs; the doc's $69.90/mo math was flagged as unreliable |
| **B. Commercial alternatives** (Apollo, LeadMagic, Hunter Data Platform, Anymail, Dropcontact, Icypeas, Snov.io) | yes (some) | some (LeadMagic/RocketReach) | ❌ all need written agreement | mobile mostly US/EU | pay-as-you-go cheaper than Hunter+Lusha (email ~$0.002–0.02/valid) but still not free, still resale-blocked |
| **C. OSS self-hosted** (self-built harvester + Reacher SMTP verify + libphonenumber) | **viable** | ❌ **structural dead end** | ✅ no vendor ToS | email: best for companies with own domain; phone: none | Ops cost = SMTP IP-reputation management. theHarvester is unlicensed; PhoneInfoga unmaintained + personal-data OSINT |
| **D. Reverse engineering** (LinkedIn/personal-profile scraping, phone OSINT like PhoneInfoga/Socialosint) | ❌ | ❌ | ❌ | n/a | **Rejected.** Personal data without consent = UU PDP/GDPR exposure; ToS breach of scraped platforms |

## Decisions

### D1 — Reverse engineering: **rejected (reaffirmed)**
Consistent with the earlier decision record in FUTURE-SCRAPPER.md §"Why not go cheaper via OSINT tooling". This applies regardless of language (Rust/Python/Node), tool name, or whether it targets LinkedIn, personal emails, or mobile numbers. Non-negotiable.

### D2 — Email: **OSS self-hosted pipeline replaces Hunter**
Self-built harvester (theHarvester has **no license** → must be self-built; design in [`OSS-EMAIL-HARVESTER.md`](OSS-EMAIL-HARVESTER.md)) + pattern generation + SMTP verification via self-hosted **Reacher** ([`check-if-email-exists`](https://github.com/reacherhq/check-if-email-exists), MIT/AGPL — get legal sign-off) + 2-tier cache. Kills the $104/mo fixed cost; estimated ~99% margin at $0.20 retail vs Hunter's 89.5%. Full design: [`OSS-EMAIL-FINDER-PIPELINE.md`](OSS-EMAIL-FINDER-PIPELINE.md), implementation: [`OSS-EMAIL-IMPLEMENTATION.md`](OSS-EMAIL-IMPLEMENTATION.md).

**Contingent on a validation gate before build** (benchmark 200 Indonesian leads vs Hunter paid trial): pass = OSS verified-email find-rate ≥ ~70% of Hunter's on the same set, catch-all handling acceptable, measured cost < $0.005/verified email. Fail = revisit (commercial pay-as-you-go with a negotiated embedding agreement).

### D3 — Phone: **no OSS path; not resolved**
No open dataset maps person → mobile; the gap is structural, self-hosting cannot create it. Options, in order:
1. **Lusha (Option A) only via a written reseller/embedding agreement**, and only if a sample test confirms Indonesian mobile find-rate > 0 (expected to be low). Re-verify Lusha's actual API-tier price before any commitment.
2. **Re-scope phone** to company/founder-published contact data (WA/phone published by the company itself — common in Indonesia on site footer, Instagram bio, Google Business). Legit, self-published, but crawler-based and mostly company-level.
3. **Drop phone from v1**; ship email-only enrichment, add phone later behind its own economics.

### D4 — Re-validate before resume
Per FUTURE-SCRAPPER.md's existing instruction: re-check Lusha pricing and the OSS benchmark results before committing any build or budget.

## Consequences

- **Email:** three new design docs (pipeline, harvester, implementation); new artifacts to source-control and bind-mount from day 1 (avoiding the `pricing.py`-style baked-into-image gap); one new dependency (`cheerio`) added to a **separate** `aivory-email-enrich` service, not the thin native-bridge MCP proxy.
- **Phone:** no build yet. No new spend. Validation test decides between D3-1, D3-2, D3-3.
- **Wallet/ledger/pricing** untouched; the atomic `consume_enrichment_wallet()` debit-on-match flow is reused as-is.

## Research note — OSS "Lusha alternatives" checked 2026-08-12 (verdict: decision unchanged)

A follow-up list of supposed OSS Lusha alternatives was verified directly against GitHub (repo metadata: license field, stars, last push — not README claims). **None is a Lusha replacement in the sense that matters (per-person business email + mobile lookup for a named individual); none touches the Indonesia phone problem; none changes D1–D3.**

| Tool | Repo | Verified facts | Notes |
|---|---|---|---|
| Fire Enrich | `firecrawl/fire-enrich` | ✅ exists, MIT, 1.2k★, **last push Oct 2025** (~10 mo stale — "aktif" claim is false) | Company-level enrichment (email → firmographics/funding/tech stack), not contact lookup; requires Firecrawl + OpenAI keys (BYOK, not free-to-run) |
| OpenLeads | `Samyrrrrrr990/openleads` | ✅ exists, **6★**, license field `NOASSERTION` (⚠️ not a standard OSS license — same trap as theHarvester), last push Jun 2026 | Lead *discovery* from public data (YC/HN/OSM/Wikidata/GitHub) for tech founders; OSINT/SMTP tagged; mostly US/global, no Indonesia angle |
| KeeLead | `Atum246/keelead` | ✅ exists, MIT, **14★**, last push Apr 2026 | Lead-gen engine (Next.js, MCP server); young, unproven |
| opengtm | `buildingopen/opengtm` | ✅ exists, MIT, **18★**, last push Apr 2026 | Requires Gemini API (paid per use); forks exist, none above ~0★ |
| Soyuz | n/a | ❌ **not found** on GitHub | unverifiable |
| YALC | via `salim-ship-it/outbound-os` | ⚠️ 0★, archived project referencing it | obscure |
| Bricks | n/a | not verified this pass | — |

**Conclusion:** these are either (a) company-level enrichment (Fire Enrich — potentially useful as a *separate* firmographics add-on, not this feature), (b) lead-discovery engines whose email verification is the same pattern+SMTP approach D2 already designs, or (c) orchestration layers. All are too immature (≤18★) or stale to be dependencies of a resold paid feature, and OpenLeads/YALC carry license-ambiguity risk. D2 (self-built OSS pipeline) remains the right call; no doc change required.
