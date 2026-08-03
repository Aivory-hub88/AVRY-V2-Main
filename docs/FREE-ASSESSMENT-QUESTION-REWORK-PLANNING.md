# Free Assessment — Question Set Rework (AI-readiness → Business Operations)

**Status:** SHIPPED — all five phases live on aivory.uk since 2026-08-03. See §0 for what actually shipped vs this plan, and §9 for what is still open.
**Owner:** Irfan · **Source:** product decision, 2026-08-02 · **Owner decisions resolved:** §7
**Scope:** the 12-question set and its scoring (Phases 1–4), plus the PDF report artefact that renders the result (Phase 5)
**Surface:** `aivory.uk/free-diagnostic` — repo `Aivory-hub88/Frntend-nxt` (local checkout `frontend/frontend-nextjs`, VPS checkout `/home/ubuntu/AVRY-V2-Main`, container `avry-website`)
**Key files (post-ship):** `src/app/free-diagnostic/page.tsx` (scoring, selection, JSX), `src/lib/assessmentCopy.ts` (all EN/ID strings, ~220 of them), `src/lib/assessmentPdf.ts` (A4 report), `public/aivory-signature.png` (rasterised logo, used by both the PDF and the report email)
**Companion docs:** [`OPS-TRANSFORMATION-NARRATIVE-BRIEF.md`](OPS-TRANSFORMATION-NARRATIVE-BRIEF.md) (paid report, ops-first reframe — already shipped), [`DEEP-DIAGNOSTIC-RESULT-PLANNING.md`](DEEP-DIAGNOSTIC-RESULT-PLANNING.md)

---

## 0 · Shipped status (2026-08-03)

Everything in Phases 1–5 is live. Three things shipped **differently from how this
document originally specified them** — each was a deliberate, in-flight decision,
not a slip, and each is called out at its exit gate below so nobody "fixes" it back
to the original spec without knowing it was overridden on purpose.

1. **The PDF is the card, full-bleed cream gradient and all — not a white page with
   cream accents.** §7.1.1 point 4 originally called for inverting the ground
   (white page, cream as accent blocks) to save toner and read as a document. The
   first shipped version did exactly that. The owner rejected it on sight
   ("JELEK!!!! better pakai graphic style yang sama dengan card versi PNG") and the
   PDF was rebuilt to reproduce the card's `radial-gradient` ground, dial, and
   logo placement pixel-for-pixel — every size in `assessmentPdf.ts` is written in
   the card's own 900px content-box pixels and scaled by one factor for exactly
   this reason. See §0.1.
2. **The free assessment is bilingual (English/Indonesian); this was never in
   scope here.** Added mid-build from a separate scorecard critique the owner
   raised. See §0.2 — it is documented here because it touches the same files and
   the same identifier-stability constraint this doc already cares about.
3. **Three blockers is a ceiling, not a floor.** §4.4 and the Phase 1 exit gate
   say "three blockers always render." Shipped behaviour: a dimension scoring in
   the Defined band or above (≥65/100) is never called a blocker, so a strong
   run legitimately shows fewer than three (a perfect run shows none). The
   alternative — telling a company with five healthy dimensions that three of
   them are "constraints" — was worse than breaking the letter of the exit gate.
   Symmetrically, a dimension below the Developing band (<50/100) is never
   called a strength, so an all-weak run doesn't get told its least-bad
   dimension is "working for you." See §4.4a.

### 0.1 · PDF build notes

`src/lib/assessmentPdf.ts` renders with jsPDF, no HTML/CSS:
- Ground: the card's `radial-gradient(120% 90% at 28% 0%, #fff 0%, #fbfaf7 45%,
  #f2f0ea 100%)` painted as 64 concentric ellipses (jsPDF has no gradient
  primitive) — vector, not a raster fill, so the file stays ~50–65KB.
- Dial: copied unit-for-unit from the card's own 200-unit SVG viewBox (tick
  ring r84–r92, needle r79–r96, dome r70) rather than approximated — an
  approximated version shipped first and visibly didn't match the card.
- Logo: **fetches the pre-rasterised `public/aivory-signature.png`**, not a
  live SVG→canvas rasterisation. The first version rasterised
  `Aivory_Signature_Grey.svg` via `Image()` + `<canvas>` on every build; that
  path failed silently in some runs (the `catch` swallowed it) and jsPDF fell
  back to drawing the word "AIVORY" in plain Helvetica, which shipped to a
  live report. Fetching the same PNG the email already used removed the
  second, fragile render path entirely.
- The closing-hook panel is tinted `#faf9f5` (one shade lighter than the
  `#f2f0ea` ground) with a `1px #dcdcd7` hairline, not plain white with a 2px
  black outline — the original made the panel read as a foreign element
  pasted onto the page.

**A real, separate infrastructure bug surfaced while chasing the logo
failure and is worth recording here because it looks identical to a code bug
if re-discovered cold:** Cloudflare Hotlink Protection was enabled on the
`aivory.id` zone and was blocking every `.png`/`.jpg` request on `aivory.uk`
that carried a `Referer` header — which is the normal case for real browser
image loads, `fetch()` included. `.svg` requests and referrer-less requests
(e.g. a bare `curl`) were unaffected, which is why a plain `curl` check on
the logo URL returned 200 and looked fine while real visitors got 403s and
the PDF/email logo silently fell back to text. Fixed 2026-08-03 by turning
Hotlink Protection off on the `aivory.id` zone via the Cloudflare API. Not
part of this rework's scope, but the same class of bug (works for curl,
fails for the actual browser) could resurface for any future static asset
added to this page.

### 0.2 · Bilingual (English/Indonesian) — added mid-build, not originally scoped

Trigger was a scorecard critique from the owner: soft prioritisation, a band
descriptor, a generic next step (all folded into §4 below), plus a request for
an EN/ID language switcher. Implementation:

- `src/lib/assessmentCopy.ts` — every user-visible string (questions, options,
  insights, band narratives, industries, company sizes, UI chrome, PDF chrome)
  in both languages, `getAssessmentCopy(locale)`.
- The switcher drives the site-wide `LanguageProvider` (`components/context/
  LanguageContext.tsx`) that the navbar already used — the choice follows the
  visitor back out to the rest of the site rather than being page-local state.
- **Identifiers still never translate** — this doc's own rule from §3 extends
  naturally to the language split: question ids, dimension keys and maturity
  band names stay English-canonical regardless of display language, because
  they are the same JSONB keys and `maturity` column values §5 already
  documents. A lead answered in Indonesian is the same row shape as one
  answered in English.
- Because of that, **everything written to `assessment_leads` — strengths,
  blockers, industry, company size — is computed a second time from the
  English dictionary before being sent**, regardless of what the visitor
  read on screen. The payload also carries a `locale` field so the language
  is still recorded without contaminating the stored labels.
- Indonesian avoids the word "operasi" (reads as surgery or a military
  operation to a native reader) in favour of "operasional" — flagged by the
  owner mid-build and fixed by rewriting the five affected phrases rather
  than a blind find-replace.
- **The report email stays English-only, by explicit owner decision** ("Indonesian
  language cukup di laman free assessment saja, tidak perlu sampai ke
  email"). The PDF follows the visitor's language; the email does not.

---

## TL;DR (Bahasa Indonesia)

Free assessment masih bertanya soal **AI readiness** ("What is your primary business objective for AI?", "Where is your organization on AI today?"), padahal produk berbayar sudah pindah ke **Business Operations**. Akibatnya corong penjualannya terbalik: yang gratis sudah menghabiskan topik AI, lalu yang berbayar diminta menjual "deep dive AI" — tidak ada yang tersisa untuk dijual.

Rencana ini membalik urutannya. Dua belas pertanyaan diganti menjadi **murni operasional** — tidak ada kata "AI" satu pun di dalam pertanyaan — dan hanya menjawab dua dari lima pertanyaan eksekutif: *di mana kita sekarang* dan *apa yang memperlambat*. Tiga sisanya (*apa yang diubah lebih dulu*, *berapa nilai yang bisa dibuka*, *di mana AI paling berdampak*) sengaja dibiarkan terbuka, dan itulah yang dijual oleh Business Operations Assessment $79. AI muncul **hanya sekali**, di akhir hasil, sebagai kail: *"kami melihat N titik di operasimu yang berpotensi dipercepat — pemetaannya ada di Business Operations Assessment."*

Sekalian membereskan tiga cacat yang ditemukan saat audit: skor 100 mustahil dicapai (`MAX_RAW` salah), nama tingkat maturity berbenturan dengan produk berbayar, dan blok fallback blocker tidak pernah tereksekusi.

Soal artefak hasil: **kartu PNG dipertahankan** sebagai preview di layar dan mata uang media sosial (4:5 memang rasio portrait LinkedIn/Instagram), dan **PDF A4 ditambahkan** untuk diteruskan ke pemegang anggaran, dicetak, dan dilampirkan ke email. Bukan salah satu menggantikan yang lain — keduanya mengerjakan pekerjaan berbeda. Alasan yang menentukan: PNG tidak bisa membawa tautan, sehingga CTA upgrade mati begitu file itu diteruskan. Bahasa visualnya sama; layout-nya menyesuaikan kertas (§7.1.1).

---

## 1 · Why the current set is the wrong instrument

The current 12 questions were written when the product sold "AI readiness". Three consequences:

**It gives away the wrong thing.** The free tier asks about AI objective, AI usage today, AI budget, AI capability, and leadership alignment *on AI adoption*. A visitor finishes it believing they have been told where they stand on AI. The paid product's own pitch is then *"see where AI can fit in"* — which the free tier appears to have already covered.

**It measures intent, not operations.** "What is your primary business objective for AI?" measures how much the visitor has already thought about AI. That is a lead-qualification signal, not an operational fact, and it inflates the score of companies who have merely read about AI while penalising well-run operations that have not.

**It contradicts shipped positioning.** [`OPS-TRANSFORMATION-NARRATIVE-BRIEF.md`](OPS-TRANSFORMATION-NARRATIVE-BRIEF.md) §1 fixed the required story as `Business Operations Assessment → Operational Health → Transformation Blueprint → Transformation Roadmap → Intelligent Operations`, with the explicit rule that **AI is the accelerator, not the narrative**. The paid report, its PDF, and the dashboard were all reworded in July. The free assessment — the very first thing a visitor touches — was never included in that sweep. It is the last AI-first surface in the funnel.

## 2 · The five executive questions, and which tier answers them

From the narrative brief §1. The free tier's job is to answer the first two credibly and make the last three feel urgent and unanswered.

| # | Executive question | Free assessment | Business Operations Assessment ($79) |
|---|---|---|---|
| 1 | Where are we today? | **Answers it** — operational maturity score + dimension profile | Deepens it — 40 questions, 6 dimensions, industry benchmark |
| 2 | What is slowing the business down? | **Names the top constraints** — 3 blockers, no quantification | Quantifies them — hours, cost, decision latency |
| 3 | What should change first? | Deliberately not answered | Prioritised improvement plan |
| 4 | What value can we unlock? | Deliberately not answered | ROI, recovered capacity, cost of delay |
| 5 | Where does AI create the biggest impact? | **Teased once, as the closing hook** | Opportunity mapping, AI Enablement section |

The conversion line writes itself from row 5 and is the only place AI appears:

> Your score shows *where* the friction is. It does not yet show *what a fix is worth* or *where AI can carry the load*. That is the Business Operations Assessment.

**Design rule for this rework:** if a proposed free question would let a visitor answer questions 3, 4, or 5 on their own, it belongs in the paid intake, not here.

## 3 · Proposed question set (12, ops-only)

Grouped into three blocks of four. The block headings are internal — the UI keeps one question per screen. Every question is answerable by an ops or exec person in under 15 seconds, without looking anything up.

`dim` maps each question to the paid product's scoring dimensions (`strategy`, `data`, `process`, `people`, `governance`) so the free profile and the paid radar speak the same language. `security` is intentionally absent — it is a paid-only depth area and a legitimate "what you are not seeing yet" line.

### Block A — Where are we today? (operational baseline)

| # | id | Question | dim | Option ladder (0→3) |
|---|---|---|---|---|
| 1 | `process_documentation` | How are your core processes captured today? | process | Nothing written down · In people's heads, informally · Some SOPs, partly current · Documented and kept current |
| 2 | `workflow_standardization` | If two people do the same task, how similar is the result? | process | Completely different · Broadly similar · Mostly consistent · Identical, by design |
| 3 | `data_availability` | Where does the data you run the business on live? | data | Nowhere central · Scattered across tools and spreadsheets · Partly consolidated · One system of record |
| 4 | `systems_integration` | Do your core systems pass information to each other? | data | No real systems yet · People move data by hand · Some connected, some manual · Connected end to end |

### Block B — What is slowing you down? (friction and its cost)

| # | id | Question | dim | Option ladder (0→3) |
|---|---|---|---|---|
| 5 | `manual_workload` | How much of your team's week goes to repetitive manual work? | process | Most of it · About half · Some, but contained · Very little |
| 6 | `rework_rate` | How often does completed work have to be corrected or redone? | governance | Constantly · Weekly · Occasionally · Rarely |
| 7 | `handoff_delay` | When work passes between teams or systems, what happens? | process | It stalls, often for days · It waits, then someone chases · Minor delays · It moves without waiting |
| 8 | `decision_latency` | From "we need to decide this" to an actual decision, how long? | strategy | Months · Weeks · Days · Same day |

### Block C — Can you act on what you find? (capacity to change)

| # | id | Question | dim | Option ladder (0→3) |
|---|---|---|---|---|
| 9 | `ownership_clarity` | Does each core workflow have a named owner? | governance | No one owns them · Ownership is implied, not stated · Most have an owner · Every one, and they are accountable |
| 10 | `improvement_mandate` | Is there budget and a mandate to change how work gets done? | strategy | Neither · Interest, but nothing committed · Budget being discussed · Funded, with an owner |
| 11 | `change_readiness` | How does the organisation react to changing how work is done? | people | Resists it · Cautious · Open to it · Actively pushes for it |
| 12 | `internal_capability` | Do you have people who can implement operational change? | people | No one · Limited digital skills · Some capable people · A dedicated team |

### What changed and why

| Old question | Disposition | Reason |
|---|---|---|
| `business_objective` ("objective for AI") | **Replaced** by `improvement_mandate` | Measured AI intent; the operational fact underneath is whether change is funded and owned |
| `current_ai_usage` ("where are you on AI today") | **Removed** | Pure AI-readiness. It is the single most on-the-nose question and gives away the paid frame. See §7 for the sales-signal alternative |
| `data_availability` | Kept, reworded | Already operational |
| `process_documentation` | Kept, reworded | Already operational |
| `workflow_standardization` | Kept, reworded to an observable test ("if two people do the same task…") | The old wording invited self-flattery |
| `erp_integration` | Kept as `systems_integration`, reworded | "ERP, CRM" excluded SMEs who have neither; the underlying question is whether data moves by hand |
| `automation_level` ("% of tasks automated") | Reframed as `manual_workload` | Same signal, stated as a cost the visitor feels rather than a capability they may not track |
| `decision_speed` | Kept as `decision_latency` | Already operational |
| `leadership_alignment` ("aligned on AI adoption") | **Replaced** by `ownership_clarity` | AI-framed, and duplicated `improvement_mandate`. Workflow ownership is the operational fact that predicts whether anything sticks |
| `budget_ownership` ("budget for AI investment") | Folded into `improvement_mandate` | Two questions were measuring one thing |
| `change_readiness` | Kept | Already operational |
| `internal_capability` ("AI or technical capability") | Kept, AI dropped from wording | The capability that matters here is implementing operational change |
| — | **New:** `rework_rate` | Rework is the clearest observable symptom of weak process control, and it is what makes the paid quantification land |
| — | **New:** `handoff_delay` | Handoffs are where operational time is actually lost; nothing in the old set measured them |

## 4 · Scoring and result changes

### 4.1 Dimension profile instead of twelve flat rows

Today the result lists the top 3 and bottom 3 of twelve independent dimensions. With the mapping in §3, aggregate to five dimensions (mean of member questions, scaled 0–100):

```
process    ← process_documentation, workflow_standardization, manual_workload, handoff_delay
data       ← data_availability, systems_integration
strategy   ← decision_latency, improvement_mandate
governance ← rework_rate, ownership_clarity
people     ← change_readiness, internal_capability
```

This is the single highest-value change in the rework: it makes the free card a **smaller version of the paid radar** rather than a different artefact, so the upgrade reads as "same instrument, more depth" instead of "another quiz".

Keep the composite score as the headline. Keep strongest/weakest selection, but select at dimension level and cite the question that drove it (a light version of the paid product's E1.2 score traceability).

### 4.2 Fix the impossible score

`MAX_RAW = 43.5` (`page.tsx:53`) does not match the weights: their sum is 13.7, and the maximum answer index is 3, so the true maximum raw score is **41.1**. A perfect run currently scores **94/100**, and 100 is unreachable. Recompute `MAX_RAW` from the weights rather than hard-coding it, so it cannot drift again when questions change:

```ts
const MAX_RAW = Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0) * 3;
```

### 4.3 Align maturity band names with the paid product

They currently disagree, which is worse than either naming alone — the same word means a different position in each tier:

| Free (now) | Paid (`maturityFromScore`) |
|---|---|
| Initial · Developing · **Defined** · **Managed** · Optimizing | Nascent · Initiating · **Developing** · **Defined** · Optimizing |

A visitor who scores "Defined" free and "Developing" paid will read it as a downgrade. Adopt the paid names verbatim in the free tier. The paid names are load-bearing (narrative brief §3 invariant 5: `maturityFromScore` level names stay), so the free tier is the side that moves.

### 4.4 Retire the dead blocker fallback

`FALLBACK_BLOCKER_IDS` (`page.tsx:91`, loop at `:201-206`) can never add anything: the filter above it already captures every dimension scoring ≤1, and the fallback skips any id scoring >1. The intent — "always show three blockers" — is not implemented. Either implement it honestly (fall back to the lowest-scoring dimensions regardless of threshold) or delete it. Recommend implementing, since a result page with one blocker reads as a weak diagnosis.

**Shipped as: the fallback is deleted, not implemented honestly — with a deliberate cap, not the unconditional "always three" this section asks for.** After the Phase 3 move to five aggregated dimensions (§4.1), the bottom three of five is a majority, and unconditionally labelling the weakest three as blockers meant a company scoring, say, 67/100 on every dimension got told three of its five operational areas were constraints. `getBlockers()` excludes any dimension in the Defined band or above (≥65/100); a perfect run returns zero blockers, and the quick-note copy says so plainly ("All five dimensions are scoring strongly") instead of manufacturing three. Symmetrically, `getStrengths()` excludes anything below the Developing band (<50/100), so an all-weak run's least-bad dimension doesn't get praised as "working for you" — an early build did exactly that (an answer of 1/3 across the board still produced a "strength" card) before the floor was added. Most real runs still land on three of each; only a genuinely strong or genuinely weak run triggers fewer, which is the more honest result.

### 4.5 The closing hook

Replace the current upgrade-card blurb with the §2 conversion line, placed directly under the score, before the cards. It should name a number derived from the answers — the count of dimensions scoring below the midpoint — so it reads as a finding, not a slogan:

> Three parts of your operation are running below the level where automation holds up. This assessment shows where they are. The Business Operations Assessment shows what fixing them is worth, and where AI can carry the load.

## 5 · Blast radius

The free assessment is self-contained, but the answers now leave the browser. Everything below is in scope for this rework.

| Area | Impact |
|---|---|
| `QUESTIONS`, `WEIGHTS`, `DIMENSION_LABELS`, `INSIGHT_DESCRIPTIONS` | All keyed by question id — every id change is a coordinated edit across four structures |
| `INSIGHT_DESCRIPTIONS` | 12 × 2 strings (strength + blocker) must be rewritten in operational cause→effect voice. Reuse the shape of `DIM_CONSEQUENCE_CHAINS` from the paid product's `readinessNarrative.ts` so both tiers explain a weak dimension the same way |
| `getNarrative` templates | Five band templates mention AI directly ("start with one small, well-scoped pilot", "generative AI, agentic workflows") — reword to operational moves |
| Report card PNGs (slide 1 + 2) | Slide 1 renders six dimension rows; the aggregate profile is five. Layout needs a pass |
| **Stored leads** | `assessment_leads.answers` is JSONB keyed by question id, live in Postgres since 2026-08-01. Old and new rows will have different key sets |
| n8n email workflow | `Aivory — Free Assessment Report Email` (`PwzKyVa3SZlZpnd1`) renders `strengths`/`blockers` label arrays — label strings change, no schema change |
| GA events | `assessment_step` carries `question_id`; the funnel comparison breaks across the cutover. Expected — annotate the date in GA |

### Versioning the stored answers

Mirror the paid product's `methodologyVersion` discipline (narrative brief §8, E-invariant 1). Add a `question_set_version` column to `assessment_leads` (default `1`, new set writes `2`) and send it in the lead payload. Without it, any future analysis of the answers table silently mixes two incompatible instruments.

This is a small additive migration in `pg_service.py` `_SCHEMA_SQL` plus one field through `app/routes/assessment_leads.py` and the two Next routes.

## 6 · Work plan

Each phase is one commit and one deploy. The deploy path is the one used on 2026-08-01: patch the VPS checkout, `docker compose -f docker-compose.prod.yml build avry-website`, then `up -d`.

**All five phases shipped 2026-08-02–03.** Phases 1–3 landed together rather than
1+2 as planned (the codebase reads more clearly with the dimension-profile
aggregation and the question swap as one coherent change than as two
half-states); Phase 3 kept its own commit as advised. Deploys ran the planned
path once, then repeatedly: the VPS checkout at `/home/ubuntu/AVRY-V2-Main`
carries ~24 files of uncommitted local work unrelated to this rework (a
`TechnicalFrameButton` component, careers/blog/payment changes), so each
deploy copied in only the touched files rather than doing a full `git pull`,
to avoid clobbering that work. That divergence is still unresolved — see §9.

**Phase 1 — Correctness, no wording change.** ✅ Shipped. `MAX_RAW` derived from weights; blocker fallback implemented or deleted; band names aligned to the paid five. *Exit gate:* a perfect run scores 100; a bottom run scores 0; three blockers always render (**deviation — see §4.4**); band names match `maturityFromScore` (and the top band's spelling, `Optimizing`→`Optimising`, was corrected in *both* tiers, not just this one, to keep the cross-tier match exact — see §7's British-English note).

**Phase 2 — Question set swap.** ✅ Shipped. New `QUESTIONS`, `WEIGHTS`, `DIMENSION_LABELS`, `INSIGHT_DESCRIPTIONS`, narrative templates. `question_set_version = 2` end to end (page → Next route → backend → column). *Exit gate:* met — zero hits for `\bAI\b` in `src/app/free-diagnostic/page.tsx` outside the closing hook and upgrade cards; leads write `question_set_version = 2` with 12 new keys, verified against a live lead.

**Phase 3 — Dimension profile.** ✅ Shipped. Aggregate to five dimensions; strongest/weakest at dimension level with the driving question cited; report card layout pass. *Exit gate:* met — card renders five dimensions without clipping at 1080×1350 (tested with a deliberately long company name); PNG export matches on-screen.

**Phase 4 — Conversion surface.** ✅ Shipped. Closing hook copy, upgrade-card blurbs reworded against §2, `assessment_upgrade_click` still fires (verified for both upgrade cards). *Exit gate:* met — the result page states what the free tier does not answer, above the cards, with a count derived from the answers (e.g. "Two parts of your operation are running below the level where automation holds up").

**Phase 5 — PDF report (§7.1).** ✅ Shipped, with the ground-colour deviation in §0.1. `jspdf` added to the landing repo; `Manrope-Regular/Bold.ttf` + `Doto-Regular.ttf` copied into `public/fonts/` (this also fixed the PNG card capture's 30s+ slowness, exactly as §7.1.2 predicted — the fonts no longer come from a cross-origin Google Fonts stylesheet `html-to-image` couldn't read). PDF is the primary download and the emailed attachment; the PNG cards kept their preview and "Share as image" roles, and the on-page CTA that used to just download the PDF again now shows a static "already downloaded" confirmation instead (added post-launch — see §9 for why). *Exit gate:* met on a production execution, not just locally — text selectable, CTA is a real link annotation to `/#pricing-section`, PDF metadata set, single A4 page, long company names reflow. Measured: ~1s generation (well under the 2s budget), 47–65KB per file depending on content (well under the 1MB email budget).

## 7 · Owner decisions (resolved 2026-08-02)

1. **`current_ai_usage` — dropped outright.** Not relocated, not kept as unscored context. The signal is not worth the framing cost.
2. **12 questions stay.** ~3 minutes; eight would leave two dimensions resting on a single question.
3. **No radar in the free tier.** Keep the existing visual language — dial as the headline plus score rows — now fed by the five aggregated dimensions rather than twelve flat ones. The radar stays a paid-only artefact.
4. **Both artefacts kept.** PNG cards stay as the on-screen preview and social currency; a PDF is *added* for forwarding, printing, and the email attachment. Neither replaces the other. See §7.1.

### 7.1 · Two artefacts, two jobs

Neither format is replaced. They do different work and both are kept:

| Artefact | Job | Where it lives |
|---|---|---|
| **PNG cards, 1080×1350 (4:5)** | On-screen preview of the result, and social currency — 4:5 is the native LinkedIn/Instagram portrait ratio | Previewed on the result page; "Share as image" download |
| **PDF, A4** | The document that gets forwarded to a budget holder, printed, and attached to the email | Primary download; emailed attachment |

The deciding argument for adding the PDF is not fidelity, it is the hyperlink. **A PNG cannot carry a clickable CTA.** The moment the artefact is forwarded to the budget holder — the conversion event this whole funnel exists for — the upgrade path is dead pixels and they have to retype a URL. In a PDF the CTA links straight to `/#pricing-section`.

**Rejected shortcut:** wrapping the existing PNGs inside a PDF container. Design stays identical, but it inherits every drawback (slow generation, unselectable text, dead links, a 4:5 page floating in an A4 reader) and adds only "one file".

### 7.1.1 · What "same design, more PDF-friendly" means concretely

The visual *language* carries over unchanged: cream, hairline rules, Doto numerals for figures, the dotted dial, Manrope, uppercase micro-labels with wide tracking. The *layout* must change, because 4:5 → A4 (1:1.414) is a taller, narrower page. Eight specific translations:

1. **A4 portrait, 595×842pt**, ~18mm margins, nothing load-bearing in the last 10mm — prints without scaling on both A4 and Letter.
2. **Real text, not raster.** Selectable, searchable, copy-pasteable into an email. Also why the file lands in tens of KB instead of megabytes.
3. **Clickable CTA** via a link annotation over the button block.
4. **Invert the ground.** The PNG is full-bleed cream with a radial gradient. On paper that wastes toner and prints as grey banding on office lasers. On A4: **white page, cream as accent blocks and rules.** This is the one place the design deliberately differs, and it is what makes it read as a document rather than a screenshot.
5. **Retune the type scale.** The PNG uses 28–46px on a 1080px canvas because it is read as a thumbnail in a feed. At arm's length on paper the same hierarchy shouts. Target body ~9.5–10pt, section headings ~13–16pt, the score figure large but not billboard-sized.
6. **Let content flow.** The PNG cards are fixed-height canvases relying on `overflow: hidden` and `-webkit-line-clamp:6` — long company names and narratives are silently truncated today. The PDF should reflow and give text the room it needs.
7. **Add document furniture** the PNG has no room for: generated date, page number, and PDF metadata (Title / Author / Subject) so it looks correct in a file list and in email attachment previews.
8. **Target one page.** A one-pager gets read. Allow a second page only if the insight and notes blocks genuinely need it — never a second page holding two lines.

### 7.1.2 · Why this is cheap

**The pipeline already exists in the paid product** and only needs porting:

| | `avry-user-dashboard` (paid) | `frontend-nextjs` (landing) |
|---|---|---|
| jsPDF | `^4.2.0` | not installed |
| Manrope + Doto TTF | `public/fonts/` | none — loaded from Google Fonts CDN |

The fonts are already owned as TTFs in the sibling repo, so there is no licensing or sourcing work. `lib/pdfExport.ts` has already solved font embedding, pagination, and typography — copy the pattern, do not reinvent it.

**Bonus: it also fixes the performance problem.** The 30s+ PNG capture cost is `html-to-image` serialising the DOM and failing to inline the cross-origin Google Fonts stylesheet — *not* pixel count (measured 2026-08-01: pixelRatio 1 was just as slow as 3). Bringing the fonts local removes that failure for the PNG path too, and jsPDF draws primitives directly.

Ship as **Phase 5**, after the question rework — the PDF should render the new five-dimension profile, not the old one.

### 7.2 · Deliberately deferred

A **shareable result URL** is the strictly better forwarding artefact: it tells us who opened it and can be updated after the fact. It needs a new public surface and per-result server-side storage, so it is its own task, not part of this rework.

## 8 · Acceptance criteria

- [x] No question text contains "AI"; the word appears only in the closing hook and upgrade cards.
- [x] Every question maps to one of `process`/`data`/`strategy`/`governance`/`people`, and each dimension has ≥2 questions.
- [x] The free tier answers executive questions 1–2 and visibly declines 3–5, in copy, above the upgrade cards.
- [x] A perfect run scores 100; band names identical to `maturityFromScore`.
- [x] Three blockers *usually* render — **not unconditionally; see §4.4 for the deliberate ceiling/floor.**
- [x] `question_set_version` present on every new `assessment_leads` row; pre-cutover rows unchanged and still readable.
- [x] Report cards render the new five-dimension profile without clipping; download and emailed copy match — **with one nuance:** the emailed copy's strengths/blockers labels are always the English-canonical ones (§0.2), even when the visitor read the page in Indonesian.
- [x] Live on aivory.uk; `assessment_start` → `assessment_step` ×12 → `assessment_complete` → `assessment_lead_submitted` still fire — confirmed all four `trackEvent` calls are intact in the shipped file, plus two new ones (`assessment_download`, `assessment_download_pdf`) that were not in this plan.

**Phase 5 (PDF):**

- [x] A4 portrait, one page (two only if content genuinely needs it), brand fonts embedded rather than CDN-loaded.
- [x] Text selectable and searchable; CTA clickable to `/#pricing-section`; PDF metadata set.
- [ ] ~~White page with cream as accent — no full-bleed gradient; prints clean on an office laser.~~ **Deliberately not shipped this way — see §0.1.** The PDF reproduces the card's full-bleed cream radial gradient instead, per explicit owner override. Left unchecked rather than edited, so this document keeps a record of the original intent even though it's no longer the target.
- [x] No truncated content: long company names and the notes block reflow instead of clipping.
- [x] Generation under 2s; emailed attachment under 1 MB — measured ~1s and 47–65KB.
- [x] PNG cards unchanged in their preview and "Share as image" roles.

**Not in the original scope, shipped anyway (§0.2):**

- [x] English/Indonesian language switcher on the free-assessment page.
- [x] PDF follows the visitor's chosen language.
- [x] Stored lead data (strengths, blockers, industry, company size) stays English-canonical regardless of display language.
- [x] Report email confirmed English-only, by explicit owner decision — not a gap.

## 9 · Still open

Nothing here blocks the ship in §0 — these are follow-ups, in rough priority order.

1. **VPS checkout divergence at `/home/ubuntu/AVRY-V2-Main`.** ~24 files carry local
   work never committed to `Frntend-nxt` — most notably a `TechnicalFrameButton`
   component used in 10 files, plus uncommitted careers/blog/payment changes.
   Every deploy in this rework copied in only the touched files rather than
   `git pull`, specifically to avoid clobbering that work, which means the
   divergence is undiminished and the next person to deploy this checkout
   without knowing that will be tempted to `git pull` and lose it. Needs its
   own commit-and-reconcile pass.
2. **Indonesian copy has not been read by a native speaker.** ~110 ID strings in
   `assessmentCopy.ts` were written and only machine/self-reviewed (one real
   error — "operasi" vs "operasional", §0.2 — was caught this way and fixed;
   there may be others of the same kind).
3. **Two leaked-and-rotated-credential threads from adjacent work this
   session, unrelated to this rework's code but touching the same
   infrastructure:** the `vps_key` purged from `AVRY-V2-Main` git history
   still needs rotating (the purge removes it from GitHub's default branch,
   not from any existing clone or fork); three GitHub PATs found in plaintext
   remotes were revoked, confirmed working now. Direct `git push` from this
   machine works for all four repos as a result — the bundle-relay-via-VPS
   workaround documented in memory as `cerveau-push-via-vps` is superseded
   and only needed again if credentials break.
4. **Shareable result URL (§7.2)** — explicitly deferred at planning time, still
   deferred. Needs its own public surface and server-side result storage.
5. **A dedicated MailerSend domain wasn't part of this plan and is now a
   dependency.** The report email's `fromEmail` is `noreply@aivory.uk`,
   sent via MailerSend (switched from Zoho mid-build because the Zoho
   account was on a free tier that couldn't authenticate SMTP cleanly).
   Domain/SPF/DKIM verification in MailerSend should be double-checked if
   report emails start landing in spam.
