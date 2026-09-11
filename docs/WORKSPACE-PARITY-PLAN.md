# Workspace Parity Plan — rekonstruksi 2026-09-11

> File ini hilang dalam insiden penghapusan untracked 2026-09-10, direkonstruksi dari
> `docs/WORKSPACE-PARITY-HANDOFF.md` + verifikasi baseline. Handoff = state, file ini = rencana.
> Keputusan user 2026-09-11: scope = bugfix + paritas AFFiNE penuh + tracker, **desktop-only
> (mobile = Never)**, keep dashboard `5ce957c`, PLAN direkonstruksi.
>
> > SUPERSEDED 2026-09-11 (sore): user memutus pivot — BlockSuite/AFFiNE canvas
> > DIHAPUS dari user dashboard (editor = `WorkspaceEditor` Yjs simpel + `WorkspaceDatabase`
> > Table/Board/Calendar ala AppFlowy), MinIO DIHAPUS dari VPS/compose
> > (cover upload disabled, `cover_url` lama tetap render). File ini tinggal arsip.

## 0. Baseline terverifikasi (2026-09-11)

- Dashboard `frontend/avry-user-dashboard` HEAD `5ce957c` (board group-by status/assignee/priority).
- `npx tsc --noEmit` → 0 error. `npm test` → 18 file / **299 tests passed**
  (handoff lama tulis 297 — selisih 2 dari commit group-by, baseline baru = 299).
- Dirty yang JANGAN disentuh: `components/workspace/WorkspaceDatabase.tsx` (+9 baris debug
  `__runs`/`[dbg]` milik sesi lain) + gitlink root `38e5138 → 5ce957c-dirty`.
- Aturan: `git add <path>` eksplisit, JANGAN `git add -A`. `BlockSuitePageEditor.tsx`
  koordinasi dulu (pernah tabrakan 2 sesi). Ikuti pola deploy handoff §7
  (build background + poll, smoke, gitlink root oleh workstream pemilik).

## 1. Fakta arsitektur (ringkas — detail di HANDOFF §3)

- BlockSuite 0.19.5; `std.get("GfxController")` string melempar → selalu
  `GfxControllerIdentifier`. Stuck `editing=true` mematikan drag/shortcut/Space/Delete.
- PATCH props atomic di SQL: `COALESCE(props,'{}') || patch` + return merged truth;
  client reconcile ke truth itu (`app/workspace/[id]/page.tsx`).
- Yjs diff via state vector; pg MERGE union dalam row-lock; retention history 50.
- Infra: Traefik addPrefix `/dashboard`, MinIO/S3 cover di `s3.aivory.uk`,
  `dashboard.workspace_docs` kolom parity (`mode/favorite/tags/props/icon/cover_url/...`).

## 2. Bug terbuka → fix

| # | Bug | Akar | Fix | Status |
|---|-----|------|-----|--------|
| 1 | Properties revert | `WorkspaceProperties.toggleProp` kirim full `{...props,[k]:v}` dari meta stale → timpa sibling flags lama | Kirim **delta only** `{[k]:v}`, biarkan `||` merge | Fase 1 |
| 2 | DB panel fire-and-forget | `persistViews/Wip/Templates` tanpa reconcile/error-log | Tambah reconcile ringan ala `patchMeta` | Open |
| 3 | Tags concurrent replace | full-array replace, last-writer-wins | Reconcile/refetch; tabrakan jarang → low | Open |

## 3. Verifikasi user (butuh manusia + browser)

- Network tab: `PATCH /api/workspace/[id]` → catat status + response body (`props` merged).
- Checklist: toggle Properties 2x (tanpa revert), drag object, Space→Hand, minimize
  semua panel + header, Add/Change/Remove cover → objek ada di `s3.aivory.uk`,
  kanban quick-add/WIP/overdue, board group-by.

## 4. Paritas AFFiNE desktop-only (Fase 3, setelah Fase 1–2 hijau)

- Referensi: AFFiNE (BlockSuite-based) untuk embeds inline, journal calendar, i18n/RTL —
  adaptasi pola, BUKAN clone repo. AppFlowy (Flutter/Rust) hanya referensi UX.
- Mobile = Never. Tiap sub-fitur = 1 commit kecil + test. Tanpa refactor besar.

## 5. Sprint-case tracker (Fase 3, setelah paritas stabil)

- Workload + dependency views di atas board group-by yang sudah ada. Belum dimulai.

## 6. Later / Never

- Later: i18n/RTL (desktop), embeds inline penuh. Never: mobile.
