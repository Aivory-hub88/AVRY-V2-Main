# Deep Diagnostic — Bahasa Indonesia Language Support

**Status:** Phase 1 (Intake flow) and Phase 2 (Results page + PDF report) —
✅ **BOTH SHIPPED** 2026-08-04. Phase 1 pushed as `84dfd62`, Phase 2 pushed
as `bfd94f4`, both in `avry-user-dashboard` on `Aivory-hub88` (canonical
remote). The full assessment — intake, review, results page, and the
downloadable PDF — now renders end to end in Bahasa Indonesia.
**Owner:** Irfan · **Source:** product request, 2026-08-04 — parity with the
free assessment landing page, which already ships a bilingual EN/ID
experience.
**Scope:** the entire Deep Diagnostic ("Business Operation" assessment) user
journey in `avry-user-dashboard` — intake question phases, the review/summary
page, the on-screen results page (`final-result/page.tsx`), and the
generated PDF report (`lib/pdfExport.ts`).
**Repo:** `Aivory-hub88/avry-user-dashboard`

---

## 1 · Why this exists

The Deep Diagnostic assessment was English-only. The landing page's free
assessment already has a `<select>` language dropdown (EN/ID) driving a
hand-rolled content-swap (`frontend-nextjs/src/lib/assessmentCopy.ts`). The
ask was to bring the same language choice to the Deep Diagnostic assessment
in the user dashboard, including the generated document — scoped down to
just the intake flow for this first phase given the size of the full task
(~500-700 strings across intake, results, and PDF narrative generation).

## 2 · What shipped (Phase 1)

- **Locale plumbing reused, not reinvented.** The dashboard already ships an
  app-wide `next-intl` locale system (`hooks/useLocale.tsx`,
  `LocaleProvider`/`useLocaleContext`, persisted to
  `localStorage.aivory_locale`) wrapping the whole app via
  `components/LocaleWrapper.tsx`. It was already active under
  `/diagnostics/deep`, just unreachable there because that route's layout
  hides the app sidebar (and with it, the existing `LanguagePill` toggle).
  This plan added a `<select>` dropdown directly on the assessment page
  (matching the free-assessment's literal dropdown pattern, per explicit
  request) that calls the same `setLocale()` — so it always stays in sync
  with `LanguagePill` wherever else it's visible in the dashboard. Neither
  the pill nor the underlying locale system was replaced or altered.
- **Canonical value vs. localized label — the load-bearing constraint.**
  `constants/deepDiagnosticQuestions.ts` option **strings** are matched
  literally by the deterministic scorer, risk classifier, and score-driver
  logic in `services/deepDiagnostic.ts`, and by stored answers
  (localStorage + Postgres). New file
  `constants/deepDiagnosticQuestionsId.ts` provides Indonesian labels
  positionally aligned to the canonical `options[]` arrays — the **stored/
  scored value never changes**, only the rendered label does. Verified live:
  selected an answer with the UI in Indonesian, confirmed via
  `localStorage.aivory_deep_diagnostic` that the stored value was still the
  original English string; switching back to English correctly re-selected
  the same answer.
  - This is the same rule the free assessment already established
    (`assessmentCopy.ts:14-19`: canonical ids never translate, only labels
    do) — reused, not reinvented.
- **Wired end to end:** `components/diagnostics/PhaseContent.tsx` (question
  text, helper text, placeholders, and select/radio/multiselect option
  labels — value/label split across all three render paths),
  `components/diagnostics/PhaseNavigator.tsx` (phase titles in the step
  nav), `components/diagnostics/ProgressTracker.tsx` (progress chrome),
  `app/diagnostics/deep/page.tsx` (dropdown + all page chrome: banners,
  buttons, company name field), `app/diagnostics/deep/summary/page.tsx`
  (dropdown + review page chrome, and answer-value → translated-label
  remapping so the review screen shows Indonesian labels for canonically-
  stored English answers).
- **`components/diagnostics/DiagnosticSummary.tsx` was audited and
  deliberately left untouched** — confirmed via repo-wide grep to be
  unused/unreachable dead code (not rendered anywhere in the flow), so
  translating it would have been wasted work.
- Chrome strings use inline `locale === 'id' ? … : …` conditionals via
  `useLocaleContext()` rather than extending the `next-intl` `messages/*.json`
  namespace — a deliberate simplification made during implementation (the
  original plan called for the messages-namespace approach) for consistency
  across all the small components touched, and because the string count per
  component was small enough that the extra indirection wasn't worth it.
- **Verified live**, not just typechecked: ran the dashboard dev server,
  bypassed auth via the documented `aivory_auth` localStorage injection,
  walked the intake flow and the review page with the dropdown switched to
  Bahasa Indonesia, confirmed correct rendering, zero console errors, and
  confirmed the canonical-value/localized-label split holds via direct
  `localStorage` inspection. `tsc --noEmit` clean (only 2 pre-existing
  unrelated errors elsewhere in the project).

## 3 · Files touched (Phase 1)

- **New:** `constants/deepDiagnosticQuestionsId.ts`
- **Modified:** `components/diagnostics/PhaseContent.tsx`,
  `components/diagnostics/PhaseNavigator.tsx`,
  `components/diagnostics/ProgressTracker.tsx`,
  `app/diagnostics/deep/page.tsx`,
  `app/diagnostics/deep/deep-diagnostic.module.css`,
  `app/diagnostics/deep/summary/page.tsx`,
  `app/diagnostics/deep/summary/summary.module.css`
- **Not touched (by design):** `services/deepDiagnostic.ts` (scorer — must
  never match on translated text), `lib/readinessNarrative.ts`,
  `lib/pdfExport.ts`, `app/diagnostics/deep/final-result/page.tsx`,
  `app/diagnostics/deep/result/page.tsx`, `components/shared/LanguagePill.tsx`

---

## 4 · What shipped (Phase 2) — Results page + PDF report in Indonesian

**Objective met:** when a user completes the assessment in Indonesian, the
results page (`app/diagnostics/deep/final-result/page.tsx`) and the
exported PDF (`lib/pdfExport.ts`) now render in Indonesian too — closing the
gap the user originally asked for ("dokumen dalam bahasa Indonesia").

Research ahead of implementation confirmed the doc's original size estimate
held (`lib/readinessNarrative.ts` composes prose from template literals, not
a flat dictionary) but found the true scope was larger than first estimated:
roughly **half of `lib/pdfExport.ts`'s narrative text is its own separate
hardcoded copy**, not sourced from `readinessNarrative.ts` at all (financial-
case narrative, opportunities intro, methodology walkthrough, editorial
cover letter, CTA steps, closing note) — each needed independent Indonesian
prose, not just a translated lookup table.

**Architecture decisions actually taken (differ from the original to-do
list below in one respect — see 4.2):**

- **4.1 (as planned) — `lib/readinessNarrative.ts` locale-parameterized.**
  All 20 exported builders + 13 lookup tables now take a `locale` param and
  branch into independent English/Indonesian template literals (not a
  translated interpolation into the English sentence skeleton — e.g. the
  English-only "a/an" article logic in `buildExecutiveSummary` has no
  Indonesian equivalent and is skipped entirely on that branch).
- **4.2 (deviates from plan) — `lib/pdfExport.ts` threads `locale` as a
  parameter, not a pre-resolved `strings`/`labels` object.** The plan called
  for following `assessmentPdf.ts`'s pattern (caller pre-resolves all copy
  into one object). In practice `pdfExport.ts`'s ~20 helpers each own their
  English literals inline already, so adopting that pattern would have meant
  rewriting every helper's internals rather than adding a parameter — for a
  file this size, threading `locale: 'en' | 'id'` through `exportReportToPdf`
  and each helper it calls was the lower-risk mechanical change. Also
  re-specified the `boldSubstrings()` bold-highlight phrase lists for
  Indonesian wording (they must match verbatim substrings in the *localized*
  sentence, not a translation of the English phrase), fixed the hardcoded
  `en-GB` date locale, and bumped ~10 flat `ensureSpace()` pagination budgets
  for Indonesian's longer text.
- **4.3 (as planned, larger than estimated) — `final-result/page.tsx` +
  12 child components under `components/result/`.** ~90 strings translated
  (vs. the ~55 first estimated), reusing the same dropdown pattern as
  Phase 1's intake pages.
- **Not in the original to-do list, but required:** the upstream prose
  `readinessNarrative.ts` composes *around* — `services/deepDiagnostic.ts`'s
  `buildRoomForImprovement`, `rankOpportunities`, `classifyRisks`, and
  `computeScoreDrivers` — also needed Indonesian versions. These now compute
  **both locales at submission time** and store the Indonesian output as new
  optional fields on `DiagnosticContext` (`roomForImprovementId?`,
  `opportunitiesId?`, `risksId?`, `scoreDriversId?`), following the exact
  same absence-safe convention as the existing `scoreDrivers?` field — the
  results page and PDF prefer the `Id` field when present and the current
  locale is `id`, and fall back to the English field otherwise. This means
  switching the dropdown after submission is instant (no recomputation), and
  a pre-Phase-2 stored report (missing the `Id` fields) degrades gracefully
  to English for just those fields rather than breaking.
- **4.4 resolved implicitly:** Deep Diagnostic reports are not emailed
  today (confirmed — no email-report code path exists in this flow, unlike
  the free assessment), so the non-goal question didn't apply.
- **4.5 verified** — see below.

**3 real bugs found and fixed during live verification** (not caught by
`tsc`, only visible in actual rendered Indonesian output):
1. `services/deepDiagnostic.ts`'s Data-dimension improvement item produced
   "kualitasnya kualitas sedang, perlu dibersihkan" (doubled "kualitas") —
   the template prepended a word already present in the translated label.
2. `lib/readinessNarrative.ts`'s `buildEvidenceUsed` interpolated raw
   percentage numbers directly (`${quantitative.currentAutomationPct}%`),
   which skipped the Indonesian comma-decimal formatting other call sites
   got automatically — fixed by routing through `fmtGap()`.
3. `lib/bottleneckQuantification.ts`'s `formatPainPointHours` had no locale
   param at all — pain-point hour figures stayed in English ("~15 hrs/week")
   even with the rest of the report in Indonesian.

**Verified live**, not just typechecked: seeded a full synthetic intake
answer set directly into `localStorage` and submitted it through the real
`buildDiagnosticContext` code path (not a hand-authored context, so every
computed field — scores, ROI, opportunities, risks, improvements — is
genuine engine output). Confirmed: the entire results page renders correctly
in Indonesian; switching back to English has zero regressions; the "Download
Full Report" button produces a complete ~1.04MB Indonesian PDF blob with
zero thrown errors; and stripping the `Id` fields from a stored context and
reloading in Indonesian correctly falls back to English for exactly the
affected fields (opportunity titles, first-move text, risk descriptions)
while everything else stays Indonesian — no crash, no blank sections.
`tsc --noEmit` clean throughout (only the 2 pre-existing unrelated errors
noted in Phase 1 remain in the full project).

**Files touched (Phase 2):** `lib/readinessNarrative.ts`,
`lib/resultFormatters.ts`, `lib/bottleneckQuantification.ts`,
`lib/industryBenchmarks.ts`, `lib/diagnosticHistory.ts`, `lib/pdfExport.ts`,
`services/deepDiagnostic.ts`, `types/diagnostic.ts`,
`app/diagnostics/deep/final-result/page.tsx`,
`app/diagnostics/deep/final-result/final-result.module.css`, and 12 files
under `components/result/` (`HeaderBar`, `DeltaChip`, `ScoreRing`,
`RadarChart`, `DimensionBenchmarkBars`, `DimensionDrivers`,
`HistorySparkline`, `ROIMetricTile`, `ROISensitivityTornado`,
`EfficiencyWhatIfSlider`, `OpportunityMatrix`, `OpportunityCard`,
`RiskCard`, `ErrorCard`, `SectionNavRail`, `AdvisoryContactModal`).
`components/result/PrintableReport.tsx` confirmed dead code (unused by the
PDF export path, which builds the document programmatically via jsPDF calls
rather than scraping DOM) — left untranslated, same call as skipping
`DiagnosticSummary.tsx` in Phase 1.

## 5 · Open items / possible follow-ups (not blocking)

- The model-generated "Business Operations Analysis" section (`aiAnalysis` /
  `llmResult`) is not translated — that content comes from an upstream LLM
  call outside this flow's control; only the static chrome around it
  (headings, the "generated by..." disclaimer) is localized. Giving the LLM
  a locale hint so it generates Indonesian narrative directly is a separate,
  larger effort (would need the actual LLM prompt/gateway, likely in the
  zeroclaw/vps-bridge stack per `[[zeroclaw-llm-models]]`) and was out of
  scope here.
- Free-text answers (pain points, manual processes, primary objective) are
  never translated by design (Phase 1's rule) — they display exactly as the
  user typed them, in whatever language that was.
- No visual/PDF-layout QA pass was done beyond confirming the PDF generates
  a complete, non-empty blob with no thrown exceptions — a page-by-page
  visual read of a real generated Indonesian PDF (checking the bumped
  pagination budgets actually prevent overflow) would be worth doing before
  a wide rollout, per the plan's original "handled empirically, not
  predicted" pagination approach.
