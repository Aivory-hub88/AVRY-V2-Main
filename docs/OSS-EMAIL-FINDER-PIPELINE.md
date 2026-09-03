# OSS Email-Finder Pipeline — Self-Hosted Hunter Replacement (Email Side)

**Status: DRAFT (2026-08-12).** Companion to [`FUTURE-SCRAPPER.md`](FUTURE-SCRAPPER.md) and governed by decision record **[ADR-006](ADR-006-EMAIL-PHONE-ENRICHMENT-SOURCE.md)** (email → OSS self-hosted, phone → open, reverse engineering → rejected). Replaces the Hunter email branch with a self-hosted OSS pipeline. Does **not** change the phone side — there is no OSS path for person→mobile data (see FUTURE-SCRAPPER decision record + research below).

## TL;DR

- Self-hosted email enrichment removes the vendor resale blocker entirely (no Hunter ToS) and eliminates the `$104/mo` Hunter Growth fixed cost.
- Stack: domain discovery → published-email harvest → pattern inference → candidate generation → SMTP verification via self-hosted [Reacher](https://github.com/reacherhq/check-if-email-exists) (9.4k★, Rust, ships an HTTP backend) → ranking + catch-all guard → cache → atomic wallet debit on match.
- Estimated marginal cost ≈ **$0.001–0.003 per verified email** vs Hunter's `$0.021`. At the designed retail `$0.20`, margin jumps from 89.5% to **~99%**, with `$0` monthly fixed cost for email.
- Main risks (validate before committing): Indonesian find-rate on SMEs that use personal Gmail (no company domain), catch-all domains that can't be verified, and SMTP probing IP-reputation ops at scale.

## Why OSS fixes the blocker

Every commercial provider researched (Hunter, Lusha, Apollo, LeadMagic, Dropcontact, Anymail Finder) prohibits reselling/embedding enrichment into a product without a signed custom agreement. Free tiers are internal-use-only. Self-hosting removes the vendor ToS layer entirely — the compliance burden shifts to Aivory's own use of the data (UU PDP / GDPR), which is already the operating baseline for the feature.

## Architecture

```
lead (name, company, website?)
      │
      ▼
┌─ 1. DOMAIN DISCOVERY ──────────────┐
│  company name → candidate domains   │  DNS A/MX check (email-capable only)
│  + homepage title/meta match check  │  + search fallback / OpenCorporates (secondary)
      ▼
┌─ 2. PUBLISHED-EMAIL HARVEST ───────┐
│  crawl /contact /team /about /tentang-kami, mailto:, footer
│  extract (email, name) pairs        │  ← target hit? → return directly, source=published
      ▼
┌─ 3. PATTERN INFERENCE ─────────────┐
│  harvested pairs → naming pattern   │  (first.last / f.last / firstl / first …)
      ▼
┌─ 4. CANDIDATE GENERATION ──────────┐
│  ranked list of 2–6 candidates      │  (pattern-ranked, else default priority)
      ▼
┌─ 5. VERIFICATION (Reacher) ────────┐
│  syntax → disposable filter → MX    │
│  SMTP RCPT: deliverable/unknown/catch_all/undeliverable
      ▼
┌─ 6. RANK + CATCH-ALL GUARD ────────┐
│  pick best verified candidate;      │  catch_all → downgrade, never full charge
      ▼
┌─ 7. CACHE + WALLET DEBIT ──────────┐
│  enrichment_email_cache (30d TTL)   │  atomic consume_enrichment_wallet() on match
      ▼
   write email + confidence → aivory_ops.leads
```

### Components

| Component | Stack | Notes |
|---|---|---|
| Orchestrator | Node (native-bridge style) | new internal tool, e.g. `enrich_lead_email_oss`; or branch inside `enrich_lead_contact` |
| Domain resolver | Node / DNS libs | candidate TLDs: `.com`, `.co.id`, `.id`, `.co`; keep only MX-capable domains |
| Harvester | custom fetch+parse (self-built) | crawl contact/team pages + `mailto:`; full design in [`OSS-EMAIL-HARVESTER.md`](OSS-EMAIL-HARVESTER.md). theHarvester not used — no license |
| Candidate generator | Node | deterministic rules + ranking |
| Verifier | [Reacher](https://github.com/reacherhq/check-if-email-exists) (Rust, self-hosted HTTP) | SMTP verification without sending mail; catch-all + disposable detection |
| Disposable filter | OSS list (`disposable-email-domains` / `mailchecker`) | pre-MX filter |
| Cache | `aivory_ops.enrichment_email_cache` | (domain, local_part) → status; 30d TTL; re-runs within TTL are free |
| Prober egress | rotating proxy pool or pool of dedicated IPs | see Ops section |
| n8n | `Native Leads Qualifier Bridge` (`ebaq7yFRfYdrL3gT`) | replace Hunter httpHeaderAuth call node with internal HTTP call to the OSS service; keep wallet pre-check + debit-on-match nodes |

### Stage notes

1. **Domain discovery** — `aivory_ops.leads` already carries `website`; use it when present. For name-only leads: slugify candidates + DNS MX gate, then confirm by fetching homepage and checking `<title>`/meta against company tokens. Search fallback (Bing free 1k/mo) and OpenCorporates API (CC-BY, official domain) are secondary — Indonesian coverage in OpenCorporates is weak.
2. **Harvest** — also serves pattern discovery and occasionally a direct hit (highest-confidence result, no SMTP needed). Indonesian company sites commonly publish founder/director contact info — crawl `/tentang-kami` too.
3. **Pattern inference** — only from pairs harvested on the same page/role block to avoid garbage; fallback to default priority order otherwise.
4. **Candidates** — first.last, f.last, firstl, first, flast, first_last (2–6, ranked by inferred pattern when available).
5. **Verification** — Reacher classifies each candidate; keep `deliverable` (high confidence) vs `unknown`/`catch_all` (low). Never bill a catch-all as verified.
6. **Catch-all guard** — if domain is catch-all, return at most a `best_guess` result at reduced/zero charge, or nothing. This is the quality knob that protects the "verified email" promise.
7. **Cache + debit** — same atomic wallet flow already live (`consume_enrichment_wallet()`, debit-on-match only). Add the cache table before the debit so duplicates within a batch and re-runs within TTL never double-spend or re-probe.

## Ops & IP-reputation management (the hidden real cost)

SMTP probing at volume is what separates "script" from "service":

- Run verification egress on a **separate IP/proxy pool** from the product and from any email-sending infrastructure (protects sender reputation).
- Dedicated IPs ≈ `$2–5/IP/mo`; as a rule of thumb ~5 IPs at 10k checks/mo, ~20 at 100k/mo. Rotating residential proxies are an alternative (GB-billed) but messier for SMTP.
- Throttle per-domain, add jitter/backoff, honor RFC (no hammering), monitor Spamhaus / IP-score.
- Cache aggressively (catch-all per-domain, results per-email) to cut probe volume.

## Integration with current stack (from FUTURE-SCRAPPER.md)

- **Bridge tool** `enrich_lead_contact` (`aivory-native-bridge/agents/leads-qualifier.mjs`): email branch → internal OSS service; phone branch unchanged (still Lusha or equivalent paid provider).
- **n8n** branch in `Native Leads Qualifier Bridge`: swap the Hunter email node for an internal HTTP node; keep wallet pre-check, atomic debit, and write-back nodes as-is. Node-by-node diff, cache schema, and service API in [`OSS-EMAIL-IMPLEMENTATION.md`](OSS-EMAIL-IMPLEMENTATION.md).
- **Wallet/ledger/pricing** unchanged (`enrichment_topup_*`).
- **New**: `aivory_ops.enrichment_email_cache`.
- **Durability**: this is new source — bind-mount/version it from day 1 (unlike the `pricing.py`/`entitlements.py` baked-into-image gap that FUTURE-SCRAPPER.md warns about).

## Cost model vs margin (email side)

Assumptions: retail `$0.20` (as designed), marginal infra on existing VPS, SMTP probe IPs as above.

| Volume/mo | Prober IP cost | Per-verified-email cost | Retail `$0.20` margin |
|---|---|---|---|
| 1k | ~$0 (shared/loose) | ~$0.001 | ~99.5% |
| 10k | ~$10 | ~$0.003 | ~98.5% |
| 50k | ~$40–60 | ~$0.002 | ~99% |
| 100k | ~$100 | ~$0.0015 | ~99.2% |

Compare: Hunter `$0.021`/email → 89.5% margin, plus `$104/mo` fixed. OSS ≈ **`$0` fixed + ~99% margin**. There is headroom to cut retail email price (e.g. `$0.10`) to drive volume while still clearing the 55–70% margin floor.

Catch-all/bounce policy (mirror Anymail-style credit-back) shaves ~1–3% margin — immaterial at these numbers.

## Risks & honest caveats

1. **Indonesia find-rate.** SMEs commonly use personal Gmail/Outlook (no company domain) → pattern engine can't run. Expect good coverage only for companies with their own domain. Must be measured, not assumed.
2. **Catch-all domains** can't confirm an individual mailbox; quality ceiling below Hunter/Anymail on those domains. Handled by downgrade, not fake "verified".
3. **IP-reputation ops** is the real engineering cost at scale; cheap at low volume, grows with volume.
4. **Legal:** business emails harvested from company-published pages are fine (company chose to publish). Do **not** pivot to harvesting personal emails/phones/LinkedIn scraping — same UU PDP/GDPR exposure FUTURE-SCRAPPER.md already rejected.
5. **Licenses:** theHarvester has **no license** (risky to embed — reimplement its trivial scrape logic instead). Reacher is AGPL/custom — fine as an internal self-hosted service; get legal sign-off on the AGPL network-service obligation before exposing it as a customer-facing backend.

## Validation gate (before building anything)

Run a benchmark first — this decides yes/no:

1. Curate **200 Indonesian leads** spanning: mid/large companies with own domain, SMEs, digital agencies.
2. Run each through: Hunter (paid trial), the OSS pipeline (manual/hand-rolled for the test), and manual verification.
3. **Pass criteria:** OSS verified-email find-rate ≥ ~70% of Hunter's on the same set, catch-all handling acceptable, and measured cost < `$0.005`/verified email.
4. Optional: send 10–20 test emails to validate Reacher's verification against real bounces before promising customers a "verified" badge.

## Open questions

- Expected lookup volume/concurrency (drives IP pool sizing).
- Is there room to lower the retail email price to `$0.10` for volume?
- Egress preference: dedicated IPs vs residential proxy pool.
- Does the phone side stay Lusha (paid, custom agreement) or get re-scoped once email is near-zero-margin?
