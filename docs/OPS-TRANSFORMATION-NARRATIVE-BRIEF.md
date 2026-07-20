# Aivory Report — Operations-Transformation Narrative Brief

**Status:** READY FOR EXECUTION · **Owner:** Irfan · **Source:** CMO executive guidance, 2026-07-20
**Repo:** `Aivory-hub88/avry-user-dashboard` (local checkout `frontend/avry-user-dashboard` in the AVRY-V2 monorepo; deploy = VPS `tencent-vps` checkout `/home/ubuntu/AVRY-V2-Main/frontend/avry-user-dashboard`, container `avry-user-dashboard`)
**Audience of this doc:** an LLM session (Opus 4.8 / Sonnet 5 class) executing the change with no prior context. Everything needed is in this file; verify anchors against live code before editing (line numbers drift).

---

## TL;DR (Bahasa Indonesia)

CMO meminta **evolusi narasi, bukan redesign**: report Deep Diagnostic saat ini bercerita "AI Readiness", padahal positioning Aivory sudah bergeser ke **Business Operations Transformation Platform**. Untuk track narasi (Phase A–D), mesin skoring, kalkulasi finansial, dan recommendation engine **tidak berubah sama sekali** — yang berubah hanya: (1) penamaan section & metrik, (2) urutan section mengikuti alur keputusan eksekutif, (3) framing sebab→akibat + "Executive Insight" per section, (4) AI diposisikan sebagai layer eksekusi di AKHIR cerita, bukan headline. Setelah itu ada **Phase E (§8): peningkatan metode diagnostic & tampilan halaman result** — benchmarking industri, score traceability, riwayat asesmen + delta, sensitivitas ROI, kuantifikasi bottleneck, drill-down dimensi, slider what-if — masing-masing di-gate terpisah karena boleh mengubah output (wajib `methodologyVersion` + kompatibilitas context lama). Kerjakan berurutan A→D dulu (tiap phase punya exit gate; A+B boleh satu deploy, lalu C+D), baru cherry-pick item E.

---

## 1 · The mandate (what the CMO actually asked for)

Current story: `AI Readiness → AI Assessment → AI Blueprint → AI Deployment`.
Required story: `Business Operations Assessment → Operational Health → Transformation Blueprint → Transformation Roadmap → Intelligent Operations`.

The report must progressively answer five executive questions, in this order:

1. **Where are we today?** — operational maturity, business health
2. **What is slowing the business down?** — bottlenecks, manual work, decision latency
3. **What should change first?** — business improvements, not AI projects
4. **What value can we unlock?** — recovered capacity, reduced cost, resilience
5. **Where does AI create the biggest impact?** — only now; AI is the accelerator, not the narrative

Explicit CMO constraints:

- **Do NOT rebuild the report.** Reorder + reframe + rename existing content.
- **Do NOT touch** the intelligence model, scoring methodology, financial calculations, or recommendation engine.
- Every insight should present **cause → effect** ("Low data maturity → inconsistent decisions → lower automation potential → higher operating cost"), not isolated observations.
- Each major section ends with one concise **Executive Insight** recommendation.

## 2 · Repo mental model (read before editing)

The Deep Diagnostic result surface exists in THREE renderers that must stay narratively identical:

| Surface | File | Notes |
|---|---|---|
| Result page (screen) | `app/diagnostics/deep/final-result/page.tsx` | Client component, ~790 lines. CSS module `final-result.module.css`. |
| Premium PDF | `lib/pdfExport.ts` | ~2000 lines, jsPDF. Section order is linear top-to-bottom in `exportReportToPdf`. |
| Hidden print layout | `components/result/PrintableReport.tsx` | Legacy fallback markup rendered invisibly on the result page. Small; keep headings in sync. |

**`lib/readinessNarrative.ts` is the single source of truth for shared narrative** (created 2026-07-19 precisely so page and PDF can never diverge). It exports `MATURITY_BANDS`, `DIM_CONSTRAINT_NOTES`, `DIM_LABELS`, `RISK_SOURCE_LABELS`/`humanizeRiskSource`, `fmtGap`, `buildLeadershipClause`, `buildVerdictNarrative`, `buildFirstMoves`. **All new shared wording and all rewording of existing shared wording happens HERE, once.** Never copy narrative strings into page or PDF directly — a past copy-paste split produced three different numbers (32.5%/33%/38%) for the same gap.

Other load-bearing facts:

- Scores: page & PDF both render **blended `displayScores`** (70% deterministic + 30% LLM). PDF receives `{...context, scores: displayScores}` from `handleDownloadPdf`. Don't disturb this contract.
- The LLM analysis object (`llmResult`: `narrative_summary`, `strengths`, `primary_constraints|blockers`, `automation_opportunities|opportunities`, `recommended_next_step`) comes from the backend bridge. **Its JSON keys are backend contract — rename display labels only, never the keys.**
- basePath is `/dashboard`; every client `fetch()`/asset path must go through `asset()` from `lib/asset.ts` (repo-wide sweep already done — keep it that way).
- `services/deepDiagnostic.ts` owns `maturityFromScore` and the ROI math — **do not modify** anything numeric there.
- Report storage is per-user Postgres via `/api/storage/[entity]` + `lib/reportStorage.ts` — orthogonal to this work; don't touch.

## 3 · Non-negotiable invariants

1. **Zero numeric change.** Scores, bands (Nascent…Optimizing), ROI figures, opportunity ranking, risk severities — all identical before/after. Only strings, order, and added narrative.
2. **Page ↔ PDF narrative parity.** Any sentence that appears on both surfaces must come from one builder in `readinessNarrative.ts`.
3. **Payment/product identifiers are frozen.** `ai_diagnostic`, `ai_blueprint` product IDs, prices ($29/$85), API field names (`organization_id`, `diagnostic_id`, `blueprint_id`…), localStorage keys (`aivory_deep_result` etc.), storage entities (`context|diagnostic|blueprint|roadmap`) — display titles may change, identifiers may NOT.
4. **Backend contract untouched.** No changes to `/api/diagnostics/*`, `/api/blueprints/generate` request/response shapes, or the LLM-output key names.
5. **`maturityFromScore` level names stay** (`Nascent/Initiating/Developing/Defined/Optimizing`) — they read fine under the new positioning; only the band *meaning sentences* get reworded (they live in `MATURITY_BANDS`).

## 4 · Rename map (display strings only)

Apply everywhere the left column is user-visible. Grep each old string across `app/`, `components/`, `lib/` — anchors listed are the known majors, not exhaustive.

| Current | New | Known anchors |
|---|---|---|
| AI Readiness Assessment Report (PDF cover + letter) | Business Operations Assessment | `lib/pdfExport.ts` ~863, ~959, ~1342 |
| AI Readiness Diagnostic (print title) | Business Operations Assessment | `components/result/PrintableReport.tsx:53` |
| AI Readiness Score | Operational Health Score | `components/diagnostics/DiagnosticSummary.tsx:21`, `components/blueprint/ExecutiveSummary.tsx:27` |
| Executive Scorecard | Operational Health | page ~294, `pdfExport.ts` ~1361, `PrintableReport.tsx:58` |
| Readiness Verdict | Executive Operational Diagnosis | page ~336, `pdfExport.ts` ~1517 |
| AI Analysis | Business Operations Analysis | page ~353, `pdfExport.ts` ~1550, `PrintableReport.tsx:108` |
| Automation Opportunities (list heading inside AI section) | Transformation Opportunities | `pdfExport.ts` ~1574 (`renderAiList` call) |
| Opportunity Analysis / Opportunity Priority Matrix | Transformation Opportunities | `pdfExport.ts` ~1644, page ~588 |
| Room for Improvement | Operational Improvement Priorities | page ~733, `pdfExport.ts` ~1924 |
| Diagnostic Context | Business Context | page ~629, `pdfExport.ts` ~1597 |
| ROI Projection | Financial Case | page ~415, `pdfExport.ts` ~1682, `PrintableReport.tsx:74` |
| AI System Blueprint / AI Blueprint | Transformation Blueprint | page CTA ~780, `app/blueprint/page.tsx` (563, 575, header), `components/blueprint/BlueprintHeader.tsx:71`, `lib/blueprintExport.ts` (91–232), `lib/subscriptionPlans.ts:29`, `components/settings/ActivateFeaturesSection.tsx` (titles only, NOT productIds), `PaymentHistoryTab.tsx:105`, `app/dashboard/payments/page.tsx:124`, `lib/userContextState.ts:156` |
| AI Implementation Roadmap | Transformation Roadmap | `app/roadmap/page.tsx:42` (COVER_INTRO), roadmap headers |
| AI Readiness Deep Diagnostic (purchase card) | Business Operations Deep Diagnostic | `ActivateFeaturesSection.tsx:195,208` (display strings only) |

Financial metric labels (calculations identical, labels only):

| Current | New |
|---|---|
| Total Annual Savings | Business Value Created |
| Annual Labor Savings | Recovered Labor Value |
| Annual Process Savings | Process Efficiency Value |
| Hours Reclaimed / Year | Recovered Team Capacity |
| Cost of Inaction (90 days) | Operational Cost of Delay (90 days) |
| Payback Period / 3-Year ROI / NPV / Net Annual Savings | unchanged (already business language) |

Anchors: page ROI tiles ~432–450, `pdfExport.ts` ROI tile block ~1475–1515 & narrative mentions, `PrintableReport.tsx` ROI rows.

⚠️ When renaming inside `pdfExport.ts` narrative paragraphs, reread the sentence — several paragraphs say "readiness assessment"/"AI readiness" mid-sentence (e.g. ~959 letter, ~1985 closing note, `blueprintExport.ts:107`). Reword the sentence, don't just word-swap.

## 5 · New information architecture

### Resolution of the guidance's one ambiguity
The CMO table maps "AI Analysis → Business Operations Analysis" AND ends the flow with a separate "AI Enablement" section. Resolution (decided): the **LLM-generated analysis section is renamed "Business Operations Analysis" and moves UP** into the diagnosis position (it genuinely analyses operations); a **new final section "AI Enablement"** closes the report, assembled from existing data (top opportunities framed as AI-accelerated moves + the Transformation Blueprint CTA). No new intelligence is generated.

### Result page — target order

| # | Section (new name) | Built from (existing) | Executive question |
|---|---|---|---|
| 1 | Executive Summary | NEW thin section: 2–3 sentences from `buildVerdictNarrative` first clause + composite + top opportunity + Business Value Created figure. Add builder `buildExecutiveSummary()` in `readinessNarrative.ts`, shared with PDF. | orientation |
| 2 | Operational Health | current Executive Scorecard (ring, radar, strongest/weakest, bullets) — rename only | Where are we today? |
| 3 | Executive Operational Diagnosis | current Readiness Verdict + NEW cause→effect chains (§6) + Executive Insight | What's slowing us down? |
| 4 | Business Operations Analysis | current AI Analysis (LLM) — rename, move here, relabel sub-lists (Strengths / Primary constraints / Transformation opportunities) | diagnosis, cont. |
| 5 | Operational Constraints | current Risk Register — rename heading to "Operational Constraints", keep RiskCard as-is ("Signal: …" labels already humanized) | What's slowing us down? |
| 6 | Transformation Opportunities | current Opportunity Priority Matrix — rename only | What should change first? |
| 7 | Financial Case | current ROI Projection with §4 label renames | What value can we unlock? |
| 8 | Operational Improvement Priorities | current Room for Improvement — rename; intro sentence now says these feed the Transformation Blueprint | What should change first? |
| 9 | Business Context | current Diagnostic Context — rename, keep late position (reference material) | appendix |
| 10 | AI Enablement | NEW closing section: 1 paragraph (`buildAiEnablement()` builder) positioning AI as execution layer — "Business → Operations → Processes → Data → Automation → AI" — plus the existing Generate Blueprint CTA renamed "Transformation Blueprint" | Where does AI accelerate? |

### PDF — target order
Cover ("Business Operations Assessment") → Editorial letter (reworded) → Executive Summary (new, same builder) → Operational Health (scorecard) → Executive Operational Diagnosis (verdict + chains) → Business Operations Analysis → Business Context → Transformation Opportunities → Financial Case (+ Methodology, unchanged inside) → Operational Improvement Priorities → Operational Constraints (risk register) → AI Enablement + Next Steps → Closing Note (reworded).

PDF mechanics: sections in `exportReportToPdf` are sequential blocks — reordering = moving code blocks. Move whole blocks including their `ensureSpace`/`renderTransition` calls; rewrite the `renderTransition` bridge sentences to fit the new adjacency (they are short connective lines like "That verdict rests on…"). The `Risk Register` renderer at ~1264 is a helper called from the flow — find its call site to relocate.

`PrintableReport.tsx`: apply renames + same order for its (much smaller) section list.

## 6 · Cause → effect and Executive Insight (the only new content)

All in `lib/readinessNarrative.ts`, exported and consumed by BOTH page and PDF:

```ts
/** Per-dimension consequence chain, weakest dimension only (keep it focused). */
export const DIM_CONSEQUENCE_CHAINS: Record<string, string[]> = {
  data: ['Low data maturity', 'Inconsistent operational decisions', 'Lower automation potential', 'Higher operating costs'],
  process: ['Undocumented core processes', 'Fragile, person-dependent operations', 'Automation breaks on exceptions', 'Slower, riskier scaling'],
  strategy: ['No quantified operational KPIs', 'Improvement value is invisible', 'Investment decisions stall', 'Efficiency gains go unfunded'],
  people: ['Missing skills and ownership', 'Change adoption stalls', 'Tools go unused', 'Manual work persists'],
  governance: ['No oversight structures', 'Inconsistent execution quality', 'Compounding operational risk', 'Scaling multiplies errors'],
  security: ['Undefined data guardrails', 'Sensitive data exposure risk', 'Compliance blockers surface late', 'Transformation initiatives stall'],
}

export function buildExecutiveSummary(v: VerdictInputs & { businessValueLabel: string | null; topOpportunityTitle: string | null }): string
export function buildExecutiveInsight(section: 'diagnosis'|'opportunities'|'financial'|'improvements', inputs: …): string
export function buildAiEnablement(inputs: { topOpportunityTitle: string|null; weakestLabel: string }): string
```

Rules for the insight copy (CMO example as the bar): concrete, consequence-first, one recommendation, no hedging. Reference model: *"Your greatest constraint is not AI capability. It is inconsistent operational processes. Standardising workflows before automation will reduce implementation risk, improve adoption, and accelerate ROI."* Derive the diagnosis insight from `weakestDimension`; the financial insight from payback/ROI presence; the opportunities insight from the top quick-win. Deterministic string templates only — no LLM calls.

Rendering: page gets a small `ExecutiveInsight` styled block (reuse `.aiNextStep` visual pattern in `final-result.module.css` — bordered accent callout); PDF gets the existing `renderNextStepCallout` treatment. Cause→effect chain renders as a compact `A → B → C → D` line (page: inline chips or arrow-joined text; PDF: one narrative line via existing `renderNarrative`).

Also reword in place (same file, keep structure): `MATURITY_BANDS[].meaning` — currently AI-deployment-centric ("ready for closely supervised pilots…") → operations-centric ("the organization can standardise and instrument its core workflows while piloting automation in narrow, low-risk areas…" etc.). `DIM_CONSTRAINT_NOTES` mostly survive; reword `data`/`strategy` to lead with the business consequence. `buildVerdictNarrative` sentence frame: "…sits in the X band of the five-level Aivory **operational maturity** scale…"; keep score/band/weakest/strongest structure. `buildFirstMoves` titles survive ("Fix the foundation / Prove value fast / Size the budget / Secure the mandate" — already operations language).

## 7 · Work plan

**Phase A — Renames (page + PDF + PrintableReport + satellite components).** Mechanical, §4 tables. Includes `MATURITY_BANDS`/`DIM_CONSTRAINT_NOTES`/`buildVerdictNarrative` rewording since those strings are shared. Exit gate: `grep -ri "readiness" app/ components/ lib/` returns only identifiers/comments (no user-visible strings except deliberate ones), page renders, PDF generates.

**Phase B — Reorder (page JSX blocks, PDF code blocks, PrintableReport).** Exit gate: section order on both surfaces matches §5 tables; every `renderTransition` bridge sentence still makes sense read aloud.

**Phase C — New narrative (Executive Summary, chains, Executive Insights, AI Enablement).** All builders in `readinessNarrative.ts`, consumed by both surfaces. Exit gate: identical insight strings on page and PDF for the same context (spot-check by generating both from one seeded context).

**Phase D — Satellite surfaces.** Blueprint page/exports (`app/blueprint/page.tsx`, `lib/blueprintExport.ts`), roadmap page COVER_INTRO, purchase/settings cards, payment history labels, `lib/subscriptionPlans.ts`. Exit gate: no surviving "AI Readiness"/"AI System Blueprint" user-visible strings anywhere in the dashboard.

**Phase E — Method & result-page enhancements.** Separate track, see §8. Only start after A–D are deployed and verified — E deliberately breaks the "zero numeric change" invariant that gates A–D, so keeping them in separate commits/deploys is what makes regressions attributable.

Commit per phase (A+B may be one commit; C and D separate). Conventional messages, e.g. `feat(report): operations-transformation narrative — renames (Phase A)`.

## 8 · Phase E — Enhancing the diagnostic method & result-page presentation

The CMO guidance froze the engine; the product owner additionally wants the *method itself* and the *result page* to get stronger over time. This section is that roadmap. Everything here is **opt-in and individually gated** — pick items top-down, one deploy each, never bundled with narrative phases.

### E-invariants (different from A–D)

1. Any change that alters a score or financial figure must bump a `methodologyVersion` field on `DiagnosticContext` and be handled in `upgradeDiagnosticContext` (`services/deepDiagnostic.ts`) so **stored contexts from before the change still render correctly** — old reports must never silently re-score.
2. The 70/30 deterministic/LLM blend contract and `maturityFromScore` thresholds only change with an explicit owner decision (they are quoted in sales conversations).
3. What-if/interactive elements on the page must be visually labelled as simulations and must **never write back** into the stored context.

### E1 — Method enhancements (ordered by value ÷ effort)

| # | Enhancement | What it is | Implementation sketch | Effort |
|---|---|---|---|---|
| E1.1 | **Industry benchmarking** | Show each dimension + composite against an industry median/quartile so "58" becomes "58 vs industry median 52". Executives think in relative position, not absolute scores. | Static benchmark table to start: `lib/industryBenchmarks.ts`, `Record<industry, Record<dimension, {median, p75}>>` seeded from published operations-maturity research (label the source + "directional benchmark" disclaimer). Industry already flows in via `qualitative.industry` / `industryHint`. No score change — pure overlay ⇒ no methodologyVersion bump. | S |
| E1.2 | **Score traceability (drivers)** | For each dimension, list the 2–3 answers that most lowered/raised it. Kills the "black box score" objection. | The deterministic scorer in `services/deepDiagnostic.ts` already maps answers→dimension contributions internally; surface a `scoreDrivers: Record<dimension, {answerKey, label, direction}[]>` on `DiagnosticContext` at build time. Overlay only ⇒ no version bump. Reuse `humanizeRiskSource`-style labels from `readinessNarrative.ts`. | M |
| E1.3 | **Assessment history / delta** | "Operational Health improved 58 → 66 since March." Storage is already per-user Postgres (`dashboard.*`, one latest row per user) — add append table `dashboard.diagnostic_history` (user_id, data, created_at; INSERT on every save, no upsert) via a new migration file, and show a delta chip + sparkline when ≥2 rows exist. This was pre-planned as "history can come later" in decision D1 of `docs/DEEP-DIAGNOSTIC-RESULT-PLANNING.md`. | New migration + one INSERT in `/api/storage/context` POST + a `GET /api/storage/history` handler. Overlay ⇒ no version bump. | M |
| E1.4 | **ROI sensitivity surface** | The scenario range (50–90% efficiency) exists but is buried. Promote it: tornado-style "which assumption moves the number most" (hourly rate, efficiency factor, automation gap). | Deterministic re-evaluation of the existing formula at ±bounds — computation lives next to `calculateROI`, rendered in Financial Case. Display-only ⇒ no version bump. | M |
| E1.5 | **Bottleneck quantification** | Turn `topPainPoints` free text into per-pain-point estimated hours/cost (split heuristic already exists for bullets). Makes "What is slowing the business down?" concrete. | Allocate `hoursReclaimedPerYear` across pain points proportionally (equal-weight v1), label "estimated allocation". Display-only. | S |
| E1.6 | **Richer LLM analysis grounding** | The bridge prompt receives phases; enrich it with the deterministic scores + top opportunities so `narrative_summary` stops re-deriving what the engine already knows, and reword it to operations language (see §10.1). | vps-bridge change (outside this repo) — coordinate separately; the dashboard already forwards `diagnostic_data` on blueprint generation as the pattern to copy. | M (cross-repo) |
| E1.7 | **Confidence surfacing** | `confidenceLevel`/`missingInputs` exist but only appear as a banner when data is thin. Show a small "evidence strength" indicator per section (financials = f(inputs present)). | Pure display over existing fields. | S |

### E2 — Result-page presentation enhancements

| # | Enhancement | Notes |
|---|---|---|
| E2.1 | **Benchmark overlay on the radar + bars** (pairs with E1.1) | Second faint series on `RadarChart` (`components/result/RadarChart.tsx`) + "vs median" ticks on dimension bars. Keep the current single-series look when no benchmark exists for the industry. |
| E2.2 | **Dimension drill-down** (pairs with E1.2) | Each dimension row expands (accordion) to its drivers: answer → contribution direction → consequence line from `DIM_CONSEQUENCE_CHAINS`. PDF gets a compact "Score drivers" sub-list per dimension — shared strings via `readinessNarrative.ts`, as always. |
| E2.3 | **Delta header chip** (pairs with E1.3) | In `HeaderBar`: "▲ +8 since 12 Mar 2026" when history exists. |
| E2.4 | **What-if efficiency slider** (pairs with E1.4) | In Financial Case: slider 50–90% efficiency re-rendering the headline figures client-side, framed "Simulation — your report assumes 75%". Never persisted (E-invariant 3). |
| E2.5 | **Sticky section nav / progress rail** | The report is now ~10 sections; add an in-page anchor rail (desktop) so executives can jump Health → Diagnosis → Financial Case. CSS-only + `scrollIntoView`; no data work. |
| E2.6 | **Section-level "so what" density pass** | After Phase C ships, audit every chart/table for a one-line takeaway underneath (the Executive Insight covers the section; each visual still deserves a caption). Copy through `readinessNarrative.ts` builders where PDF shares it. |

**Recommended first slice:** E1.1 + E2.1 (benchmarking) — highest executive impact, zero engine risk, no version bump. Then E1.2 + E2.2 (traceability), then E1.3 + E2.3 (history).

**Every E item exit gate:** old stored contexts render unchanged; `npm run build` green; page & PDF stay narratively identical for shared strings; if a figure changed, `methodologyVersion` bumped + `upgradeDiagnosticContext` handles the old shape.

## 9 · Verification playbook (battle-tested on this repo)

**Local preview:** dev server config `user-dashboard` in `.claude/launch.json` → port 9000, basePath `/dashboard`. The result page needs seeded data + auth; from any page on `localhost:9000`, run in the browser console:

```js
localStorage.setItem('aivory_auth', JSON.stringify({ access_token: 'dev', user: { user_id: 'dev-preview-user', email: 'preview@aivory.id', account_type: 'free', created_at: '2026-01-01', tier: 'blueprint', is_subscribed: true, has_diagnostic: true, has_snapshot: true, has_blueprint: true, credits: 100, credits_max: 100 } }))
localStorage.setItem('aivory_diagnostic_context', JSON.stringify({ company: 'Acme Logistics', currency: 'USD', submittedAt: '2026-07-18T10:00:00Z', scores: { strategy: 66, data: 41, process: 52, people: 60, governance: 55, security: 70, composite: 58, maturityLevel: 'Developing', strongestDimension: 'security', weakestDimension: 'data' }, quantitative: { ticketVolumePerDay: null, ahtCurrentMinutes: null, ahtTargetMinutes: null, costCurrentPerTicket: null, costTargetPerTicket: null, totalManualHoursWeekly: 120, fteCountInScope: 12, currentAutomationPct: 20, targetAutomationPct: 70, budgetMidpointUSD: 63000, timelineMonths: 12 }, calculations: { totalAnnualSavingsLocal: 84240, totalAnnualSavingsUSD: 84240, annualLaborSavingsLocal: 70200, annualProcessSavingsLocal: 14040, hoursReclaimedPerYear: 2340, paybackMonths: 8.974358974358974, threeYearROIPercent: 301.14285714285717, assumedBudgetMidpointLocal: 63000, assumedBudgetMidpointUSD: 63000, assumedHourlyRateUSD: 30, assumedHourlyRateLocal: 30, efficiencyFactor: 0.75, confidenceLevel: 'high', hasEnoughDataForProjection: true, missingInputs: [], costOfInaction90DaysLocal: 20771.50684931507, annualOngoingCostLocal: 12600, annualOngoingCostUSD: 12600, netAnnualSavingsLocal: 71640, netPaybackMonths: 10.6, netThreeYearROIPercent: 241, npv3YearLocal: 115158, npv3YearUSD: 115158, scenarioThreeYearROI: { low: 107, base: 241, high: 321 } }, opportunities: [{ id: 'opp1', title: 'Invoice processing automation', impact: 80, effort: 25, quadrant: 'quick_win', timeToValueWeeks: 4, estimatedSavingsLocal: 30000, projectedROINote: 'High-volume manual process', prerequisites: [], dataReadiness: 'ready', complexity: 'low' }], risks: [{ id: 'r1', risk: 'Budget not formally allocated.', severity: 'HIGH', source: 'budget_allocated', detected: true }], qualitative: { primaryObjective: 'Reduce manual back-office workload', topPainPoints: 'Manual invoice entry, slow customer response, duplicated data entry', painPointHours: 'Invoice entry ~10 hrs/week; customer response ~5 hrs/week', leadershipAlignment: 'Supportive but cautious', priorAIAttempts: 'No previous attempts', aiCapability: 'Basic', implementApproach: 'Phased', delayConsequence: 'Rising costs', errorTolerance: 'Low', resistanceSources: [], dataResidency: 'Indonesia', industry: 'Logistics / Supply Chain', compliance: [] }, roomForImprovement: [{ id: 'imp1', area: 'Data', title: 'Centralize operational data', priority: 'high', currentState: 'Scattered spreadsheets.', recommendedAction: 'Consolidate spreadsheets into a single system of record.', operationalImpact: 'Enables reliable automation inputs.', before: 'Scattered spreadsheets', after: 'Single source of truth' }] }))
```

> The `calculations`/`quantitative` blocks above are **engine-consistent** (regenerated 2026-07-20 from `calculateROI` with the shown `quantitative` inputs — B1.5 audit): 3-Year ROI 301% = (84240×3−63000)/63000, payback 8.97mo → "9 mo", 2,340 hrs = 120×52×0.5×0.75. The earlier hand-typed seed (240% ROI, $84k, 2300 hrs) was internally inconsistent and produced the false "card ≠ methodology" QA finding. If you edit these inputs, regenerate the calculations from the engine — don't hand-type them.

Then open `localhost:9000/dashboard/diagnostics/deep/final-result`. (Storage API 500s in local dev — expected, no `JWT_SECRET`/`DATABASE_URL`; the page falls back to localStorage.)

**PDF check in node:** esbuild-bundle `lib/pdfExport.ts` with `--alias:@=<repo>` from repo root, monkey-patch `(jsPDF.API as any).save` to write `this.output('arraybuffer')` to a file, call `exportReportToPdf` with the seeded context — canvas/fetch degrade gracefully (helvetica fallback). Read the PDF visually with a PDF-capable reader. Do this once BEFORE changes (baseline) and after each phase.

**Build:** `npx tsc --noEmit` (3 pre-existing errors are known: `app/integrations/callback/route.ts`, `lib/templates/templateToCanvas.ts`, `next.config.ts` — ignore) then `npm run build` (must exit 0).

**Deploy (per phase or batched):** commit → `git push aivory-hub main` (remote = Aivory-hub88 fork; token remote already configured in the local checkout) → SSH `tencent-vps` → `cd /home/ubuntu/AVRY-V2-Main/frontend/avry-user-dashboard && git fetch origin && git merge --ff-only origin/main` → `cd /home/ubuntu/AVRY-V2-Main && docker compose -f docker-compose.prod.yml up -d --build --no-deps avry-user-dashboard` → verify `curl -H 'Host: www.aivory.id' http://localhost:9001/dashboard/diagnostics/deep/final-result` is 200 and new strings appear in `.next/static/chunks/` inside the container.

**Known deploy gotchas:** (1) if `npm ci` fails in the image build with a lock-sync error, regenerate the lock on the VPS with `docker run --rm -v $PWD:/app -w /app node:20-alpine npm install --package-lock-only`, commit from the VPS (`git push origin HEAD:main` — its working branch is `feat/diagnostic-report-upgrades`); (2) NEVER leave uncommitted edits on the VPS — they get silently reverted (observed 4+ times); (3) untracked local WIP exists in the checkout (`components/workflow/AddWithAivoryPanel*`, `WorkflowAivoryRefineModal.tsx`, `lib/deepDiagnosticScoring.ts`, `lib/requireEnv.ts`) — stage files EXPLICITLY, never `git add -A`.

## 10 · Out of scope / follow-ups (do not do now, flag when done)

1. **LLM prompt in the bridge** — the generated `narrative_summary` text itself may still say "AI readiness…" (prompt lives in the vps-bridge `diagnostics/run` path on the VPS, outside this repo). Follow-up: reword that prompt to operations language. Until then the renamed section heading is honest ("Business Operations Analysis") even if the prose mentions AI.
2. **Landing site copy** (`Frntend-nxt` repo) — CMO says it already shifted; not touched here.
3. **Blueprint/Roadmap PDF deep content** (`lib/pdfExport.ts` blueprint/roadmap exporters + `lib/blueprintExport.ts` docx) — Phase D covers their titles/headings; a deeper narrative pass is a separate task.
4. **Band names** (`Nascent…Optimizing`) — kept; renaming them would touch `maturityFromScore` comparisons everywhere.

## 11 · Acceptance criteria

**Narrative track (Phases A–D):**

- [ ] All §4 renames applied on page, PDF, PrintableReport, and satellite surfaces; no user-visible "AI Readiness" / "Readiness Verdict" / "AI System Blueprint" strings remain (grep-verified).
- [ ] Section order on page AND PDF matches §5; transitions read naturally.
- [ ] Executive Summary opens both surfaces; AI Enablement closes both; each major section ends with an Executive Insight; weakest-dimension cause→effect chain renders on both.
- [ ] All shared strings live in `lib/readinessNarrative.ts`; zero narrative duplication between page and PDF.
- [ ] Numbers identical to pre-change baseline (same seeded context → same scores, same currency figures, same opportunity order).
- [ ] Payment product IDs, API shapes, localStorage keys, storage entities unchanged.
- [ ] `npm run build` exit 0; deployed; live page 200; new strings verified in served chunks; PDF downloads and reads correctly.

**Enhancement track (Phase E, per item shipped):**

- [ ] Item shipped as its own commit + deploy, never bundled with a narrative phase.
- [ ] Old stored contexts (pre-change localStorage AND `dashboard.*` rows) still render without error or silent re-scoring; `methodologyVersion` bumped when any figure changed.
- [ ] Interactive/what-if elements labelled as simulation and never persisted.
- [ ] Benchmarks/overlays cite their source and degrade gracefully when data for the user's industry is absent.
