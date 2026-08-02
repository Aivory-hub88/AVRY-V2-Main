# Free Assessment — Question Set Rework (AI-readiness → Business Operations)

**Status:** PLANNING · **Owner:** Irfan · **Source:** product decision, 2026-08-02 · **Owner decisions resolved:** §7
**Scope:** the 12-question set and its scoring (Phases 1–4), plus the PDF report artefact that renders the result (Phase 5)
**Surface:** `aivory.uk/free-diagnostic` — repo `Aivory-hub88/Frntend-nxt` (local checkout `frontend/frontend-nextjs`, VPS checkout `/home/ubuntu/AVRY-V2-Main`, container `avry-website`)
**Single file:** `src/app/free-diagnostic/page.tsx` (~1670 lines, self-contained: questions, weights, scoring, copy, CSS)
**Companion docs:** [`OPS-TRANSFORMATION-NARRATIVE-BRIEF.md`](OPS-TRANSFORMATION-NARRATIVE-BRIEF.md) (paid report, ops-first reframe — already shipped), [`DEEP-DIAGNOSTIC-RESULT-PLANNING.md`](DEEP-DIAGNOSTIC-RESULT-PLANNING.md)

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

**Phase 1 — Correctness, no wording change.** `MAX_RAW` derived from weights; blocker fallback implemented or deleted; band names aligned to the paid five. *Exit gate:* a perfect run scores 100; a bottom run scores 0; three blockers always render; band names match `maturityFromScore`.

**Phase 2 — Question set swap.** New `QUESTIONS`, `WEIGHTS`, `DIMENSION_LABELS`, `INSIGHT_DESCRIPTIONS`, narrative templates. `question_set_version = 2` end to end (page → Next route → backend → column). *Exit gate:* `grep -i "\bAI\b" src/app/free-diagnostic/page.tsx` returns hits only in the closing hook and the upgrade cards; a lead written from the new set carries `question_set_version = 2` and 12 new keys.

**Phase 3 — Dimension profile.** Aggregate to five dimensions; strongest/weakest at dimension level with the driving question cited; report card layout pass. *Exit gate:* card renders five dimensions without clipping at 1080×1350; PNG export still matches on-screen.

**Phase 4 — Conversion surface.** Closing hook copy, upgrade-card blurbs reworded against §2, `assessment_upgrade_click` still fires. *Exit gate:* the result page states what the free tier does **not** answer, in one sentence, above the cards.

**Phase 5 — PDF report (§7.1).** Add `jspdf` to the landing repo, copy `Manrope-Regular/Bold.ttf` + `Doto-Regular.ttf` into `public/fonts/`, port the embedding pattern from the dashboard's `lib/pdfExport.ts`, lay out one A4 page per §7.1.1. PDF becomes the primary download and the emailed attachment; the PNG cards keep their preview and "Share as image" roles unchanged. *Exit gate:* PDF opens in Preview/Acrobat/Chrome with the embedded fonts; text is selectable; CTA is clickable; prints on A4 and Letter without scaling; generation under 2s; emailed attachment under 1 MB; PNG preview and share still work.

Phases 1 and 2 can ship together if time is short. Phase 3 should not — it changes the card artwork, and keeping it separate makes a layout regression attributable. Phase 5 comes last so the PDF renders the new five-dimension profile rather than the old twelve-row one.

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

- [ ] No question text contains "AI"; the word appears only in the closing hook and upgrade cards.
- [ ] Every question maps to one of `process`/`data`/`strategy`/`governance`/`people`, and each dimension has ≥2 questions.
- [ ] The free tier answers executive questions 1–2 and visibly declines 3–5, in copy, above the upgrade cards.
- [ ] A perfect run scores 100; band names identical to `maturityFromScore`.
- [ ] Three blockers always render.
- [ ] `question_set_version` present on every new `assessment_leads` row; pre-cutover rows unchanged and still readable.
- [ ] Report cards render the new five-dimension profile without clipping; download and emailed copy match.
- [ ] Live on aivory.uk; `assessment_start` → `assessment_step` ×12 → `assessment_complete` → `assessment_lead_submitted` still fire.

**Phase 5 (PDF):**

- [ ] A4 portrait, one page (two only if content genuinely needs it), brand fonts embedded rather than CDN-loaded.
- [ ] Text selectable and searchable; CTA clickable to `/#pricing-section`; PDF metadata set.
- [ ] White page with cream as accent — no full-bleed gradient; prints clean on an office laser.
- [ ] No truncated content: long company names and the notes block reflow instead of clipping.
- [ ] Generation under 2s; emailed attachment under 1 MB.
- [ ] PNG cards unchanged in their preview and "Share as image" roles.
