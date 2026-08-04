# Deep Diagnostic — Bahasa Indonesia Language Support

**Status:** Phase 1 (Intake flow — dropdown + translated questions) —
✅ **SHIPPED** 2026-08-04, committed locally as `84dfd62` in
`avry-user-dashboard` (not pushed yet). Phase 2 (Results page + PDF report)
**not started — next priority**.
**Owner:** Irfan · **Source:** product request, 2026-08-04 — parity with the
free assessment landing page, which already ships a bilingual EN/ID
experience.
**Scope:** the Deep Diagnostic ("Business Operation" assessment) intake flow
in `avry-user-dashboard` — question phases, options, and the review/summary
page. Explicitly **not** the results page (`final-result/page.tsx`) or the
generated PDF report narrative — those are Phase 2.
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

## 4 · Next priority — Phase 2: Results page + PDF report in Indonesian

**Objective:** when a user completes the assessment in Indonesian, the
results page (`app/diagnostics/deep/final-result/page.tsx`) and the
exported PDF (`lib/pdfExport.ts`) should also render in Indonesian, closing
the gap the user originally asked for ("dokumen dalam bahasa Indonesia").

**Why this is materially harder than Phase 1** (confirmed by direct code
read, not estimated): `lib/readinessNarrative.ts` (~611 lines) *composes*
narrative sentences from template literals with interpolated computed
values and lookup tables (`DIM_LABELS`, `MATURITY_BANDS`,
`RISK_SOURCE_LABELS`, `buildVerdictNarrative`, `buildExecutiveSummary`,
`buildExecutiveInsight`, `buildFirstMoves`, `buildWhyThisRecommendation`,
`buildEvidenceUsed`, `buildConfidenceReasoning`, `DIM_CONSEQUENCE_CHAINS`,
etc.) — this is not a flat string dictionary like
`deepDiagnosticQuestionsId.ts`, so each function needs a genuine Indonesian
rewrite of its prose, not a find-and-replace. `lib/pdfExport.ts`
(~2793 lines) has ~113 hardcoded English label/copy strings with no locale
parameter at all today. `final-result/page.tsx` has ~55 inline JSX text
strings.

**To-do**

- [ ] **4.1 Locale-parameterize `lib/readinessNarrative.ts`.** Every
      builder function needs an Indonesian counterpart for its template
      literal(s) and lookup tables, selected by a `locale` parameter — same
      pattern the free assessment's `assessmentCopy.ts` already proved out
      with its `narrative: Record<id, (args) => string>` function-table
      shape (`frontend-nextjs/src/lib/assessmentCopy.ts:33-116`), just
      applied to a larger, more numerous set of builders.
- [ ] **4.2 Thread `locale` through `lib/pdfExport.ts`.** Follows the
      precedent already shipping in `frontend-nextjs/src/lib/assessmentPdf.ts`
      (`buildAssessmentPdf(input: { strings, labels, locale, ... })` — all
      copy pre-resolved by the caller, no locale branching inside the PDF
      builder itself). The ~113 hardcoded label strings need to move into a
      similar per-locale copy object.
- [ ] **4.3 Translate `final-result/page.tsx`'s ~55 inline JSX strings**,
      reusing `useLocaleContext()` the same way Phase 1's pages do.
- [ ] **4.4 Decide the emailed-report question explicitly** (if Deep
      Diagnostic reports are ever emailed/stored server-side, unlike the
      free assessment which explicitly keeps the emailed copy English-only
      per `FREE-ASSESSMENT-QUESTION-REWORK-PLANNING.md:104-106` — confirm
      whether the same non-goal applies here before building).
- [ ] **4.5 Verify old stored `DiagnosticContext` rows** (pre-Phase-2,
      Postgres-stored) still render correctly when a user views them with
      the dropdown set to Indonesian — the underlying computed data has no
      locale field, so the narrative layer must not assume one exists.

**Exit gate:** a full run — intake → summary → results page → PDF export —
completed entirely in Bahasa Indonesia reads as a coherent Indonesian
report, with zero numbers or scoring outcomes changed by the language
selection (same Architecture Principle as
`DEEP-DIAGNOSTIC-EXPERIENCE-V2-PLANNING.md`: the LLM/narrative layer
composes, it never computes).
