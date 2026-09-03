# Blueprint & Roadmap — Language Dropdown

**Status:** ✅ **SHIPPED to the repo** 2026-08-05 (`9c0c1b2`) and ✅
**DEPLOYED to the live VPS** 2026-08-05, in `avry-user-dashboard` on
`Aivory-hub88` (canonical remote). 🟡 **One item still needs a human
pass**: the dropdown has not been visually confirmed against the live,
logged-in production site — see §6.

**Follow-up round — ✅ SHIPPED + DEPLOYED 2026-08-05** (`23e5b35`,
`8fe576c`, `e4aebf5`): closes §7's "LLM content stays English-only" open
item, plus a batch of real production bugs a user hit and reported
directly against a live-generated Blueprint/Roadmap PDF. See §8–§10.

**Owner:** Irfan · **Source:** product request, 2026-08-05 — extend the same
EN/ID language switcher already shipped for Deep Diagnostic
(`[[deep-diagnostic-indonesian-language]]`) to the Blueprint and
Roadmap pages.
**Scope:** `app/blueprint/page.tsx` + its 6 child components under
`components/blueprint/`, and `app/roadmap/page.tsx`, in `avry-user-dashboard`.
Follow-up round additionally touched `lib/pdfExport.ts`,
`lib/blueprintExport.ts`, `app/api/blueprints/generate/route.ts`,
`app/api/roadmap/generate/route.ts`, `services/deepDiagnostic.ts`,
`app/diagnostics/deep/final-result/page.tsx`.
**Repo:** `Aivory-hub88/avry-user-dashboard`

---

## 1 · Why this exists

Deep Diagnostic already has a language dropdown (see the Indonesian language
planning doc). The ask was to bring the same dropdown to the Blueprint and
Roadmap pages — the two pages a user visits right after Deep Diagnostic in
the product flow.

## 2 · What was already there (discovered before building anything)

Unlike Deep Diagnostic, Blueprint and Roadmap use the **root app layout**,
which renders the sidebar — and the sidebar already includes `LanguagePill`
(an EN/ID segmented toggle), wired to the same `useLocaleContext()` /
`next-intl` system. Deep Diagnostic needed its own on-page dropdown because
its layout (`app/diagnostics/deep/layout.tsx`) deliberately hides the app
sidebar. So the underlying language-switching mechanism was **already
reachable** on Blueprint/Roadmap before this change — confirmed by checking
`app/layout.tsx` and `components/shared/Sidebar.tsx`.

Both pages also already had **partial** next-intl wiring: `useTranslations
("blueprint")` / `useTranslations("roadmap")` calls existed, backed by 42
and 34 keys respectively in `messages/en.json` / `messages/id.json` (with
real, already-translated Indonesian values, not English copies) — but only
16 and 26 `t()` call-sites actually used them, out of ~1456 and ~1208 lines
per page. Most UI chrome was still hardcoded English.

Given this, the actual scope was two things: (1) add the literal `<select>`
dropdown per explicit request, even though `LanguagePill` already worked
here — for visual consistency with the Deep Diagnostic pattern; and (2)
translate the UI chrome that wasn't wired yet.

## 3 · What shipped

- **`<select>` dropdown**, matching Deep Diagnostic's exact pattern
  (`<option value="en">English</option>` / `<option value="id">Bahasa
  Indonesia</option>`, wired to the same `setLocale()`), added to:
  - `app/blueprint/page.tsx` — appears in **all three page states**: empty
    (no blueprint generated yet), corrupted/parse-error, and the full
    rendered blueprint. A shared `languageSwitcher` JSX variable avoids
    repeating the markup three times.
  - `app/roadmap/page.tsx` — appears above the page header, in all states.
  - New CSS: `.languageSwitcherRow` / `.languageSwitcherLabel` /
    `.languageSwitcher` in `blueprint.module.css` (Blueprint uses CSS
    modules); inline `style={{}}` for Roadmap (matches that file's existing
    all-inline-styles convention, no CSS module there).
- **Bug found and fixed while wiring the empty state:** `.emptyContainer`
  in `blueprint.module.css` was a single flex row that centered both axes
  — adding the dropdown as a second child put it in the dead center next
  to the empty-state message instead of the top-right corner. Restructured
  to a flex column (`.emptyContainer` → `.emptyBody` wrapping the actual
  centered content) so the dropdown sits in its own row above.
- **UI chrome translation** (headings, buttons, empty/error states, table
  headers, status badges, tooltips, toasts) via two sequential sweeps
  (Blueprint tree first, then Roadmap — sequential, not parallel, because
  both write to the same `messages/en.json` / `messages/id.json`):
  - `app/blueprint/page.tsx` — ~48 strings, plus 6 child components
    (`BlueprintHeader.tsx` ~19, `ExecutiveSummary.tsx` 5, `WorkflowCard.tsx`
    7, `RiskCard.tsx` 3, `DeploymentCard.tsx` 4; `ArchitectureLayer.tsx`
    needed no changes — purely prop-driven). One real pre-existing bug
    fixed in passing: a workflow-creation success toast was hardcoded
    Indonesian text regardless of the active locale.
  - `app/roadmap/page.tsx` — ~16 strings across 4 in-file helper
    components (`OverallProgressBar`, `RoadmapTimeline`, `MilestoneRow`,
    `KpiCard`), each needing its own `useTranslations("roadmap")` binding
    added.
  - **64 new keys** added to the `blueprint` namespace (+2 to `common`)
    and **18 new keys** to the `roadmap` namespace, in both
    `messages/en.json` and `messages/id.json` — key sets verified
    identical between locales after each sweep.
- **Deliberately left untranslated**, matching the Deep Diagnostic
  precedent (canonical rule: LLM-generated content never translates, only
  chrome does):
  - Blueprint/roadmap content fetched from the backend (`BlueprintV1`
    fields, `AiryRoadmap` phases/milestones/KPIs) — generated by an
    upstream LLM call (roadmap via VPS-bridge `/console/stream`, blueprint
    via `/api/blueprints`), same as Deep Diagnostic's `aiAnalysis`.
  - `BLUEPRINT_INSIGHTS` static sample data — rendered through the same
    fields as live blueprint content, treated identically.
  - `exportRoadmapPdf()`'s jsPDF `doc.text()` calls and the Aivory-assistant
    prefill strings (natural-language LLM prompts, not UI labels).

## 4 · Files touched

`app/blueprint/blueprint.module.css`, `app/blueprint/page.tsx`,
`app/roadmap/page.tsx`, `components/blueprint/BlueprintHeader.tsx`,
`components/blueprint/DeploymentCard.tsx`,
`components/blueprint/ExecutiveSummary.tsx`,
`components/blueprint/RiskCard.tsx`, `components/blueprint/WorkflowCard.tsx`,
`messages/en.json`, `messages/id.json`.

## 5 · Verification

`tsc --noEmit` clean throughout (same 2 pre-existing unrelated errors as the
rest of the repo). Verified live via the local dev server (`user-dashboard`
launch config, port 9000, `/dashboard` basePath, `aivory_auth` localStorage
bypass): toggled EN→ID→EN on both pages in both their empty and non-empty
states, confirmed every string switches correctly and stays in sync with the
sidebar's `LanguagePill`, confirmed the empty-state layout fix visually
(dropdown now top-right, not center), and confirmed no new console errors —
the only errors present (`/api/storage/blueprint` and `/api/storage/roadmap`
500s) are pre-existing local-dev artefacts from no local Postgres connection,
unrelated to this change (falls back to localStorage correctly).

## 6 · Deploy to the live VPS — ✅ DONE 2026-08-05

Same target as the Deep Diagnostic Indonesian deploy: `tencent-vps`
(129.226.155.216), live checkout `/home/ubuntu/avry-user-dashboard`,
compose project `/home/ubuntu/AVRY-V2-Main/docker-compose.prod.yml`.

- Checked the live checkout first: `git status` clean, `main` at `bfd94f4`,
  no new uncommitted VPS-local work (the payment/invoicing WIP stashed
  during the Deep Diagnostic Phase 1/2 deploy was still sitting untouched
  on `stash@{0}` on a different branch — not a blocker for `main`).
- `git fetch` + `git pull --ff-only origin main` → clean fast-forward
  `bfd94f4..9c0c1b2`, exactly the 16 files from this commit, no
  divergence.
- `docker compose -f docker-compose.prod.yml up -d --build --no-deps
  avry-user-dashboard` — build succeeded (`next build` compiled clean,
  same 54-route manifest as before), container recreated and started
  ("Ready in 0ms" in logs, no errors).
- `curl` confirmed both `https://aivory.id/dashboard/blueprint` and
  `/roadmap` return 200.

**Not verified:** the actual dropdown rendering behind login. Navigating
there in a browser correctly redirects to the login page (proving the
route/build is healthy) but the agent has no production credentials and,
per its own operating rules, will not enter a password or fabricate a
production auth session — the exact same constraint as Deep Diagnostic's
§6.5. **This is the one remaining step before calling this feature's
rollout fully closed**: log in on `https://aivory.id/dashboard`, open
Blueprint and Roadmap, confirm the "Language" dropdown appears top-right
in every state (empty, error, and full) and switches correctly, and that
it stays in sync with the sidebar's `LanguagePill`.

## 7 · Open items (original round)

- §6's live logged-in verification (not blocking the deploy itself, but
  blocking calling the feature done) — **still open**, see §10.
- ~~LLM-generated blueprint/roadmap content stays English-only regardless of
  the dropdown~~ — **closed 2026-08-05**, see §8.4. Turned out to need no
  VPS-side/cross-repo change at all — the prompts are assembled entirely in
  this repo's own API routes.

## 8 · Follow-up round — bug fixes + LLM content locale (2026-08-05)

Triggered by the user attaching a real generated Blueprint PDF
(`Aivory-Blueprint-Acme-Draft-05 August 2026.pdf`) and reporting two things:
garbled/overlapping text, and no Indonesian output despite the dropdown
being live. Investigation (and, later, a real Roadmap PDF + live screenshots
of the Roadmap page) surfaced several distinct bugs, listed here by commit.

### 8.1 · `23e5b35` — PDF page-break overflow + Blueprint data fidelity

- **Root cause of the reported overlap**: `renderNarrative()` in
  `lib/pdfExport.ts` measured wrapped text and drew it but never checked
  remaining page space first (unlike its sibling `bullet()`, which measured
  first). The Decision Engine paragraph on the System Architecture page
  landed after two variable-length bullet lists, silently overflowed past
  the page boundary, and got drawn through the footer stamp.
  **Fix**: `renderNarrative()` now takes an optional `checkPage` callback
  (the caller's local page-break helper) and measures-then-checks *before*
  drawing. `checkPage` itself was changed to return the (possibly-reset) `y`,
  since it mutates the caller's closure variable, not `renderNarrative`'s own
  parameter — the two have to be explicitly resynced. Applied to every
  `renderNarrative()` call site in `lib/blueprintExport.ts`.
- **Adjacent bug found while fixing it**: the Blueprint PDF's Strategic
  Objective and Decision Engine paragraphs were 100% hardcoded static text —
  not derived from `strategic_objective.primary_goal` /
  `system_architecture.decision_engine`, even though those are real fields
  the LLM generates and the **DOCX** exporter already used correctly. Every
  Blueprint PDF ever exported showed the identical "$14,296 / 62.5% / 361
  hours" figures and even named a non-existent product
  ("Aivory High Intelligence Deterministic Engine" — a name the generation
  prompt explicitly forbids inventing) regardless of the actual company.
  Fixed to prefer the real field, generic fallback only if absent.
- Same issue found in the **Workflow Modules intro** (hardcoded to name
  exactly "Automated Reporting" / "CS Ticket Automation" / "Process
  Automation" and claim "three modules" regardless of what was actually
  generated) — now derives the count/order framing dynamically from
  `workflow_modules.length`.
- **Risk Assessment section was entirely missing real data in the PDF** —
  it rendered one fixed presumptuous paragraph ("your organisation's strong,
  aligned leadership... no critical risks have been flagged") instead of the
  actual `risk_assessment.data_risks`/`operational_risks`/
  `mitigation_strategies` arrays, which the DOCX exporter already listed
  correctly. PDF now mirrors DOCX.
- **Locale support added** to `exportBlueprintPDF`/`exportBlueprintDOCX`
  (new `locale: 'en' | 'id'` param) and `renderAivoryNote` in
  `lib/pdfExport.ts` (new `locale` param) — every section heading and
  boilerplate paragraph now has an EN/ID pair via a local `tr(en, id)`
  helper, following the inline-ternary convention already used for Deep
  Diagnostic. `app/blueprint/page.tsx`'s two export call sites now pass the
  active `locale`.

### 8.2 · `23e5b35` (same commit) — Blueprint/Roadmap generation, Indonesian LLM content

Confirmed via SSH that `vps-bridge`'s `/blueprint/generate` /
`handleStreamRequest` (`server.js:900`) forwards the `messages` payload to
Zeroclaw **verbatim** — the actual prompt text is assembled entirely in
`app/api/blueprints/generate/route.ts` and `app/api/roadmap/generate/route.ts`
in this repo, so **no vps-bridge/cross-repo change was needed** to close
§7's open item (contrary to the original assumption in §7).

- `services/deepDiagnostic.ts`'s `generateBlueprint()` gained a `locale`
  param, included in the POST body; call site is
  `app/diagnostics/deep/final-result/page.tsx` (locale already in scope
  there via `useLocaleContext()`).
- `app/api/blueprints/generate/route.ts` and `app/api/roadmap/generate/route.ts`
  now read `locale` from the request body and, when `'id'`, append an
  instruction block telling the LLM to write every freeform narrative field
  VALUE in formal Bahasa Indonesia, while explicitly listing which fixed
  schema keys/enum literals (`workflow_id`, `steps[].type`, `status`, phase/
  milestone/KPI `id` slugs) must stay untranslated.
- **Scoping decision, deliberate**: content is generated once, in whichever
  locale is active *at generation time* — not dual-generated/cached like
  Deep Diagnostic's `opportunitiesId`/`risksId`/etc. fields. Those work
  cheaply because they're deterministic TS-computed templates run twice, not
  real LLM calls; doing the same here would mean 2× LLM cost/latency per
  generation and a bigger storage/versioning change. If a user switches the
  locale dropdown *after* generating, only chrome re-translates — the
  generated body stays in its original language until regenerated. Flagged
  as a possible future enhancement, not built.

### 8.3 · `8fe576c` — Roadmap PDF: wrong branding, company-name bug, English fallback

Found by the user attaching a real downloaded `AI_Roadmap_2026-08-05.pdf`
that had gone through the AI-generation-failed fallback path:

- **Cover branding wrong concept**: title said "AI Implementation Roadmap"
  (`app/roadmap/page.tsx`'s `exportRoadmapPdf`) instead of matching the
  product's actual name used everywhere else ("Transformation Roadmap" /
  "Roadmap Transformasi") — changed to match Blueprint's
  `"Transformation\nBlueprint"` pattern.
- **Real bug, not just branding**: `roadmap.title` — a generic string like
  `"Transformation Roadmap"`, never the company name — was being passed as
  the cover's `company:` field *and* used in the Aivory-note greeting
  (`` `Dear ${roadmap.title},` ``), so the exported PDF literally read
  **"Dear Transformation Roadmap,"**. `exportRoadmapPdf` gained a
  `companyName` param; the call site now reads the real company name from
  `localStorage.getItem('aivory_blueprint')?.organization?.name` (the linked
  blueprint), matching how `blueprintExport.ts` already sources it.
- **The actual content the user saw was 100% English regardless of
  locale**, because their generation call had fallen back to
  `buildFallbackRoadmap()` in `app/api/roadmap/generate/route.ts` — a fully
  hardcoded object with no locale awareness at all (milestone titles, KPI
  labels, phase names/descriptions). `buildFallbackRoadmap()` and
  `deriveFallbackKpiTargets()` now take `locale` and produce Indonesian
  copy when active.
- PDF filename changed from `AI_Roadmap_{date}.pdf` to
  `Aivory-Roadmap-{company}-{date}.pdf` for consistency with Blueprint's
  `Aivory-Blueprint-{company}-{version}-{date}.pdf`.

### 8.4 · `e4aebf5` — Roadmap on-screen text colour + AI-centric copy

From live screenshots of the actual Roadmap page (not the PDF):

- **Text colour bug**: `T.textSub`/`T.textMuted` in `app/roadmap/page.tsx`
  were hardcoded to `#dddac5` (a warm cream hex) rather than any variant of
  the page's actual white (`T.text = #f0ede9`), so phase-description body
  copy read as visibly yellow-tinted next to real white — confirmed by
  directly sampling pixel colours from a user screenshot (swatch comparison,
  not a monitor/colour-filter illusion). Changed to
  `rgba(240,237,233,0.72)` — same hue family as `T.text`, just dimmed via
  opacity, so there's no colour-family mismatch.
- **Copy still framed as "AI Implementation" rather than "Business
  Operations Transformation"**: the fallback `PHASE_DESCRIPTIONS` (shared
  between on-screen display and the PDF export) opened Phase 1 with "prove
  AI works in your environment" and closed it with "AI delivers results",
  and one sentence in Phase 3 said "incorporating AI tools into their daily
  workflow". Reframed all three (EN + ID) around the *transformation* as the
  subject, with AI/automation positioned as the mechanism, not the
  headline — matches the "ops-transformation reframe" already applied to
  Deep Diagnostic (`[[deep-diagnostic-fx-and-report-fixes]]`).

## 9 · Files touched (follow-up round)

`lib/pdfExport.ts`, `lib/blueprintExport.ts`, `app/blueprint/page.tsx`,
`app/roadmap/page.tsx`, `app/api/blueprints/generate/route.ts`,
`app/api/roadmap/generate/route.ts`, `services/deepDiagnostic.ts`,
`app/diagnostics/deep/final-result/page.tsx`.

## 10 · Verification (follow-up round)

- `tsc --noEmit` clean after each commit (same 2 pre-existing unrelated
  errors as before).
- **Blueprint PDF**: captured the real generated PDF blob client-side
  (patched `URL.createObjectURL` in the running local dev app, base64'd the
  blob, decoded and opened it as an actual PDF) rather than trusting code
  review alone. Confirmed in both `en` and `id`: cover/note/chrome
  translate correctly, `primary_goal`/`decision_engine` render from real
  data, Risk Assessment shows real bullets, and — stress-tested with an
  artificially long Decision Engine paragraph — the page-break fix actually
  triggers and the paragraph cleanly starts a fresh page instead of
  overlapping the footer.
- **Roadmap PDF + on-screen page**: same blob-capture technique for the
  PDF; live `id`-locale screenshots plus a full-DOM computed-style scan
  (`getComputedStyle` over every element, checking `color`/`background-
  color`/`border-color` for a yellow-ish match) to confirm the `textSub`
  fix actually landed (`rgba(240, 237, 233, 0.72)` computed on the live
  page) — chosen over relying on visual comparison alone.
- **Deploy**: same VPS target/process as §6, once per commit — `git pull
  --ff-only` (clean fast-forward each time, only the intended files), then
  `docker compose up -d --build --no-deps avry-user-dashboard`, then
  `curl` confirming `/dashboard/blueprint` and `/dashboard/roadmap` both
  return 200.
- **Still open, carried over from §7**: the live logged-in visual pass on
  `https://aivory.id/dashboard` — everything above was verified via the
  local dev server against synthetic data, not the production auth session
  (same constraint as §6, unchanged).
