# Deep Diagnostic Experience V2 — Explainability & Cross-Dimension Intelligence Plan

**Status:** Phase 1 (Intelligence Exposure Audit) and Phase 2 (Explainability
Layer) complete as of 2026-08-04 — see §1.6/§1.7 and the Phase 2 section
below. Phases 3–8 not started.
**Owner:** Irfan · **Source:** product decision, 2026-08-04, revised after a code
audit corrected the original diagnosis (see §0).
**Scope:** the Deep Diagnostic result experience (Web result page, PDF report,
Blueprint handoff) — **not** the intake question set, **not** a Blueprint or
Roadmap rebuild.
**Surface:** `avry-user-dashboard` — `app/diagnostics/deep/final-result/page.tsx`
(Web), `lib/pdfExport.ts` (PDF), `app/api/blueprints/generate/route.ts`
(Blueprint handoff)
**Repo:** `Aivory-hub88/avry-user-dashboard` (deploy: VPS checkout
`/home/ubuntu/avry-user-dashboard`, container `avry-user-dashboard`)
**Companion docs:** [`DEEP-DIAGNOSTIC-RESULT-PLANNING.md`](DEEP-DIAGNOSTIC-RESULT-PLANNING.md)
(page/PDF parity + Postgres storage — prerequisite reading, this plan builds on
top of it), [`OPS-TRANSFORMATION-NARRATIVE-BRIEF.md`](OPS-TRANSFORMATION-NARRATIVE-BRIEF.md)
(the ops-first reframe that produced the current narrative functions),
[`FREE-ASSESSMENT-QUESTION-REWORK-PLANNING.md`](FREE-ASSESSMENT-QUESTION-REWORK-PLANNING.md)
(sibling free-tier product — §2 of that doc defines the funnel this plan's
Blueprint/Roadmap boundary respects)

---

## 0 · Why this plan exists, and why it changed shape twice

**First framing (rejected):** the intake question set needs reworking — same
class of problem as the free assessment's AI-first question set.

**Second framing (revised after reading a sample PDF):** the question set is
fine (90–95% mature); what's missing is a reasoning/evidence layer — the report
"jumps straight to recommendation" with no explainability, so 16 new engines
were proposed (Insight Engine, Evidence Engine, Relationship Engine, Dependency
Graph, Financial Breakdown, Confidence Rating, Executive Narrative, Transformation
Blueprint, 90-Day Roadmap, …).

**Third framing (this plan, after auditing `services/deepDiagnostic.ts`,
`lib/readinessNarrative.ts`, `app/diagnostics/deep/final-result/page.tsx`, and
`lib/pdfExport.ts` directly):** the second framing's core premise was wrong.
Most of the proposed "new engines" already exist and are already rendered end
to end. See §1 for the line-by-line evidence. The actual gap is much narrower:
a handful of genuinely-missing cross-dimension signals, one static-vs-dynamic
narrative upgrade, and — most importantly — no confirmed visibility into
whether what the engine computes is actually surfaced everywhere it should be.
That last question is what Phase 1 exists to answer before anything else gets
built.

---

## TL;DR (Bahasa Indonesia)

Deep Diagnostic sudah punya reasoning layer yang jauh lebih matang dari dugaan
awal: 6 dimensi skor, ROI breakdown (labor/process savings, payback, NPV),
confidence rating (sudah shipped sebagai "D2"), opportunity ranking dengan
quadrant classification, score drivers per dimensi, risk classification, dan
narasi eksekutif (verdict, executive summary, executive insight, first moves,
consequence chain) — semuanya sudah dipanggil dan dirender baik di halaman
Web maupun di PDF (`app/diagnostics/deep/final-result/page.tsx` dan
`lib/pdfExport.ts` sama-sama konsumsi context yang sama).

Yang genuinely belum ada: **Relationship Engine** (composite signal lintas
dimensi seperti Execution Readiness), **Workflow Classification** (free-text
pain point → workflow terstruktur), dan **Dependency Graph dinamis**
(consequence chain sekarang statis per-dimensi, bukan dihitung dari kombinasi
jawaban aktual). Blueprint sudah terbukti mengonsumsi `opportunities` dan
`roomForImprovement` dari Deep Diagnostic — tapi TIDAK mengonsumsi
`scoreDrivers`, `risks`, atau `confidence`, jadi ada intelligence yang sudah
dihitung tapi berhenti sebelum sampai ke Blueprint.

Rencana ini 8 fase: **audit visibilitas dulu** (Fase 1, termasuk audit
konsumsi Blueprint/Roadmap yang tadinya direncanakan terpisah di Fase 8),
**ekspos yang sudah ada** (Fase 2), baru **bangun yang genuinely baru** (Fase
3–4), **upgrade kualitas narasi dengan LLM sebagai penyusun kalimat saja —
bukan penghitung** (Fase 5), **dependency graph dinamis** (Fase 6), **polish
keterbacaan** (Fase 7), lalu **audit integrasi produk** (Fase 8, sekarang
lebih tipis karena sebagian sudah selesai di Fase 1). Prinsip yang mengikat
semua fase: jangan bangun ulang mesin yang sudah ada, LLM tidak pernah
menghitung angka, dan setiap field baru harus mengikuti pola
graceful-degradation yang sudah dipakai kode untuk field opsional (`scoreDrivers?`,
`estimateBasis?` — lihat §1).

---

## 1 · Verified current state (audited live, 2026-08-04)

This is the ground truth this plan is built on. Every claim below was checked
directly against the source, not assumed from reading output.

### 1.1 Scoring, ROI, opportunity, risk, confidence — already shipped

| Capability | Function | Location |
|---|---|---|
| 6-dimension scoring (`strategy`, `data`, `process`, `people`, `governance`, `security`) | `scoreStrategy` … `scoreSecurity`, `calculateDimensionScores` | `services/deepDiagnostic.ts:768–903` |
| Maturity band | `maturityFromScore` | `services/deepDiagnostic.ts:845` |
| ROI: labor savings, process savings (20% overhead), cost of inaction, payback, ROI%, NPV | `calculateROI` | `services/deepDiagnostic.ts:389–570` |
| Confidence rating from input completeness | `calculateROI` (`confidenceLevel`) | `services/deepDiagnostic.ts:418, 567` |
| Confidence damped by `estimate_basis` answer ("D2", shipped 2026-07-20) | `dampConfidenceByEstimateBasis` | `services/deepDiagnostic.ts:600–647` |
| ROI sensitivity / scenario bounds | `getROISensitivity`, `recomputeROIAtEfficiency` | `services/deepDiagnostic.ts:676–767` |
| Per-dimension score evidence ("why this score") | `computeScoreDrivers`, `topDrivers`, `DIMENSION_DRIVER_FACTORS` | `services/deepDiagnostic.ts:903–1140` |
| Opportunity ranking with impact/effort quadrant, data readiness, complexity | `rankOpportunities`, `classifyQuadrant` | `services/deepDiagnostic.ts:1141–1287` |
| Risk classification | `classifyRisks` | `services/deepDiagnostic.ts:1288` |
| Prioritised improvement narrative with current-state evidence | `buildRoomForImprovement` | `services/deepDiagnostic.ts:1426–1580` |

### 1.2 Executive narrative — already shipped

| Capability | Function | Location |
|---|---|---|
| Score + band + constraint + foundation sentence | `buildVerdictNarrative` | `lib/readinessNarrative.ts:164` |
| Opening summary (position → value at stake → constraint) | `buildExecutiveSummary` | `lib/readinessNarrative.ts:242` |
| Per-section insight (diagnosis/opportunities/financial/improvements) | `buildExecutiveInsight` | `lib/readinessNarrative.ts:309` |
| First-moves (foundation → proof → mandate/budget), each with a reason | `buildFirstMoves` | `lib/readinessNarrative.ts:184` |
| Per-dimension consequence chain ("A → B → C → D") — **static text, one per dimension, not computed from the actual answer combination** | `DIM_CONSEQUENCE_CHAINS`, `formatConsequenceChain` | `lib/readinessNarrative.ts:128–140` |
| Risk register / opportunity matrix / ROI tile captions | `buildRiskRegisterCaption`, `buildOpportunityMatrixCaption`, `buildRoiTilesCaption` | `lib/readinessNarrative.ts:363–487` |

**All of the above are deterministic string composition — numbers and clauses
plugged into fixed sentence templates. No LLM is involved in producing this
narrative today.** This is the concrete shape of the "feels templated" gap:
the reasoning is real, the prose framing it is not personalised beyond
slot-filling.

### 1.3 Confirmed rendered end to end — not dead code

`grep` traced every function above to its call site in both consuming
surfaces:

- **Web** (`app/diagnostics/deep/final-result/page.tsx`): destructures
  `{ scores, calculations, opportunities, risks, qualitative } = context`
  (line 234), calls `buildVerdictNarrative`/`buildFirstMoves`/
  `buildExecutiveSummary`/`buildExecutiveInsight` ×4 (lines 308–355), renders
  `context.scoreDrivers` via `<DimensionDrivers>` (line 490), renders
  `context.roomForImprovement` (lines 840–848), computes `highRiskCount` and
  `quickWinCount` from `risks`/`opportunities` (lines 277–278).
- **PDF** (`lib/pdfExport.ts`): destructures the identical field set from the
  identical `DiagnosticContext` (line 1706), calls the identical narrative
  functions (lines 1962–2543), renders `scoreDrivers` per dimension if present
  (line 1906).

Both surfaces read from the same `DiagnosticContext` and call the same
builder functions — there is one source of truth, not two diverging
implementations.

### 1.4 Blueprint consumption — confirmed partial

Checked directly against `app/api/blueprints/generate/route.ts`:

| Field | Consumed by Blueprint? | Evidence |
|---|---|---|
| `opportunities` | **Yes** — top 3 sliced and mapped to `workflow_modules` | line 62, 126 |
| `roomForImprovement` | **Yes** — explicit LLM prompt instruction to map high-priority items to workflows/phases | line 207 |
| `scores.composite`, `maturityLevel` | **Yes** — mapped to `ai_readiness_score`/`maturity_level` | line 207 |
| `scoreDrivers` | **No** — no reference found | — |
| `risks` | **Yes** — used in fallback-parse path and explicitly named in the LLM prompt ("If the diagnostic data contains no risks... do NOT hallucinate") | lines 63, 104–106, 138–140, 215 |
| `calculations.confidenceLevel` | **No** — no reference found | — |

> **Correction (Phase 1 audit, 2026-08-04):** the `risks` row above was wrong.
> Re-verification found `risks` **is** consumed by Blueprint — see §1.6 row 9
> and evidence above. Left the original wrong cell visible (struck through in
> spirit, not literally) so this doc's own audit trail stays honest about what
> the first pass missed.

**Roadmap consumption (`app/api/roadmap`) — now audited, see §1.7.**

### 1.5 Existing graceful-degradation convention (must be reused, not reinvented)

`types/diagnostic.ts:437–495` (`DiagnosticContext`) already establishes the
pattern this plan's new fields must follow: `scoreDrivers?`, `kpiBaseline?`,
`processOwnership?`, `painPointHours?`, `estimateBasis?` are all optional,
each with a comment stating the field is "absent on contexts stored before
this feature shipped" and consumers "MUST treat missing as no drill-down
available, not an error." Every new field this plan adds (composite signals,
dynamic dependency graph) is bound by the same rule — see §5.

### 1.6 Intelligence Visibility Matrix (Phase 1 deliverable, audited 2026-08-04)

Every cell below is evidence-linked (file + line), traced destructure →
variable use → actual render/consumption call, not inferred from a function
name existing. Engine column points back to §1.1/§1.2 rather than repeating
those citations. Legend: ✅ present · ⚠️ partial · ❌ absent · 🔴 present but
wrong (a correctness issue, not a visibility gap).

| # | Item | Engine | Web | PDF | Blueprint | Roadmap | Classification |
|---|---|---|---|---|---|---|---|
| 1 | Score (composite) | ✅ §1.1 | ✅ `page.tsx:234,373,444` | ✅ `pdfExport.ts:1846` | ✅ `route.ts:85,207` → `ai_readiness_score` | ❌ present only inside the raw JSON dump, never named | **HI** (Roadmap) |
| 2 | Dimension Score (6) | ✅ §1.1 | ✅ `RadarChart.tsx:57`, `DimensionBenchmarkBars.tsx:35` | ✅ `pdfExport.ts:1868–1876` (per-dim guarded) | ❌ only `.composite` touched, per-dim never referenced | ❌ raw JSON only | **HI** (Blueprint + Roadmap) |
| 3 | Score Drivers | ✅ §1.1 | ✅ guarded, `page.tsx:490` → `DimensionDrivers.tsx:28` (`if (!scoreDrivers) return null`) | ✅ guarded, `pdfExport.ts:1906–1941` | ❌ 0 hits | ❌ 0 hits | **HI** (Blueprint + Roadmap); **DS** — `upgradeDiagnosticContext` (`deepDiagnostic.ts:1710–1821`) never backfills this for pre-feature stored contexts, so old rows show nothing here by design, not by bug |
| 4 | Room for Improvement | ✅ §1.1 | ✅ `page.tsx:840–888` | ✅ `pdfExport.ts:2522–2540` | ✅ `route.ts:207`, explicit prompt instruction | ❌ raw JSON only | **HI** (Roadmap) |
| 5 | Executive Summary | ✅ §1.2 | ✅ `page.tsx:329–339`→`434` | ✅ `pdfExport.ts:1780–1801` | ❌ | ❌ | **HI candidate** — open question, not an automatic gap: Blueprint/Roadmap generate their own narrative via LLM, so this may be an intentional non-goal rather than a miss. Routed to Phase 8.1 for an explicit yes/no, not assumed either way. |
| 6 | Executive Insight | ✅ §1.2 | ✅ `page.tsx:341–355`→ multiple | ✅ `pdfExport.ts:2021,2184–2189,2513–2517,2543–2546` | ❌ | ❌ | same as #5 |
| 7 | Executive Verdict | ✅ §1.2 | ✅ `page.tsx:308–316`→`496` | ✅ `pdfExport.ts:1962–1978` | ❌ | ❌ | same as #5 |
| 8 | First Moves | ✅ §1.2 | ✅ `page.tsx:317–323`→`508–516` | ✅ `pdfExport.ts:1985–1993` | ❌ | ❌ | same as #5 |
| 9 | Risk Register | ✅ §1.1 | ⚠️ full section only when `risks.length ≥ 2` (`page.tsx:390,593–603`); exactly 1 risk folds to a single line (`readinessNarrative.ts:487–495`); 0 risks → nothing renders | ⚠️ same ≥2 threshold (`pdfExport.ts:2551–2554`); **worse than Web** — when risks are 0 *and* `roomForImprovement` exists, nothing renders at all, not even the PDF's own "no risks detected" branch (`1618–1628`), which is only reachable from a different code path | ✅ `route.ts:63,104–106,138–140,215` — **this corrects §1.4**, which wrongly recorded "No reference found" | ❌ raw JSON only | **UX** (Web/PDF ≥2 threshold hides a real risk whenever exactly 0–1 exist); **HI** (Roadmap) |
| 10 | Opportunity Ranking | ✅ §1.1 | ✅ `OpportunityMatrix`/`OpportunityCard` | ✅ `oppCard()` `pdfExport.ts:780–874` | ✅ `route.ts:62,126`, top-3 → `workflow_modules` | ❌ raw JSON only | **HI** (Roadmap) |
| 11 | ROI | ✅ §1.1 | ✅ extensive, `page.tsx:657–831` | ✅ extensive, `pdfExport.ts:2245–2377` | 🔴 `estimated_roi_months` **hardcoded to `6`** (`route.ts:147`); `kpi_targets` prompt tells the LLM to invent generic current/target values — never bound to `calculations` | 🔴 fallback KPIs are **hardcoded placeholders** ("3x investment", "40%", "10+ hours" — `route.ts:144–176`); the primary LLM path has no prompt instruction binding it to `calculations` either | 🔴 **Not a visibility gap — a correctness issue.** This is the one finding that violates Architecture Principle 2 ("the LLM never computes... must never be the source of a number that reaches the page") in the strict sense: a number *is* reaching the user (`estimated_roi_months: 6`, "3x investment") with no engine backing at all. See callout below §1.7. |
| 12 | Confidence | ✅ §1.1 | ⚠️ only shown inside the low-data banner, gated on `!hasEnoughDataForProjection` (`page.tsx:645,649–653`); separately, `ROIMetricTile` already supports a per-tile confidence badge (`ROIMetricTile.tsx:14,27,48`) but **zero of the 11 call sites** (`page.tsx:658–688`) pass the prop — built, never wired | ⚠️ `confidenceLevel` label shown 3× (`pdfExport.ts:2204–2210,2233,2507`) but the raw `estimateBasis` rationale that produced the damped value is never shown (0 hits for `estimateBasis`/`estimate_basis`) — reader sees the label, not the reason | ❌ | ❌ | **HI** (Web dead wiring — exact match for Phase 2.3's "Confidence display" task); **WN** (PDF shows the label without the reasoning); **HI** (Blueprint/Roadmap) |
| 13 | Consequence Chains | ✅ §1.2 (confirmed static lookup, not computed) | ✅ weakest-dim chain always shown (`page.tsx:497–506`); other 5 only reachable by expanding `DimensionDrivers`, which itself requires `scoreDrivers` present | ⚠️ only the weakest-dim chain renders (`pdfExport.ts:1997–2000`) — the other 5 are **structurally unreachable** in a static document (no expand affordance exists on paper) | ❌ | ❌ | **UX** (PDF exposes strictly less than Web); this row is also just direct confirmation of Phase 6's premise, not a new finding |

**✅ Fixed 2026-08-04 (ahead of Phase 8, as recommended below at the time).**
Both routes now bind their ROI-shaped fields to the engine's own
`calculations`, with the same "LLM composes, never invents a number"
discipline as the rest of this plan:

- **Blueprint** (`app/api/blueprints/generate/route.ts`): `estimated_roi_months`
  is now derived from `calculations.netPaybackMonths ?? calculations.paybackMonths`
  via `deriveEstimatedRoiMonths()`, applied in **both** places a number could
  reach the user — the JS fallback builder (`buildBlueprintFromText`) *and*,
  more importantly, as a deterministic **post-parse override** on the primary
  LLM-JSON path, so correctness no longer depends on the LLM obeying the
  prompt. The `kpi_targets` prompt instruction (previously giving fabricated
  illustrative examples like "$4.20 per ticket") now explicitly names the
  real fields to ground answers in and forbids inventing a number; the JS
  fallback gained a real ROI-grounded KPI entry (`Annual Operational Savings`)
  built from `calculations.totalAnnualSavingsLocal`/`paybackMonths` when present.
- **Roadmap** (`app/api/roadmap/generate/route.ts`): the LLM prompt gained an
  explicit "GROUNDING RULES" block naming the same fields, forbidding
  invented numbers. `buildFallbackRoadmap` (previously 100% generic —
  didn't even receive the diagnostic context) now takes `diagnosticContext`
  and derives its three previously-hardcoded KPI targets ("3x investment" /
  "40%" / "10+ hours") from `calculations.netThreeYearROIPercent` /
  `totalAnnualSavingsLocal`, `hoursReclaimedPerYear`, and
  `quantitative.targetAutomationPct` — falling back to qualitative language
  (never a specific invented figure) only when that data is genuinely absent.

Both files pass `tsc --noEmit` clean. Not independently re-verified against
a live VPS bridge call (that requires the LLM backend + a real stored
diagnostic context) — the fix is deterministic post-processing plus prompt
wording, so the correctness of the *override* path doesn't depend on the LLM
at all, but the *prompt-instruction* half (kpi_targets phrasing) is
best-effort until observed against a real generation.

### 1.7 Roadmap consumption audit (Phase 1.3)

`app/api/roadmap/generate/route.ts` is architecturally different from
Blueprint, and that difference is itself the finding: it is a **thin proxy**,
not a field-consuming route. It receives `diagnosticContext` and
`blueprintContext` as opaque `Record<string, any>` from the request body
(`route.ts:5–11`), performs **zero field-level destructuring** on either, and
`JSON.stringify`s both whole objects straight into an LLM prompt
(`route.ts:16–22`). Callers confirm `diagnosticContext` is the full raw
`DiagnosticContext` pulled from `localStorage.aivory_deep_result`
(`app/roadmap/page.tsx:1032`, `app/blueprint/page.tsx:1120–1121`) — sent
**alongside** Blueprint's output, not derived from it.

Practical effect: every item in §1.6's Roadmap column is, strictly, "present
in the raw payload the LLM receives" — but with **zero prompt instruction
naming any specific field** (grepped for `opportunities`, `risks`,
`roomForImprovement`, `scores.`, `scoreDrivers`, `composite`,
`maturityLevel`, `confidenceLevel`, `consequence`, `executiveSummary`/
`Insight`/`Verdict`, `firstMoves` — zero hits on all of them in the prompt
body, `route.ts:32–62`). Whether any given item actually influences the
Roadmap's output is left entirely to the LLM noticing it inside an
unstructured JSON blob — which is a materially weaker guarantee than
Blueprint's explicit field-to-output mapping instructions. `buildFallbackRoadmap`
(`route.ts:126–181`) ignores both context objects entirely; only `source`/
`blueprintId` pass through.

**No recomputation/duplication found** in either route — both are pure
LLM-prompt proxies operating on already-computed data (or none), so neither
violates the "deterministic engine is the single source of truth" principle
in the recomputation sense. The violation that *does* exist is the opposite
one, captured in §1.6 row 11.

---

## 2 · Vision

Transform Deep Diagnostic from an operational assessment into an executive
decision-support experience by **exposing existing intelligence more
effectively**, **strengthening cross-dimensional reasoning**, and **improving
the consulting quality of the report** — without duplicating engines that
already exist.

## 3 · Architecture principles (non-negotiable, apply to every phase below)

1. **The deterministic engine remains the single source of truth** for every
   score, ROI figure, recommendation, and confidence rating.
2. **The LLM never computes.** It only composes narrative, explains
   relationships between findings already computed, and improves readability.
   It must never be the source of a number that reaches the page or PDF.
3. **Do not rebuild an engine that already exists.** Exposing already-computed
   intelligence comes before adding new logic — that ordering is the point of
   Phase 1.
4. **Every new insight must be composite** — combining multiple existing
   signals into a genuinely new indicator (e.g. Execution Readiness) — not a
   repackaging of a number that already has a home.
5. **Deep Diagnostic, Blueprint, and Roadmap are one product**, not three.
   Output must flow between them without recomputation or context loss.

---

## 4 · Phases

### Phase 1 — Intelligence Exposure Audit (P0) — ✅ COMPLETE (2026-08-04)

**Objective:** audit everything the engine already computes and confirm
whether it is actually visible to the user across every output surface (Web,
PDF, Blueprint handoff, Roadmap handoff) — before any new engine is built.

**To-do**

- [x] **1.1 Intelligence inventory.** Done — see §1.1/§1.2 (13-item inventory,
      unchanged from the original list; re-verification did not surface any
      additional engine output that needed adding).
- [x] **1.2 Intelligence Visibility Matrix.** Done — see §1.6. Every cell is
      file+line evidence, not estimated. §1.4's Opportunity Ranking → Blueprint
      cell held (`✅`); **one existing cell did not hold** — §1.4's `risks` →
      Blueprint cell was wrong (recorded "No", corrected to "Yes" with
      evidence, see §1.4's correction note and §1.6 row 9).
- [x] **1.3 Roadmap consumption audit.** Done — see §1.7. Finding: Roadmap is
      a thin JSON-blob proxy with no field-level prompt binding at all, a
      materially different (weaker) integration than Blueprint's.
- [x] **1.4 Gap classification.** Done — every ❌/⚠️ cell in §1.6 is tagged HI
      (Hidden Intelligence) / UX (UX Issue) / DS (Data Sparsity) / WN (Weak
      Narrative). No Missing Engine findings — the second-framing premise
      that engines were missing continues to not hold, except for the 3
      genuinely new composites Phase 3 already scopes. **One finding didn't
      fit any of the five categories:** §1.6 row 11 (ROI in Blueprint/Roadmap)
      is a correctness bug — hardcoded/LLM-invented numbers reaching the user
      with no engine backing — not a visibility gap. Flagged for escalation
      ahead of Phase 8, see the callout under §1.6.

**Exit gate — met.** Filled Visibility Matrix, evidence-linked (file + line,
same standard as §1), every gap classified: §1.6 (Web/PDF/Blueprint) + §1.7
(Roadmap). No Phase 2+ work should start on an item until its row in §1.6
exists — it now does for all 13 items across all 5 surfaces.

---

### Phase 2 — Explainability Layer (P0) — ✅ COMPLETE (2026-08-04)

**Objective:** make already-computed reasoning legible. This phase adds no
new intelligence — it is presentation work over Phase 1's "Hidden
Intelligence" and "UX Issue" findings.

**To-do**

- [x] **2.1 "Why This Recommendation" card** on each opportunity: surface the
      factors `rankOpportunities` already computes (impact, effort/complexity,
      data readiness, time-to-value) as a short reason list, e.g. *"Highest
      manual workload · Low implementation effort · Data already available ·
      Estimated payback in 9 months."* Source data already exists in
      `RankedOpportunity` (`services/deepDiagnostic.ts:1224–1287`) — this is a
      rendering task, not a computation task.
- [x] **2.2 "Evidence Used" block** per recommendation, pulling from the same
      answer fields `computeScoreDrivers` already resolved
      (`services/deepDiagnostic.ts:903–1140`) — e.g. *Automation 20% → Manual
      Hours 120/week → Data Quality Moderate → Leadership Supportive.*
- [x] **2.3 Confidence display**, e.g. *"Recommendation Confidence: High —
      Known manual workload, Known FTE, Known automation gap."* Source:
      `calculateROI`'s `confidenceLevel` + `dampConfidenceByEstimateBasis`
      (`services/deepDiagnostic.ts:418, 600–647`) — already computed, not yet
      shown with its reasons.

**Exit gate — met.** Every recommendation on Web and PDF shows why/evidence/
confidence using only data the engine already produces — zero new scoring
logic introduced in this phase.

**Implementation notes:**

- Three pure, shared builders added to `lib/readinessNarrative.ts`
  (`buildWhyThisRecommendation`, `buildEvidenceUsed`, `buildConfidenceReasoning`)
  — same "compose only, never compute" discipline as every other function in
  that file. Both Web and PDF call the same functions, so the two surfaces
  can't drift.
- **2.1** wired into `components/result/OpportunityCard.tsx` (Web) and
  `oppCard()` in `lib/pdfExport.ts` (PDF, +7mm card height for the one extra
  line, page-break threshold bumped 65→72mm to match).
- **2.2** wired into the Room-for-Improvement block in
  `app/diagnostics/deep/final-result/page.tsx` and `improvementBlock()` in
  `lib/pdfExport.ts`. Along the way, found and fixed a real bug outside this
  phase's original scope: **`item.currentState` — the "what's wrong today"
  evidence sentence `buildRoomForImprovement` already produces — was never
  rendered on the Web page at all** (present in PDF only). Now shown on both.
  Maps a Room-for-Improvement item's `area` to the matching `ScoreDrivers`
  dimension for the evidence chips; the "Automation Coverage" item (which has
  no single scoring dimension) pulls straight from `quantitative` instead.
- **2.3** closes the exact dead-wiring §1.6 row 12 flagged: `ROIMetricTile`
  already supported a `confidenceLevel` badge prop that zero call sites used
  — now passed on every ROI tile in `page.tsx`. The reasoning line inverts
  `calculations.missingInputs` (already computed) into "Known: … · Not
  provided: …", added to the existing low-confidence banner on Web and to
  `renderConfidenceBanner()` in the PDF (self-measuring box height, no
  separate height-math risk).
- **Verified live**, not just typechecked: ran the dev server, bypassed auth
  via the documented `aivory_auth` localStorage injection, seeded a synthetic
  `DiagnosticContext` covering both Evidence-Used branches (dimension-based
  and automation-gap), and confirmed via `get_page_text` that all three
  features render with the exact expected copy, zero console errors. Also
  triggered the PDF export in-browser and intercepted `URL.createObjectURL`
  to confirm jsPDF produced a complete ~953KB blob with no thrown exception
  — the height-math consistency between `measureImprovementBlockHeight` and
  `improvementBlock` (a real risk given this file's history of pagination
  bugs) was hand-verified line-by-line and did not throw or visibly break.
  `tsc --noEmit` clean (only the 2 pre-existing unrelated errors from Phase 1
  remain in the full project).

**Post-Phase-2 fix (2026-08-04) — inconsistent bold emphasis in PDF narrative
paragraphs.** Found via user review of a generated report, not part of the
original Phase 2 to-do list, but landed in the same session: several
narrative paragraphs in `lib/pdfExport.ts` rendered as fully plain text via
`renderNarrative()` even though the file already has a
`renderNarrativeSegments()` + `boldSubstrings()` mechanism (used by the
Executive Summary, Executive Diagnosis, and Financial Case) for bolding key
figures/phrases within a paragraph — the mechanism just hadn't been applied
consistently everywhere.

- **Fixed 6 call sites** to bold their key figures the same way: the
  Operational Health scorecard sentence (`Security (70)` / `Data (45)`
  style phrases), the Transformation Opportunities intro (reported pain
  point, "quick wins", time-to-value weeks), the Operational Improvement
  Priorities intro (the 3 automation-gap percentages), the AI Enablement
  paragraph (the `Business → Operations → Processes → Data → Automation →
  AI` sequence, the weakest-dimension constraint clause, the top opportunity
  title — this was the paragraph explicitly quoted as needing it), and both
  Closing Note paragraphs (composite score, top opportunity, automation gap,
  savings figure).
- **Also fixed**: the Financial Case ROI narrative already bolded
  `$112,320`/`$27,690`-style figures but was missing the reclaimed-hours
  figure (`2,340` in "reclaim 2,340 hours") — added to both the
  budget-complete and no-budget phrase lists.
- **Collision risk handled explicitly**: a bare 1-2 digit number or a single
  common word (e.g. "data") bolded via `boldSubstrings` has no word-boundary
  anchoring, so it can match an unrelated occurrence of the same substring
  elsewhere in the same paragraph (e.g. bolding "data" would incorrectly
  also catch "get the **data** right" earlier in the AI Enablement
  sentence). Fixed by bolding longer, specific phrases instead of bare
  words/numbers (`"data as the current constraint"`, `"score of 58"`, not
  `"data"` or `"58"` alone).
- **Verified two ways**: (1) an isolated Node unit test of the pure
  `boldSubstrings` function against the exact fixture strings used in this
  report, confirming the intended phrases bold and nothing else does
  (including the collision case above); (2) reading the actual regenerated
  PDF page-by-page after the user re-downloaded it, confirming the bold
  renders correctly in the real jsPDF output, not just in the string-split
  logic. `tsc --noEmit` clean.
- **PDF-only, by design** — matches the existing convention documented at
  `boldSubstrings`'s call sites: the shared narrative strings from
  `lib/readinessNarrative.ts` stay markup-free (the Web page renders the
  identical string as plain text), and the bold emphasis is layered on
  purely as PDF presentation. No shared-narrative-function signature changed.

---

### Phase 3 — Cross-Dimension Intelligence (P0)

**Objective:** build the reasoning that genuinely does not exist yet —
composite signals that combine multiple dimension scores into a new
indicator.

**Recommendation — Relationship Engine.** Composite signals such as:
- Execution Readiness ← Leadership + Budget + Capability
- Automation Readiness ← Data + Documentation + Integration
- Transformation Priority ← Business Objective + Pain Point + Priority

**To-do**

- [ ] **3.1 Define each composite as an explicit deterministic formula** —
      same discipline as `calculateDimensionScores`
      (`services/deepDiagnostic.ts:863`), i.e. a weighted function of existing
      answer/dimension values. Per Architecture Principle 2, this must be
      built and reviewable as code, not left for the Phase 5 LLM to infer at
      render time — a composite "readiness" score is exactly the kind of
      number someone will be tempted to hand to the LLM, and it must not be.
- [ ] **3.2 Add the new fields to `DiagnosticContext`** as optional, following
      the §1.5 convention exactly (comment stating "absent on pre-V2
      contexts", consumers treat absence as "not computed", never an error).
- [ ] **3.3 Surface as Composite Executive Signals**: Execution Readiness,
      Data Readiness, Transformation Readiness, Scaling Readiness, Operational
      Stability — replacing "15 individual answers" as the thing an executive
      reader scans first.

**Exit gate:** each composite signal has a documented formula (inputs,
weights, output range), is optional/absent-safe on old stored contexts, and
appears on both Web and PDF.

---

### Phase 4 — Workflow Intelligence (P1)

**Objective:** convert free-text pain points into structured, analysable
workflow data.

**Recommendation — Workflow Classification.** `pain_points` (question 32) and
`manual_processes` (question 33) are free text today — `rankOpportunities`
triggers off the structured `priority_areas` multiselect (question 38), not
off these free-text fields. Mapping: Pain Point → Department → Workflow →
Automation Pattern → Recommended Solution.

**To-do**

- [ ] **4.1 Define a Workflow Taxonomy**: Sales, Finance, HR, Customer
      Support, Operations, Procurement, Marketing, Knowledge, IT.
- [ ] **4.2 Classification step** (LLM-assisted, since this is free-text →
      category and not a number) that maps `pain_points`/`manual_processes`
      text onto the taxonomy. Per Architecture Principle 2, this step
      classifies/labels — it does not assign scores, weights, or ROI figures.
      Its output feeds `rankOpportunities` as an additional signal; it does
      not replace the existing structured-answer trigger path.
- [ ] **4.3 Fallback**: if classification fails or returns low-confidence, the
      existing `priority_areas`-driven ranking must still produce a complete
      opportunity list — this feature is additive, never a hard dependency.

**Exit gate:** a sample of real `pain_points` answers classifies into the
taxonomy with reviewable accuracy; opportunity ranking is unaffected when
classification is unavailable.

---

### Phase 5 — Narrative Composer (P1)

**Objective:** replace template-string interpolation (§1.2) with LLM-composed
narrative, without moving any computation into the LLM.

**Architecture:**

```
Evidence Package (deterministic, from §1.1/§1.2 engine output)
        ↓
      LLM  ← composes only, per Architecture Principle 2
        ↓
Executive Narrative (Current State → Diagnosis → Root Cause → Business Risk → Recommendation → Expected Outcome)
```

**Narrative rules** (restated from the vision doc, load-bearing — do not
relax): the LLM must never compute ROI, compute a score, or change a
recommendation. It may only explain, compose narrative, and improve
readability of evidence the deterministic engine already produced.

**To-do**

- [ ] **5.1 Define the Evidence Package schema** — the exact, closed set of
      fields passed to the LLM (scores, drivers, ROI figures, opportunity
      list, confidence). The LLM receives no field it could mistake for
      permission to invent a number.
- [ ] **5.2 Latency and cost budget.** PDF generation today is measured at
      ~1s (per `DEEP-DIAGNOSTIC-RESULT-PLANNING.md`/free-assessment PDF
      precedent). An LLM call in the render path changes that materially —
      define an explicit budget (target seconds, hard timeout) before
      building this, not after.
- [ ] **5.3 Failure-mode spec: fall back to the existing deterministic
      template on any LLM failure or timeout, visibly logged, never silent.**
      This is not a theoretical risk in this codebase — the zeroclaw gateway
      had exactly this failure mode (30s timeout → silent template fallback
      on Blueprint generation, fixed by raising the timeout to 180s, see
      `docs/OPS-TRANSFORMATION-NARRATIVE-BRIEF.md` history). The existing
      `buildVerdictNarrative`/`buildExecutiveInsight` template functions
      (§1.2) are the fallback — they are not being deleted, they are being
      demoted to a safety net.
- [ ] **5.4 A/B or side-by-side comparison** of template output vs
      LLM-composed output on the same Evidence Package before rollout, to
      confirm the narrative genuinely reads better and does not drift from
      the underlying evidence.

**Exit gate:** LLM-composed narrative ships behind a fallback that is proven
to trigger correctly (tested by forcing a timeout), with a committed latency
budget met in production, and zero instances of the LLM output containing a
number not present in its Evidence Package input.

---

### Phase 6 — Dynamic Dependency Intelligence (P1)

**Objective:** replace the static, per-dimension `DIM_CONSEQUENCE_CHAINS`
(`lib/readinessNarrative.ts:128–135`) with a dependency graph computed from
the actual answer combination in a given run.

**To-do**

- [ ] **6.1 Dependency Graph** — e.g. *Low Data Quality → Low Automation
      Readiness → High Manual Cost → Reduced ROI*, but derived from that
      run's actual `data_quality`/`automation_current`/ROI values rather than
      a fixed string keyed only on "weakest dimension."
- [ ] **6.2 Root Cause Mapping** — Recommendation → Root Cause → Supporting
      Evidence → Affected KPI, reusing the evidence already available from
      Phase 2/3 rather than introducing a new evidence source.

**Exit gate:** two runs with the same weakest dimension but different
underlying answers produce visibly different chains — proof the chain is
computed, not templated per dimension as it is today.

---

### Phase 7 — Executive Experience (P2)

**Objective:** improve reading quality, not add intelligence.

**To-do**

- [ ] **7.1 Executive Snapshot**: Current State → Biggest Constraint →
      Highest Opportunity → Business Value → Recommended First Move →
      Confidence, one screen/page, readable in under a minute.
- [ ] **7.2 Decision Cards** per recommendation, answering: Why this? Why
      now? Why first? What if delayed? Expected outcome? — same five-question
      framework this plan's originating analysis used to evaluate itself.
- [ ] **7.3 Executive Reading Flow**: Summary → Diagnosis → Evidence →
      Recommendation → Financial Case → Roadmap → Blueprint, as the fixed
      section order across Web and PDF.

**Exit gate:** a cold read of the report by someone unfamiliar with the
underlying data can answer all five Decision Card questions per
recommendation without referring back to raw intake answers.

---

### Phase 8 — Product Integration Audit (P2)

**Objective:** confirm Deep Diagnostic → Blueprint → Roadmap → Implementation
forms one continuous flow with no context loss and no duplicated logic. This
phase is intentionally thin — the highest-value part of this audit
(Blueprint's actual field consumption) was pulled forward into Phase 1 (§1.4,
1.3) specifically so the Visibility Matrix wouldn't ship with guessed values
in its Blueprint/Roadmap columns.

**To-do**

- [ ] **8.1 Data continuity check**: for every field flagged "Hidden
      Intelligence" in Phase 1 with a Blueprint/Roadmap gap (e.g.
      `scoreDrivers`, `risks`, `confidence` — confirmed absent from Blueprint
      generation per §1.4), decide per field: should it flow downstream, and
      if so, add it to the handoff payload without Blueprint/Roadmap
      recomputing anything Deep Diagnostic already computed.
- [ ] **8.2 Explicit non-goal restated**: Blueprint and Roadmap already exist
      as shipped products (`app/blueprint`, `app/roadmap`,
      `app/api/blueprints`, `app/api/roadmap`, `lib/blueprintExport.ts`). This
      phase does not rebuild either — it only audits and, where justified by
      8.1, extends the payload passed between them.

**Exit gate:** documented field-by-field map of what flows Deep Diagnostic →
Blueprint → Roadmap today, with every intentional gap justified (not merely
unnoticed).

---

## 5 · Versioning & blast radius

**Every new field this plan adds to `DiagnosticContext`** (Phase 3 composite
signals, Phase 6 dynamic dependency graph, Phase 4 workflow classification
output) **must be optional and absence-safe**, following the exact pattern
`types/diagnostic.ts:459–493` already establishes for `scoreDrivers?` and
`estimateBasis?`: a doc-comment stating which contexts predate the field, and
every consumer treating absence as "not computed," never as an error. Reports
already stored in Postgres for prior Deep Diagnostic runs will not have these
fields — Phase 1's audit and every phase after it must be tested against at
least one pre-V2 stored context, not only fresh runs.

| Area | Impact |
|---|---|
| `types/diagnostic.ts` (`DiagnosticContext`) | New optional fields per Phase 3/4/6 |
| `services/deepDiagnostic.ts` | New composite-signal functions (Phase 3), workflow classification hook (Phase 4) |
| `lib/readinessNarrative.ts` | Dynamic dependency graph replaces static `DIM_CONSEQUENCE_CHAINS` (Phase 6); new Evidence Package extraction for Phase 5 |
| `app/diagnostics/deep/final-result/page.tsx` | New cards/sections (Phase 2, 3, 7) |
| `lib/pdfExport.ts` | Same new sections mirrored into the PDF — must stay in lockstep with the page, per the existing single-source-of-truth pattern (§1.3) |
| `app/api/blueprints/generate/route.ts`, `app/api/roadmap` | Extended payload per Phase 8 findings only |
| Stored `DiagnosticContext` rows (Postgres, per `DEEP-DIAGNOSTIC-RESULT-PLANNING.md` Phase 2) | Old rows lack every new field — graceful degradation required, not a migration |

---

## 6 · Priority table

| Priority | Item | Why |
|---|---|---|
| 🔴 P0 | Intelligence Exposure Audit (incl. Blueprint/Roadmap consumption) | Establishes ground truth before anything is built |
| 🔴 P0 | Intelligence Visibility Matrix | Separates Missing Engine / Hidden Intelligence / Weak Narrative / UX Issue / Data Sparsity — each routes to a different fix |
| 🔴 P0 | Explainability Layer | Exposes reasoning that already exists — highest value per unit of effort |
| 🔴 P0 | Relationship Engine | The one confirmed genuinely-missing scoring capability |
| 🟠 P1 | Workflow Classification | Free text is currently unused signal |
| 🟠 P1 | Narrative Composer (LLM) | Addresses the "feels templated" complaint directly, with an explicit fallback so it can't regress reliability |
| 🟠 P1 | Dynamic Dependency Graph | Upgrades an already-shipped static feature; not blocking |
| 🟠 P1 | Root Cause Mapping | Depends on Phase 3/6 groundwork |
| 🟢 P2 | Executive Experience | Readability polish over correct data |
| 🟢 P2 | Product Integration Audit | Thin by design — heavy lifting already pulled into Phase 1 |

---

## 7 · Open decisions (owner input needed before Phase 5 starts)

1. **LLM provider/model for the Narrative Composer** — not specified in this
   plan. Needs a decision consistent with existing infra (the codebase already
   routes through OpenRouter for Zeroclaw; confirm whether the same path
   applies here or a separate integration is needed).
2. **Latency budget for Phase 5** — what is the acceptable ceiling on report
   generation time once an LLM call is in the path? This gates whether the
   LLM call can be synchronous (blocks PDF generation) or must be
   async/pre-generated.
3. **Whether Phase 4's classification runs at submission time or on demand** —
   affects whether it can ever block report generation the way Phase 5 can.

## 8 · Success metrics

- No intelligence that the engine computes lives only in the backend without
  being visible to the user.
- Every recommendation shows evidence, reasoning, and confidence in
  user-legible form.
- The report reads as consultant analysis, not a template filling values into
  paragraphs — validated by the Phase 5.4 side-by-side comparison, not by
  impression alone.
- New insight is demonstrably cross-dimensional (Phase 3/6 composites), not a
  repackaging of an existing single-dimension score.
- Deep Diagnostic → Blueprint → Roadmap handoff has no recomputation and no
  duplicated logic — verified by the Phase 8 field-by-field map, not assumed.
