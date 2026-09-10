# Handoff — Workspace Parity (sesi baru mulai di sini)

Date: 2026-09-10 malam. Rencana induk: Fase 1–4 SELESAI + deploy.
Catatan: file handoff versi pagi (untracked) hilang dalam insiden
penghapusan file 2026-09-10 — dokumen ini rekonstruksi + state terbaru.
JANGAN simpan state penting sebagai file untracked lagi.

## 1. Status terakhir

- Dashboard `main`: kanban `fa0d32f` (deploy live) → edgeless fixes
  `4a3898d`, `5a34eba`, `4d5ae4c`, `4d16d6f` (milik dua sesi paralel, live).
  Cek `git log origin/main --oneline -8` untuk posisi pasti.
- VPS `~/avry-user-dashboard`: PINNED ke SHA eksplisit (detached HEAD —
  `git pull` tidak maju dalam kondisi ini; pakai `fetch + checkout SHA`).
- Produksi: `/dashboard/workspace` 200, `/dashboard/console` 200,
  `/api/*` 401-tanpa-auth = routing benar (dulu 404, lihat §6.0).
  Kontainer: `avry-user-dashboard` Up, `avry-minio` Up,
  `aivory-collab` healthy, `avry-postgres` healthy.
- Root `feat/collab-authz`: gitlink dashboard diurus workstream
  console/collab (mereka bump sendiri) — JANGAN commit gitlink sendiri.
- Worktree DIRTY milik pekerjaan lain — JANGAN reset/clean/checkout:
  root banyak file modified; dashboard ada file console/agents modified
  milik sesi lain. Commit HANYA file sendiri yang eksplisit
  (`git add <path>` — JANGAN `git add -A`: pernah ikut meng-commit
  `docs/WORKSPACE-JOURNAL.md` milik workstream lain).
- Dependensi baru parity: `@aws-sdk/client-s3` saja (cover upload).

## 2. Riwayat commit dashboard (terbaru dulu, ringkas)

- Kanban `fa0d32f`: quick-add per kolom + WIP limit (`props.dbWip`) +
  overdue + persist diff DB.
- `4d16d6f` + `5a34eba` + `4d5ae4c` + `8d97c9a` (paralel, ujung-ujungnya
  koheren): ghost-caret killers — tool-change watcher, selection watcher
  (predikat: skip saat entering-edit), Escape force `editing:false`,
  pre-clear tiap shortcut, `GfxControllerIdentifier` (string key melempar →
  setTool lama no-op diam-diam).
- `4a3898d`: stuck `editing=true` (harness-PROVEN vanilla: Esc tak clear
  flag, klik kosong tak clear, dragStart tolak SEMUA drag = hang).
- `ccf466b`: Yjs merge-on-write + incremental persist + retention 50.
- `00523fa`: persist storm guard + blank-canvas re-attach + caret clear.
- `d630698`: hapus focus-steal dari effect/timer.
- `b954507`: tool-reset hanya saat transisi + contextmenu guard.
- `c224610`: PATCH props atomic (`COALESCE(props,'{}') || patch`).
- Sebelumnya: `0d733f1` minimize panels … (riwayat lama di git log).

## 3. Fakta arsitektur yang sudah dibuktikan (jangan diteliti ulang)

- BlockSuite 0.19.5 (npm latest; tidak ada upgrade). Mindmap/drag/toolbar
  100% upstream; `std.get("GfxController")` STRING MELEMPAR — selalu pakai
  `GfxControllerIdentifier` dari `@blocksuite/block-std/gfx`.
- Stuck `editing=true` mematikan: SEMUA drag (dragStart), SEMUA shortcut
  tool (`_setEdgelessTool` no-op), Space-pan (`_space` no-op), Delete.
  Pemicu: Esc selepas edit note; sembuh: force `selection.set` + clear.
- Ghost caret = stale window Selection range (BlockSuite hanya reset saat
  klik kanvas kosong). Vektor clear: pointerdown kanvas, Esc capture,
  ganti tool, selection → non-editing.
- Keyboard Space jalan via listener `document` — tak butuh focus juggling.
  Focus() dari effect/timer merusak unmount text editor (#9052 family).
- Yjs: diff via state vector (PUT ratusan byte, bukan ratusan KB); server
  pg MERGE union dalam row-lock transaction (REPLACE menelan data:
  PUT comments kecil wipe konten editor + race antar tab). Validasi update
  dulu (korup → 400), cap 20MB, snapshot full-state, retention 50.
- Split-brain pg: dashboard tulis baris bare, collab tulis canonical
  `workspace:*`; baca union. Baris bare bisa dikonsolidasi collab.
- Harness repro: /tmp/edgeless-repro (esbuild bundle + playwright-core +
  Chrome, skenario dblclick→type→Esc→klik). Bisanya dipakai ulang.
- INFRA (§6.0): `/api/*` browser butuh middleware addPrefix → /dashboard.

## 4. Skema pg `dashboard.workspace_docs` (kolom parity)

`mode` (page|edgeless, check), `favorite`, `tags` JSONB, `props` JSONB
(isJournal/isTemplate/pageWidth/edgelessTheme/dbViews/dbTemplates/dbWip),
`created_at`, `icon`, `cover_url`, `deleted_at`. Tabel:
`workspace_doc_links(src,dst)`, `workspace_doc_history` (retention 50).

## 5. File kunci

- `components/workspace/BlockSuitePageEditor.tsx` (ORA BISA disentuh
  dua sesi sekaligus — koordinasi dulu; dua agen tabrakan di file ini
  2026-09-10).
- `components/workspace/WorkspaceDatabase.tsx` (kanban/table/calendar,
  views, drawer, charts, templates, WIP, quick-add).
- `app/workspace/[id]/page.tsx`, API `[id]/route.ts` (PATCH multivarian),
  `meta`, `doc` (merge), `cover`, `history`, `lib/s3.ts`, `lib/db.ts`
  (+`withTransaction`), `lib/workspaceDoc.ts`.
- INFRA: `/home/ubuntu/AVRY-V2-Main/docker-compose.prod.yml` — service
  `avry-user-dashboard` (context symlink frontend/avry-user-dashboard,
  PORT=9001, Traefik labels + api-prefix middleware).
  JANGAN pakai `~/avry-user-dashboard/docker-compose.yml` (port/label salah).

## 6. Temuan & pekerjaan terbuka

0. [SELESAI] SELURUH /api/* 404: router Traefik tanpa addPrefix (komentar
   di compose mendokumentasikan middleware yang tak pernah ada). Fix: 2
   label middleware, recreate (tanpa rebuild). Backup:
   /tmp/docker-compose.prod.yml.bak-api-prefix-20260910.
1. Verifikasi user: toggle Properties, drag, Space→Hand, minimize,
   Add cover, kanban (quick-add/WIP/overdue).
2. Later/Never diputuskan: embeds inline, journal calendar.
   Belum: mobile, i18n/RTL.
3. Sprint-case tracker (workload, dependency) belum dimulai.

## 7. Deploy yang benar

```bash
# VPS dalam detached HEAD: JANGAN git pull. Pin SHA eksplisit:
git -C ~/avry-user-dashboard fetch origin
git -C ~/avry-user-dashboard checkout <SHA-terverifikasi>
# HANYA via prod compose (service avry-user-dashboard):
# - label/config berubah → up -d saja (recreate, tanpa build)
# - kode berubah → build background + poll (SSH bisa timeout — retry,
#   JANGAN rebuild paralel; pastikan HEAD tak pindah mid-build!)
docker compose -f /home/ubuntu/AVRY-V2-Main/docker-compose.prod.yml build avry-user-dashboard
docker compose -f /home/ubuntu/AVRY-V2-Main/docker-compose.prod.yml up -d avry-user-dashboard
# Smoke: curl -skL .../dashboard/workspace + .../dashboard/console → 200,
#   .../api/workspace (tanpa auth) → 401 JSON (BUKAN 404 HTML).
```
