# Deep Diagnostic — Bahasa Indonesia Language Support

**Status:** Phase 1 (Intake flow), Phase 2 (Results page + PDF report), and
Phase 3 (PDF QA pass + bug fixes) — ✅ **ALL SHIPPED to the repo AND
DEPLOYED to the live VPS**, Phase 1+2 on 2026-08-05, Phase 3 also on
2026-08-05 (deployed same day as shipped — see §8). Phase 1 pushed as
`84dfd62`, Phase 2 pushed as `bfd94f4`, Phase 3 pushed as `9c0c1b2`, all in
`avry-user-dashboard` on `Aivory-hub88` (canonical remote), all three now
running in production. The full assessment — intake, review, results page,
and the downloadable PDF — now renders end to end in Bahasa Indonesia **in
the codebase and in production** at `https://aivory.id/dashboard`. 🟡 **One
item still needs a human pass**: the logged-in, end-to-end Indonesian flow
check (dropdown → intake → summary → results → PDF download) against the
**live production site** has still not been done by either the agent or
Irfan — see §6.5 and §8 for why, and do this before calling the rollout
fully closed. Phase 3's QA (§8) was done against a real downloaded report
and a locally-regenerated PDF, which is strong evidence but is not the same
as a live-site check.
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

## 6 · Deploy to the live VPS — ✅ DONE 2026-08-05

**Executed on `tencent-vps` (129.226.155.216), live checkout
`/home/ubuntu/avry-user-dashboard` symlinked from
`/home/ubuntu/AVRY-V2-Main/frontend/avry-user-dashboard`, compose project
`/home/ubuntu/AVRY-V2-Main/docker-compose.prod.yml`.**

- [x] **6.1 Located the live checkout and checked its state.** It was
      **not** on `main` — branch was `feat/diagnostic-report-upgrades`, and
      it turned out to be **106 commits behind** `Aivory-hub88/avry-user-dashboard`'s
      `main` (not the handful expected), including `84dfd62` + `bfd94f4`.
      This is the same drift pattern `[[dashboard-local-vps-divergence]]`
      warned about, worse than any prior known instance.
- [x] **6.2 Found and preserved real uncommitted VPS-local work before
      touching anything** — this is the part worth remembering. 14 modified
      + 3 untracked files (~3,865 lines), all with the *same* mtime
      (31 Jul 23:47:39–42, a ~3s window — a bulk file-copy signature, not
      organic edits), turned out to be an **entire uncommitted
      payment/invoicing feature** (`CreditPackGrid.tsx`, `InvoiceModal.tsx`,
      `lib/invoicePdf.ts`, plus edits across `usePayment.ts`,
      `paymentHandler.ts`, `subscriptionPlans.ts`, the wallet/quota/
      subscriptions pages, `WalletSettings.tsx`, `SettingsModal.tsx`) that
      existed **only** on that VPS disk — no branch, no stash, no other
      copy anywhere. One of those files, `app/diagnostics/deep/final-result/page.tsx`,
      directly overlapped with the incoming Phase 2 commit (2,179 local
      diff lines vs. 511 incoming diff lines on the same file) — a real
      merge conflict, not a theoretical one.
      - Ran `git stash push -u -m 'pre-indonesian-deploy WIP payment/invoicing
        2026-08-05'` — **this WIP is now safely preserved as `stash@{0}`** on
        the `feat/diagnostic-report-upgrades` branch in that checkout. It has
        not been reconciled, rebased onto `main`, or committed anywhere —
        that's a separate, unscoped task if/when someone picks the
        payment/invoicing feature back up. See §7 for the follow-up doc.
      - Hit a second, unrelated blocker while stashing: the entire `hooks/`
        directory and a handful of root config files (`.env.example`,
        `next.config.ts`, `package.json`, `package-lock.json`,
        `vitest.config.ts`) were **owned by a foreign UID (`197612:197121`,
        not `ubuntu`, not resolvable to a real user)** — git couldn't
        unlink/rewrite them. Root cause unconfirmed (likely an old
        rsync/tar-extract that preserved a non-local UID) but fixed with
        `sudo chown -R ubuntu:ubuntu /home/ubuntu/avry-user-dashboard`. Worth
        a spot-check if other VPS checkouts hit mysterious "permission
        denied" on git operations.
- [x] **6.3 Fetch + fast-forward merge**, after the working tree was clean:
      `git checkout main && git reset --hard HEAD && git pull --ff-only
      origin main` → clean fast-forward to `bfd94f4`, 276 files changed. This
      brought in far more than Phase 1/2 — the other 103 commits were
      unrelated, previously-unshipped work (agent feature, workflow
      versioning/fixtures, exchange-rate live rates, etc. — now documented
      separately, see §7). Confirmed before rebuilding:
      - New required env vars (`DATABASE_URL`, `JWT_SECRET`,
        `N8N_CREDENTIALS_ENCRYPTION_KEY`, added to `.env.example` in this
        range) were **already present** in `/home/ubuntu/AVRY-V2-Main/.env`
        and already wired into the `avry-user-dashboard` service block in
        `docker-compose.prod.yml` — this gap was closed in an earlier session
        per `[[workflow-copilot-three-followups]]` and held this time (no
        regression).
      - The 4 new SQL files under `migrations/` (`dashboard-storage.sql`,
        `dashboard-n8n-credentials.sql`, `dashboard-workflow-fixtures.sql`,
        `dashboard-workflow-versions.sql`) collectively define 8 tables —
        all 8 **already existed** in `avry-postgres`'s `dashboard` schema
        (confirmed via `\dt dashboard.*`). No migration needed to be run.
- [x] **6.4 Rebuilt + restarted only the user-dashboard container** —
      `docker compose -f docker-compose.prod.yml up -d --build --no-deps
      avry-user-dashboard`. Build succeeded, container recreated and
      started; `avry-admin-dashboards` was untouched.
- [x] **6.6 Confirmed the running container is the new build** — `docker
      inspect` shows `State.StartedAt` matching the rebuild time; `docker
      logs --since 2m` after restart shows zero errors/exceptions.
      `https://aivory.id/dashboard` serves the login page correctly
      (title, form, no console/server errors beyond pre-existing CSP
      warnings for third-party analytics scripts, unrelated to this
      change).
- [ ] **6.5 NOT completed — needs Irfan, not the agent.** The full
      logged-in Indonesian flow (dropdown on intake + results, a real
      intake → summary → results run in Bahasa Indonesia, PDF download)
      was **not** verified against the live production site. The agent has
      no production login credentials and, per its own operating rules,
      will not enter a password or fabricate/bypass a production auth
      session to get one — that's a hard line, not a missing tool. **This
      is the one remaining step before the rollout can be called done.**
      While doing it, also do the visual PDF QA pass flagged as open in §5
      (page-by-page read of a real Indonesian PDF, checking the bumped
      `ensureSpace()` pagination budgets actually prevent overflow) — it
      was never done and is the highest-risk untested part of this whole
      feature.

**Exit gate — partially met:** the deployed commit is confirmed to be
`bfd94f4` and running cleanly with no regressions detected at the
infrastructure level. The functional exit gate (Indonesian dropdown +
full assessment + PDF verified live, no English-path regression) is
**still open**, pending §6.5.

## 7 · Unrelated features that rode along in this deploy

The 106-commit gap between the VPS's stale branch and `main` meant this
deploy shipped **~103 commits of previously-unreleased work** that has
nothing to do with Indonesian language support — most notably a new agent
feature and workflow version/fixture history. Those are documented
separately so they don't get lost inside a language-support planning doc:

- [`AGENT-FEATURE-OVERVIEW.md`](AGENT-FEATURE-OVERVIEW.md)
- [`WORKFLOW-VERSIONING-AND-FIXTURES-OVERVIEW.md`](WORKFLOW-VERSIONING-AND-FIXTURES-OVERVIEW.md)

Also now live but out of scope for any doc yet: `lib/liveRates.ts` +
`app/api/exchange-rates/route.ts` (live FX rates — may already be covered by
`[[deep-diagnostic-fx-and-report-fixes]]`, worth cross-checking) and the
uncommitted payment/invoicing WIP stashed in §6.2 above (not deployed, not
documented — still needs its owner to reconcile it).

## 8 · Phase 3 — PDF QA pass and bug fixes (2026-08-05, `9c0c1b2`)

**Trigger:** Irfan uploaded a real Indonesian Deep Diagnostic PDF (company
"Acme", downloaded from the live/local flow) and asked for it to be checked
before an unrelated commit (the Blueprint/Roadmap language dropdown, see
`[[blueprint-roadmap-language-dropdown]]`) went out. This is the visual
PDF QA pass flagged as an open item in §5 and never completed — reading a
real generated document (not just `tsc`) is what surfaced these; none were
visible from the code alone.

**4 issues found, all fixed:**

1. **Mislabeled ROI headline.** The "ROI 3 Tahun" tile showed the *gross*
   `threeYearROIPercent` (37.2% in the reviewed report) but was captioned
   "bersih setelah investasi" / "net of investment". The "Kisaran ROI 3
   Tahun" scenario range just below it correctly uses the *net*
   `netThreeYearROIPercent` (which nets out the annual ongoing-cost
   assumption `ONGOING_COST_RATE = 0.20`) — so its "Dasar" cell showed a
   wildly different, often negative number with no explanation, reading as
   a broken/contradictory financial case. **Fix:** relabelled the headline
   caption to `'sebelum biaya operasional berjalan'` / `'before ongoing
   operating costs'` (accurate — it *is* net of the initial investment,
   just not of ongoing run costs) and added an explanatory sentence under
   the scenario range clarifying the two figures differ on purpose. The
   actual headline number was **not** changed — it already matched the
   narrative sentence and the Methodology formula row, so changing it
   would have introduced a *new* inconsistency rather than fixing one.
   This bug is present in the English PDF too (same code path, `locale ===
   'en'` branch had the equivalent "net of investment" caption) — fixed in
   both locales. Files: `lib/pdfExport.ts`.
2. **Overlapping text in the Methodology table.** Row 1's description,
   `"Kapasitas tim yang dipulihkan per tahun"` (40 chars — longer than any
   English equivalent), was drawn with a bare `pdf.text()` call with no
   width constraint, unlike the adjacent result column which already used
   `splitTextToSize`. It ran straight into the result column instead of
   wrapping, visibly garbling that row in the reviewed PDF. **Fix:** apply
   `splitTextToSize` to the description column too (48mm budget), and take
   `Math.max()` of both columns' wrapped line counts when advancing `y`.
   Files: `lib/pdfExport.ts`.
3. **FX-rate date in the wrong locale.** `getFxAsOfLabel()`
   (`lib/liveRates.ts`) hardcoded `toLocaleDateString('en-GB', ...)` for
   the "live" FX branch regardless of report locale — the reviewed PDF
   showed "Kurs per 05 Aug 2026 (live)" (English month) right next to a
   cover page correctly showing "05 Agustus 2026". Fixed by adding a
   `locale` param to `getFxAsOfLabel()` and a parallel `fxAsOfId` field on
   `ROIProjection` (`types/diagnostic.ts`), computed once at calculation
   time alongside the existing `fxAsOf` — same absence-safe,
   compute-both-locales-once convention as `opportunitiesId?` /
   `scoreDriversId?` from Phase 2. Both the PDF and the on-screen
   `final-result/page.tsx` now read `fxAsOfId` when `locale === 'id'`.
   **Caveat:** only exercised via code inspection + the regeneration test
   below, which had no live FX cache locally (fell back to the static
   `FX_AS_OF` snapshot string, a different code path) — the `id-ID` branch
   itself wasn't rendered and screenshotted. Same date-locale pattern is
   already proven correct elsewhere in the same file (the cover date), so
   confidence is high, but this is the one fix in this batch that wasn't
   directly eyeballed.
4. **Mixed-language "Analisis Operasional Bisnis" section.** By design
   (§5), the model-generated narrative (`aiAnalysis`/`llmResult`) is not
   translated — but seeing it in a real document made clear that
   translated sub-headings (KEKUATAN, KENDALA UTAMA, ...) sitting directly
   above untranslated English paragraphs reads as broken, not as a known
   limitation. **Fix:** added one line to the existing disclaimer note (in
   both the PDF and `final-result/page.tsx`, shown only when
   `locale === 'id'`) stating this section is still English-only. Does not
   change what content renders, just sets expectations. Files:
   `lib/pdfExport.ts`, `app/diagnostics/deep/final-result/page.tsx` (+
   `final-result.module.css` for the new `.aiLanguageNote` class).

**Verification:** `tsc --noEmit` clean (same 2 pre-existing unrelated
errors as before). Regenerated a full PDF from the real code path — not a
mock — via a throwaway `vitest` test that called `calculateROI()` +
`exportReportToPdf()` directly with a synthetic `DiagnosticContext` close
to the reviewed report's numbers, monkey-patching `jsPDF`'s instance
`.save()` (a subclass via `vi.mock('jspdf', ...)`, since it's assigned as
an own-property in the constructor and shadows a prototype patch) to dump
bytes to disk instead of attempting a browser download. Confirmed
directly in the regenerated PDF: fixes 1, 2, and 4 all render correctly
(no overlap, correct label, disclaimer present, no new pagination
overflow). Fix 3 confirmed by code + pattern-matching only, per the caveat
above. Font-loading and a couple of glyph artefacts in the regenerated PDF
(missing → and − glyphs, one missing inter-word space) are Helvetica-
fallback artefacts from running headless in Node without network access to
fetch the embedded Manrope font — not present in the real
browser-generated PDF that triggered this review, and not related to any
of the 4 fixes.

**Deployed to the VPS — ✅ DONE 2026-08-05, same day as shipped.** Same
target/procedure as §6: checked the live checkout first (`main` clean at
`bfd94f4`, no new uncommitted VPS-local work; the payment/invoicing WIP
stashed during the Phase 1/2 deploy was still sitting untouched on a
different branch, not a blocker), `git pull --ff-only` → clean fast-forward
`bfd94f4..9c0c1b2`, then `docker compose ... up -d --build --no-deps
avry-user-dashboard` — build succeeded, container recreated and started
with no errors. `curl` confirmed `/dashboard/blueprint` and `/dashboard/roadmap`
both return 200 (this commit also carries the Blueprint/Roadmap dropdown
feature, see `[[blueprint-roadmap-language-dropdown]]`).

**Not done / still open:**
- §6.5's live-site logged-in verification is still open, now covering
  Phase 3 too — the deploy above confirms the infrastructure (build,
  container, routing) is healthy, but nobody has confirmed the actual
  rendered output (correct ROI caption, no table overlap, correct FX date,
  AI-section disclaimer) against the live, logged-in production site. Phase
  3's own QA (this section) used an already-downloaded PDF and a local
  regeneration, not the production site.
- The maturity-scale labels "Baru Mulai" and "Memulai" (Nascent/Initiating)
  read as near-synonyms in Indonesian — noted during review, not fixed
  (lower priority, not selected in scope for this pass).
- Minor style notes not acted on: "pendarahan modal" (capital bleed) and
  "waktu ke nilai" (time to value) read as stiff literal translations; the
  cover letter body says "Business Operations Assessment" in English while
  the cover page title is translated — a small naming inconsistency.
