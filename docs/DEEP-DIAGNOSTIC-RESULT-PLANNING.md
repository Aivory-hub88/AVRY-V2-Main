# Deep Diagnostic Result — Page Parity & Postgres Storage Plan

**Status:** ALL PHASES DONE & DEPLOYED 2026-07-19 (Phase 1 `fbf5723`, Phase 2+3 `12fc039` + lock-regen `1828b01`). D1–D3 = doc proposals; D4 = Deep Diagnostic is signed-in-only (one-time service, no anonymous tier) — localStorage kept as cache/offline fallback + migrate-up.
**Follow-on work:** the report is being reframed from "AI Readiness" to "Business Operations Transformation" (CMO guidance 2026-07-20) plus a method/result-page enhancement roadmap — execution brief at `docs/OPS-TRANSFORMATION-NARRATIVE-BRIEF.md` (self-contained, written for a fresh LLM session). Section names used throughout THIS doc ("Readiness Verdict", "AI Analysis", …) will be renamed by that work. A further explainability/cross-dimension-intelligence pass on top of both (Explainability Layer, Relationship Engine, LLM Narrative Composer, dynamic Dependency Graph) is planned at `docs/DEEP-DIAGNOSTIC-EXPERIENCE-V2-PLANNING.md` (2026-08-04, not started). · **Owner:** Irfan · **Created:** 2026-07-19
**Repo:** `Aivory-hub88/avry-user-dashboard` (deploy: VPS checkout `/home/ubuntu/avry-user-dashboard`, container `avry-user-dashboard`)
**Prereq reading:** the 2026-07-19 report-fix batch (commits `8ae902a`, `cee195a`) — PDF now has Readiness Verdict + AI Analysis, opportunity healing, ROI parity, consistent gap numbers.

---

## TL;DR (Bahasa Indonesia)

Dua pekerjaan lanjutan setelah perbaikan report PDF:

1. **Fase 1 — Paritas halaman result** (kecil, low-risk, 1 deploy): tambah section
   **Readiness Verdict** di halaman result (sekarang hanya ada di PDF), humanize
   label sumber risiko di RiskCard (`budget_allocated` → "Budget allocation").
2. **Fase 2 — Storage Postgres untuk data report** (menengah, menyentuh auth + DB
   produksi): hari ini SEMUA data report Deep Diagnostic (context, hasil LLM,
   blueprint, roadmap) hanya hidup di **localStorage browser pengunjung** — ganti
   device/clear cache = report hilang. Rencana: route `/api/storage` di dashboard →
   `avry-postgres`, dikunci **per user login** (bukan `demo_org`/nama company).
   Ada WIP untracked di repo lokal yang jadi titik awal, tapi auth + keying +
   pola init-nya harus dirombak.
3. **Fase 3 — Cleanup**: buang kode Supabase mati.

Kerjakan berurutan; tiap fase punya exit gate. Fase 1 bisa langsung; Fase 2 butuh
keputusan di bagian "Open decisions" dulu.

---

## Verified current state (audited live 2026-07-19)

- Platform storage **is** Postgres on the VPS (`avry-postgres`, db/user `aivory`,
  schemas `identity`/`billing`/`product`/`cerveau`/…). Supabase is fully retired.
- **But the dashboard's report data never reaches it.** Verified on the live
  container: no `/api/storage` route in the deployed build, no `DATABASE_URL`/
  `SUPABASE_*` env, `lib/supabaseStorage.ts` still calls the Supabase client
  (env-less → `isMisconfigured=true` → every remote save/load short-circuits) →
  **localStorage is the only real store** for DiagnosticContext, LLM result,
  blueprint, roadmap.
- `product.diagnostics` exists but has **0 rows** and a free-diagnostic shape
  (score/category/insights) — it is NOT the report context store. The bridge
  (`/home/ubuntu/AVRY/vps-bridge`, port 3003) has a PG shim (`lib/db.js`) for
  run-level persistence only.
- Latent bug (currently dormant): `final-result` loads via
  `loadDiagnosticContext('demo_org')` but saves under the **company name** —
  mismatched keys. Harmless while remote storage is dead; data-corrupting the
  moment a backend comes alive. Must die in Phase 2.
- **Untracked WIP exists in the local monorepo checkout** (`frontend/avry-user-dashboard`):
  `lib/db.ts` (pg Pool + `initDb()` on import) and `app/api/storage/[entity]/route.ts`
  (GET/POST for `diagnostic|blueprint|roadmap|context`, keyed by `organization_id`
  query param, **no auth**). Never committed/deployed; `pg` is not in package.json
  (it breaks local `npm run build` until moved aside). Use as a starting point only.
- Networking: `avry-user-dashboard` and `avry-postgres` share the
  `aivory-network` docker network → `postgresql://…@avry-postgres:5432/aivory`
  is reachable. Reuse the same POSTGRES credentials the other services get via
  compose env — do NOT hardcode credentials or commit them.

---

## Phase 1 — Result-page parity with the new PDF

Goal: what the client sees on screen matches the narrative quality of the PDF.

### To-do

- [x] **1.1 Extract shared verdict/narrative constants out of `lib/pdfExport.ts`**
      into a new `lib/readinessNarrative.ts`: `MATURITY_BANDS`,
      `DIM_CONSTRAINT_NOTES`, `RISK_SOURCE_LABELS` + `humanizeRiskSource()`,
      `fmtGap()`. PDF and page must share ONE source of truth (no copy-paste —
      that is how the 32.5%/33%/38% divergence happened the first time).
- [x] **1.2 Add "Readiness Verdict" section to
      `app/diagnostics/deep/final-result/page.tsx`** between Executive Scorecard
      and AI Analysis: same band sentence (score, band range, practical meaning,
      weakest-dimension constraint, strongest foundation) + the three
      "first moves" rows (fix the foundation / prove value fast / size the
      budget-or-secure the mandate). Use `displayScores` (blended) exactly like
      the PDF receives.
- [x] **1.3 RiskCard humanize**: `components/result/RiskCard.tsx:26` renders
      `Source: {risk.source}` raw → `Signal: {humanizeRiskSource(risk.source)}`.
- [x] **1.4 (optional cosmetic)** Top-pain-points bullet split in Diagnostic
      Context handles numbered lists only; also split on commas when no numbering.
- [x] **1.5 Verify + deploy**: `tsc` filter on touched files → `npm run build`
      (move untracked `lib/db.ts` + `app/api/storage/` aside first, restore after)
      → regenerate the two harness PDFs (must be byte-equivalent narratives —
      refactor 1.1 must not change PDF output) → commit+push fork `main` → VPS
      ff-merge + `docker compose -f docker-compose.prod.yml up -d --build
      --no-deps avry-user-dashboard` → verify new strings in served chunks +
      page 200 + visual check of the section.

**Exit gate:** page shows the verdict with numbers identical to the PDF for the
same context; risk sources humanized; PDF output unchanged.

---

## Phase 2 — Postgres-backed report storage (per user)

Goal: a client's Deep Diagnostic report (context + LLM result + blueprint +
roadmap) survives browser/device changes and is keyed to their login, not to a
shared demo key or a collision-prone company name.

### Open decisions (settle BEFORE coding)

- [x] **D1 — Keying.** Proposal: primary key `user_id` (from the signed-in
      user's JWT — the dashboard already gates on login via `aivory_auth` /
      `aivory_access_token` cookie), one latest row per user per entity
      (upsert). History can come later via an append table.
- [x] **D2 — Where the tables live.** Proposal: new schema `dashboard`
      (`dashboard.diagnostic_contexts`, `.diagnostic_results`, `.blueprints`,
      `.roadmaps`) to avoid colliding with `product.diagnostics` (free
      diagnostic) and with the WIP's unqualified public-schema tables.
- [x] **D3 — Migration execution.** Proposal: a checked-in `migrations/dashboard-storage.sql`
      applied once via `docker exec avry-postgres psql` at deploy time. Do NOT
      keep the WIP's `initDb()`-on-module-import (runs CREATE TABLE on every
      cold start, races, and hides failures).
- [x] **D4 — Anonymous/pre-login runs.** The diagnostic wizard itself may be
      usable before login: keep localStorage as the always-on write-through
      cache; server sync only when a user id is present. Confirm product intent.

### To-do

- [x] **2.1 Dependency + db helper**: add `pg` (+`@types/pg`) to package.json;
      rewrite `lib/db.ts` — Pool from `DATABASE_URL` via the existing
      `lib/requireEnv.ts` pattern (**no fallback credentials** — the WIP's
      `postgres:postgres@localhost` default must go), export `query()`. Route
      files that import it must declare `export const runtime = 'nodejs'`.
- [x] **2.2 Migration SQL** per D2/D3, committed to the repo.
- [x] **2.3 API route** `app/api/storage/[entity]/route.ts` (rework the WIP):
      entities `context|diagnostic|blueprint|roadmap`; **auth required** — read
      the `aivory_access_token` cookie, verify JWT (same secret/pattern as the
      existing authed routes, see `lib/jwt.ts` / backend `deps.py` conventions),
      derive `user_id` from the token, **never** from query params or body;
      parameterized queries only; GET returns latest row or null; POST upserts.
      Note: Next 16 dynamic APIs — `params` is a Promise in route handlers
      (the WIP's signature is outdated and fails the current validator).
- [x] **2.4 Client storage module**: replace `lib/supabaseStorage.ts` with
      `lib/reportStorage.ts` — same four save/load pairs, calling
      `/dashboard/api/storage/...` (mind the basePath! use the `asset()`/config
      helper pattern, this is the recurring 404 class), localStorage
      write-through kept as cache + offline fallback. First authed load with an
      empty server row + a non-empty localStorage context = migrate up (POST).
- [x] **2.5 Call-site sweep**: `final-result` (kill `'demo_org'`), `summary`
      (buildDiagnosticContext fire-and-forget save), `blueprint` page
      (`generateBlueprint(diagnosticId, 'demo_org', …)` — switch to user id),
      roadmap page, `DeepDiagnosticService.saveResult/loadResult`.
- [x] **2.6 Compose wiring**: add `DATABASE_URL` (runtime env, NOT build arg) to
      the `avry-user-dashboard` service in `docker-compose.prod.yml` on the VPS,
      pointing at `avry-postgres:5432/aivory` with the shared credentials.
      Remember: that compose file is VPS-local (not in a pushed repo) — apply the
      edit on the VPS and note it in memory/docs.
- [x] **2.7 Verification**:
      - node harness: call the route handlers' query layer against a throwaway
        schema, or curl the deployed API with a real login token:
        POST context → GET returns it → GET as another user returns null.
      - E2E: run a diagnostic logged-in in browser A, open final-result in
        browser B (same account) → report loads from Postgres.
      - Negative: unauthenticated GET/POST → 401; cross-user access → 404/null.
      - `psql` row check in `dashboard.*` tables.
- [x] **2.8 Deploy** (same flow as Phase 1.5) + commit compose note.

**Exit gate:** report data round-trips through Postgres per user; unauthenticated
and cross-user access impossible; localStorage still works as offline fallback;
no `demo_org` string left in storage call sites.

---

## Phase 3 — Cleanup

- [x] **3.1** Delete `lib/supabaseClient.ts` + `lib/supabaseStorage.ts`, drop
      `@supabase/supabase-js` from package.json, sweep for remaining imports
      (`services/deepDiagnostic.ts` imports `isMisconfigured`, `summary` page
      dynamic-imports supabaseStorage, etc.).
- [x] **3.2** (lib/db.ts + app/api/storage now real committed implementations; untracked lib/requireEnv.ts left as-is — orphaned but not in this plan's WIP list) Remove the stale local untracked WIP files once superseded by the
      committed implementation (they currently break local `npm run build`).
- [x] **3.3** Update memory/docs: `deep-diagnostic-fx-and-report-fixes`,
      `new-vps-key-storage-supabase` (storage now truly PG end-to-end),
      `dashboard-local-vps-divergence` (compose env addition).

---

## Risks & gotchas (learned the hard way on this VPS)

1. **Uncommitted VPS edits get silently reverted** (observed 4+ times — fonts,
   healthcheck, HalftoneWave). Every fix lands as commit+push in the SAME action.
   The compose `DATABASE_URL` edit is VPS-local by design — document it
   immediately since it cannot be pushed.
2. **basePath `/dashboard`** — every client `fetch()` to the new storage route
   must be prefixed or it 404s in prod while working in dev (recurring bug class).
3. **`pg` in Next**: node runtime only; keep the pool a module singleton;
   `connectionTimeoutMillis` low so a PG outage degrades to localStorage instead
   of hanging the result page (storage failures must never block rendering —
   same "best-effort" contract the Supabase layer had).
4. **Traefik routes by Host header** — container-level curl needs
   `-H 'Host: www.aivory.id'` against `localhost:9001`; bare-IP 404 is by design.
5. **Do not blanket-adopt the WIP**: no auth, org-id from query params,
   CREATE-TABLE-on-import, outdated Next params signature, default credentials —
   each of those is individually disqualifying for pre-launch production.
6. Local `npm run build` currently requires moving the untracked WIP aside
   (until Phase 2 lands `pg` properly).

## Effort estimate

- Phase 1: ~1 short session (code is mostly extraction + one new section), 1 deploy.
- Phase 2: ~1 focused session incl. decisions, migration, E2E verification, 1–2 deploys.
- Phase 3: <30 min inside the Phase 2 deploy window or right after.
