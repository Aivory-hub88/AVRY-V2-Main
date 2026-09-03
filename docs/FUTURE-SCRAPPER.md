# Future Scrapper — Lead Enrichment (Business Email + Mobile Phone)

**Status: ON HOLD (2026-08-12).** Backend is fully built and live-verified in production. Paused by the user over third-party data-provider cost, not by any technical or legal blocker in the implementation itself. Do not resume without an explicit ask.

> **2026-08-12 update — data-source research reopened, decision recorded in [ADR-006](ADR-006-EMAIL-PHONE-ENRICHMENT-SOURCE.md).**
> User asked whether a free-but-sophisticated Lusha alternative exists. Findings: commercial vendors all block resale without a written agreement; Indonesia *mobile* coverage is thin across every global provider (incl. Lusha); and OSS self-hosting solves the **email side only**. Decisions: **email → OSS self-hosted pipeline** (replaces Hunter, $0 fixed, ~99% margin, pending a 200-lead Indonesia benchmark), **phone → unresolved** (no OSS path; Lusha viable only via reseller agreement + coverage test, or re-scoped/dropped), **reverse engineering → rejected** (reaffirmed). Design docs: [`OSS-EMAIL-FINDER-PIPELINE.md`](OSS-EMAIL-FINDER-PIPELINE.md) · [`OSS-EMAIL-HARVESTER.md`](OSS-EMAIL-HARVESTER.md) · [`OSS-EMAIL-IMPLEMENTATION.md`](OSS-EMAIL-IMPLEMENTATION.md).

## What this is

A paid add-on for Cerveau's `leads_qualifier` agent: given a lead's name/company, look up a verified business email and mobile phone number, spend from a per-tenant prepaid wallet, and write the result back onto the lead. Built as a monetized feature (target 60–70% gross margin, 55% floor), not a cost center.

## Current state — safe to leave exactly as-is

Everything below is live on production `:3100` and the real Midtrans payment path, and **costs $0/month right now** because the two provider API keys were deliberately never added (placeholder credentials only). Every real lookup today gracefully finds nothing and charges nothing — verified, not assumed.

| Piece | Where | Status |
|---|---|---|
| Schema | `aivory_ops.leads` (+`phone`,+`website`), new `aivory_ops.enrichment_wallet`/`enrichment_ledger` + atomic `consume_/credit_enrichment_wallet()` functions | Live, tested |
| Bridge tool | `enrich_lead_contact` in `aivory-native-bridge/agents/leads-qualifier.mjs` | Live |
| n8n workflow | New 16-node branch in `Native Leads Qualifier Bridge` (`ebaq7yFRfYdrL3gT`) — lead lookup, wallet pre-check, Hunter email call, Lusha phone call, atomic debit-on-match only | Live, regression-tested against all 5 pre-existing actions |
| Approval tiering | `enrich_lead_contact` classified `reversible`, auto-approved on `agent_analyst_brain` in `config.toml` | Live, stable |
| Wallet top-up | `avry-payments/pricing.py` (`enrichment_topup_<usd>`, $5–$500) + `avry-backend/entitlements.py` (new branch inside the same idempotent `billing.entitlement_grants` transaction, calls `credit_enrichment_wallet()`) | Live, verified idempotent + two-tenant isolated |
| Provider credentials | n8n `httpHeaderAuth` credentials `Hunter API Key` (`9EjOKdR0tc7HxXhq`) / `Lusha API Key` (`h0uUSvBDnJrhVAyW`) | **Placeholder only** — no subscription started |

**Durability gap:** the `pricing.py`/`entitlements.py` edits were applied live inside the running Docker containers — no source bind-mount exists for either, code is baked into the image at build time. They survive a container restart but **not a rebuild/redeploy**. Backups: `pricing.py.bak-pre-enrichment`, `entitlements.py.bak-pre-enrichment` next to the originals inside each container. Before any future redeploy of `avry-payments`/`avry-backend`, port the same 2-file diff into whichever repo those images actually build from, or the feature silently reverts.

## Unit economics (as designed, not yet re-validated against real volume)

| | Cost to Aivory | Retail price | Marginal margin |
|---|---|---|---|
| Email reveal | $0.021 (Hunter Growth, $104/mo ÷ 5,000 searches, billed only on match) | $0.20 | 89.5% |
| Phone reveal | $0.30 (Lusha, 5 API credits × ~$0.06 blended) | $2.00 | 85% |

Fixed cost if both subscriptions are live: $173.90/mo (Hunter Growth $104 + Lusha Pro $69.90). Breakeven combined volume ≈ 90/mo; blended margin clears the 55% floor above ~180–300/mo combined lookups and reaches the 60–70% target range above ~600/mo. Below ~90/mo the fixed cost isn't a per-unit pricing problem — no retail price alone fixes it, only volume does.

**Caveat surfaced but not resolved before the hold:** Lusha's own docs put real API access behind the Premium plan ($399.90/mo) or a custom-quoted Scale plan — not the cheaper Pro tier ($69.90/mo) this math was originally built around. Public pricing blogs disagree with each other and with Lusha's docs on this point. **Get a real quote from Lusha before reusing any of this math.**

## Why not go cheaper via OSINT tooling — decision record

User's core objection was Hunter+Lusha's ~$174/mo fixed cost. Four alternative tools were proposed and evaluated:

- **Websift** — real, but an unmaintained hobbyist GitHub shell script (curl/grep/wget), author's own disclaimer: "ethical OSINT... only on websites you own or have permission for." The *legitimate* part of what it does (scrape a company's own published Contact/Team page) is fine and cheap to reimplement directly — see "Legitimate cheaper paths" below.
- **Batscram** — no trace found anywhere; unverifiable, possibly doesn't exist under this name.
- **Telespotter Raven** — real: a Telegram OSINT toolkit built for investigators tracking *individuals'* phone numbers. Wrong category entirely — investigation tooling, not business-contact discovery.
- **Socialosint** — real: scrapes personal social-media profiles for emails and cross-references PwnDB for leaked credentials tied to a target. No lead-gen use case for breach-credential lookups; the only real uses of that data are account takeover or extortion.

**Declined to "reverse engineer" the latter two into the commercial product.** Not just a ToS concern: harvesting individuals' personal data without consent, for a paid outreach product Aivory sells to its own customers, is a direct UU PDP (Indonesia) / GDPR exposure for **Aivory as a company**, not only for whoever runs the scraper. This reasoning also killed an earlier, separate ask in the same conversation to build a LinkedIn profile scraper for the same feature — same ToS/personal-data logic applies regardless of language (Rust vs. Python) or which specific tool is named.

> **2026-08-12 — superseded in scope by [ADR-006](ADR-006-EMAIL-PHONE-ENRICHMENT-SOURCE.md).** The reverse-engineering rejection above is **reaffirmed as a decision (D1)**, and the full data-source decision record (Lusha vs commercial alternatives vs OSS self-hosted vs reverse engineering) now lives there.

## Legitimate cheaper paths, not yet built

Neither of these was picked up before the hold — both are still open if this resumes:

1. **Scrape a company's own published contact page.** Zero API cost, no OSINT/consent problem — it's data the company itself chose to publish. `reqwest`/`scraper` in Rust, or reuse the native-bridge's existing Node stack. This alone could replace Hunter for the email side entirely for companies with a findable Contact/Team page. **2026-08-12: now designed in detail as the self-built harvester** — [`OSS-EMAIL-HARVESTER.md`](OSS-EMAIL-HARVESTER.md) (theHarvester itself is unlicensed, so it's self-built), feeding the full OSS email pipeline in [`OSS-EMAIL-FINDER-PIPELINE.md`](OSS-EMAIL-FINDER-PIPELINE.md).
2. ~~Cheaper commercial email-finder alternatives to Hunter (Snov.io, FindyMail, Icypeas, Anymail Finder)~~ — **superseded by ADR-006 D2:** email is decided as OSS self-hosted; commercial alternatives remain only as fallback if the validation gate fails (and would then require a written embedding agreement anyway).

## If this resumes

Read this file first, then [`docs/CERVEAU-STATUS.md`](CERVEAU-STATUS.md) for how the native-bridge toolkit pattern generally works, and **then [ADR-006](ADR-006-EMAIL-PHONE-ENRICHMENT-SOURCE.md) for the current data-source decision** (email → OSS self-hosted, phone → open, reverse engineering → rejected). The OSS email branch is fully designed (pipeline / harvester / implementation docs above) and gated on its 200-lead Indonesia benchmark. Re-check Lusha's actual API-tier pricing and run that benchmark before re-committing to the $173.90/mo Hunter+Lusha baseline this was originally costed against.
