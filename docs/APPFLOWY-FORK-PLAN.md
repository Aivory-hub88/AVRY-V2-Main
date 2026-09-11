# AppFlowy Fork Plan — Project Management, Task Tracker, Kanban, Agent Rooms

> Status: PLANNING (2026-09-11). Belum ada eksekusi kode.
> Konteks: user menilai pendekatan AFFiNE-canvas salah langkah; pivot ke AppFlowy
> (project/task/knowledge first, canvas belakangan). BlockSuite + MinIO sudah
> dihapus dari dashboard & compose (2026-09-11 pagi).
> Kebutuhan audit: project management, task tracker, kanban board,
> collaboration room yang bisa mengundang agent Aivory Cerveau.

## 1. Temuan riset (fakta, bukan opini)

### 1.1. Repo AppFlowy itu BUKAN satu hal — ada 5 pieces

| Piece | Repo | Stack | Status | Relevansi ke Aivory |
|---|---|---|---|---|
| AppFlowy client | `AppFlowy-IO/AppFlowy` | Flutter + Rust, 76.5k★, 7.210 commit | Aktif, open source | Aplikasi desktop/mobile. **Tidak bisa di-embed ke dashboard Next.js.** Fork = toolchain Dart/Flutter terpisah |
| AppFlowy-Collab crate | `AppFlowy-IO/AppFlowy-Collab` | Rust di atas `yrs` | Aktif/maintained | **Data layer paling reusable**: `collab::document/database/folder/user`, importer Markdown/Notion/CSV. Fondasi sama dengan `aivory-collab` (sama-sama `yrs`) |
| AppFlowy-Cloud (open) | `AppFlowy-IO/AppFlowy-Cloud` | Rust + Postgres + Redis + S3 + GoTrue | **LEGACY, tidak lagi di-maintain** — dipindah ke fork komersial closed-source (open-core) | Jangan jadikan basis. Free tier komersial cuma 1 seat + 3 guest |
| AppFlowy-Web | `AppFlowy-IO/AppFlowy-Web` | TS (terpisah dari repo utama) | Aktif, open source | Kandidat embed/iframe, tapi terikat protokol commercial cloud |
| appflowy-editor / appflowy-board | repo terpisah | Flutter widgets | Aktif | Hanya untuk Flutter, tidak untuk web dashboard |

### 1.2. Self-host AppFlowy Cloud butuh infra yang baru saja kita buang

Minimum: 2 vCPU / **4 GB RAM** / 20 GB SSD + Postgres 14 + **Redis** + **S3/MinIO** +
GoTrue auth. Fakta VPS Aivory (ADR-007): pernah ~400 MB free; MinIO baru dihapus
dari compose atas perintah user. **Sidecar full cloud = bertentangan langsung
dengan keputusan infra.**

### 1.3. GERBANG LISENSI — baca sebelum fork baris kode apa pun

**Semua repo AppFlowy = AGPL-3.0.** Konsekuensi untuk Aivory (SaaS proprietary):

- Menjalankan hasil fork yang dimodifikasi sebagai network service **mewajibkan
  publikasi source** dari work tersebut (klausa network AGPL).
- Menyalin kode (bukan sekadar meniru UX/pola) ke service proprietary = service
  itu terkontaminasi AGPL.
- Pola yang aman: (a) hanya tiru pola/UX tanpa copy code = nol risiko;
  (b) service hasil fork dipisah dan source-nya dipublikasikan (AGPL-compliant);
  (c) pakai bagian MIT/Apache saja (hampir tidak ada yang esensial).

**Keputusan lisensi harus diambil di Fase 0 sebelum Fase 4 (crate) / Fase 5 (Flutter).**

### 1.4. Yang sudah dimiliki Aivory hari ini (hasil audit)

Tidak mulai dari nol — sekitar 70% kebutuhan sudah ada:

- **Task tracker**: `WorkspaceDatabase.tsx` — Row `{title,status,priority,assignee,
  due,description,comments}`, views Table/Board/Calendar, WIP limit, group-by
  status/assignee/priority, saved views, row templates, quick-add, overdue,
  row-detail drawer + threaded comments, Yjs `database` array + persist
  incremental + `localStorage` cache.
- **Realtime collab**: `services/collab` (Rust, `yrs 0.17`, y-protocols kompatibel
  yjs 13) — room `workspace:{id}` + `workspace:db:{id}`, WS + HTTP octet-stream,
  flush debounce ke `dashboard.workspace_docs.yjs_update`, viewer read-only
  di-enforce server-side (HTTP 403 + WS drop update).
- **Sharing/RBAC**: `workspaceAccess.ts` (`owner/editor/viewer`), `SharingPanel`
  (invite by email, approve/deny request-access), konsisten dashboard ↔ collab.
- **Agent**: 5 tipe Cerveau (`Geno, Teo, Lex, Finn, Ofira`), `recordWorkspaceActivity`
  sudah dukung `actor_type=agent`, presence awareness sudah bisa label
  `agentType`.
- **Gap presisi** (yang benar-benar belum ada): (1) agent bukan principal ACL;
  (2) `assignee` free-text tanpa picker/validasi; (3) board hanya 1 doc (tanpa
  agregat multi-doc); (4) REST `database` strip `description/comments`, tanpa
  `PATCH row` atomik; (5) tanpa project-level room.

## 2. Opsi fork (dengan rekomendasi)

| Opsi | Isi | Effort | Risiko lisensi | Rekomendasi |
|---|---|---|---|---|
| **A. Full fork Flutter app** | Fork `AppFlowy` utuh → klien desktop/mobile Aivory | XL (toolchain Dart, CI build 3 OS, tim Flutter) | AGPL penuh, wajib publish | ❌ Bukan sekarang. Terpisah dari dashboard, tidak menjawab kebutuhan web |
| **B. Adopsi `AppFlowy-Collab` crate** | Vendor skema `folder/database/document` yrs ke `aivory-collab`; importer CSV/Markdown | M–L (Rust ada di tim: `services/collab` hidup) | AGPL pada service itu → publish source service | ⚠️ Opsional Fase 4, setelah gate lisensi |
| **C. Aivory-native pola-AppFlowy (RECOMMENDED)** | Tiru UX/model data (tanpa copy code): tutup 5 gap di atas dengan komponen yang sudah ada | S–M, bertahap per fase | Nol | ✅ **Eksekusi utama Fase 1–3** |
| D. Sidecar legacy cloud + iframe | Jalankan AppFlowy-Cloud legacy, embed | M + infra berat | AGPL + unmaintained base | ❌ Ditolak (§1.2) |

**Prinsip blocs (AppFlowy) yang kita adopsi di Opsi C tanpa menyalin kode:**
database-view (grid/board/calendar sebagai view dari satu store), field types
(select/date/checkbox), row sebagai unit kolaborasi (comment + assignee +
activity), folder/workspace hierarchy, template gallery, importer.

## 3. Desain integrasi Cerveau (berlaku untuk Opsi B & C)

**Identitas**: agent menjadi principal kelas satu — `agent:{type}`
(`agent:leads_qualifier`, …). Bukan lagi string bebas di `assignee`.

**Enforcement 2 lapis** (sudah polanya, tinggal diajari principal baru):

- Dashboard: `getDocRole()` + `canWrite()` di `lib/workspaceAccess.ts`
  mengenali `workspace_agent_acl(doc_id, agent_type, role, granted_by)`.
- Collab: `resolve_access()` di `services/collab/src/main.rs` mengenali klaim
  agent — autentikasi via `X-Service-Token` + `X-Agent-Type` (trust path ini
  **sudah ada**, `main.rs:399-408`; tinggal tambah lookup ACL, bukan header baru).

**Join worker**: skill Cerveau baru `workspace_collab` (`services/cerveau/skills/`):
`GET /api/workspace/{id}/database` (baca rows) → `POST/PATCH` (tulis sebagai
agent) → WS `wss://aivory.uk/yjs/workspace:db:{doc}` dengan
`?token=COLLAB_SERVICE_TOKEN` + origin `agentType` (sudah dipercaya bila
service token). Activity tercatat `actor_type=agent` (helper sudah ada).

**Presence**: field awareness `user{name,color,agentType}` sudah ada;
`AgentRail.tsx` otomatis menampilkan agent sebagai peer. Tambah badge "agent".

**"My tasks"**: `assignee` jadi picker (email user + nama agent) →
filter `assignee == agent:{type}` = task list per agent.

## 4. Roadmap bertahap

### Fase 0 — Gate keputusan (tanpa kode, 1 sesi)

- [ ] Putuskan lisensi: murni Opsi C (tanpa gate lanjutan) vs C+B (publish source
  `aivory-collab` sebagai repo publik) vs C+B+A (butuh tim Flutter).
- [ ] Putuskan scope agent: 5 prebuilt saja atau boleh custom `agent_type` baru.
- [ ] Output: ADR singkat di `docs/ADR-0xx-appflowy-fork-scope.md`.

### Fase 1 — Agent sebagai warga kelas satu (S–M) ← MULAI DI SINI

> ✅ DIEKSEKUSI 2026-09-11 (Opsi C). Semua item di bawah selesai + hijau:
> `tsc` 0 error, `vitest` 20 file / 307 passed (12 test agents baru),
> `cargo check` bersih. File migrasi `migrations/workspace-agent-acl.sql`
> perlu di-apply ke Postgres (lihat catatan deploy di §8).

1. Migrasi `workspace-agent-acl.sql`: `dashboard.workspace_agent_acl
   (doc_id, agent_type, role editor|viewer, granted_by, created_at)`.
2. `lib/workspaceAccess.ts`: `getDocRole` + 1 helper `getAgentRole`
   mengenali principal agent (kredensial service + `X-Agent-Type`).
3. `services/collab/src/main.rs`: `resolve_access` lookup agent ACL;
   update README (klaim "JWT belum enforce" sudah kadaluwarsa — sekalian betulkan).
4. API: `POST/DELETE /api/workspace/{id}/agents` (invite/revoke, owner-only,
   pola tiru `acl/route.ts`); `SharingPanel` + tab "Agents" (dropdown 5 tipe +
   role viewer/editor).
5. `WorkspaceDatabase.tsx`: `assignee` jadi picker (users + agents);
   filter "assigned to agent X".
6. Skill `services/cerveau/skills/workspace_collab/SKILL.md`: join room, CRUD
   rows via REST, contoh origin + activity.
7. Test: `vitest` invite→agent write→revoke→403; Rust `cargo test` resolve_access.
8. Definisi selesai: agent bisa diundang ke room, menulis task, terlihat di
   presence, aktivitas tercatat sebagai agent.

### Fase 2 — Project room & multi-doc board (M)

> ✅ DIEKSEKUSI 2026-09-11. `tsc` 0 error, `vitest` 329 passed,
> e2e production 11/11 ALL-PASS (project create → rows → WIP 409 →
> aggregate → row PATCH → comments → cleanup). Deploy: dashboard only
> (no Rust changes). F2-1…F2-4 semua di bawah selesai.

1. Konvensi room project: `workspace:room:{projectId}` (atau tipe doc `project`)
   — 1 file konvensi di `lib/workspaceDoc.ts` (`canonicalRoomId` sudah polanya).
2. REST parity: `database/route.ts` baca/tulis **penuh** (`description`,
   `comments` — hari ini lossy) + `PATCH database/{rowId}` atomik
   (status/assignee/due) untuk DnD tanpa Yjs_full-client.
3. Agregat lintas-doc: endpoint `GET /api/workspace/projects/{id}/board`
   (union rows N docs + filter) → Board view project-level di dashboard.
4. WIP di-enforce server (hari ini hanya props + UI).
5. Test: DnD via REST, agregat 3 docs, WIP reject.

### Fase 3 — Paritas database AppFlowy (M, bisa diparalel per sub-fitur)

> ✅ FASE 3a DIEKSEKUSI 2026-09-11: move atomik + row history + CSV import
> + WIP pre-check client. `tsc` 0 error, `vitest` 335 passed,
> e2e production 8/8 ALL-PASS.
> ✅ FASE 3b DIEKSEKUSI 2026-09-11: custom fields (text/number/select/
> multi/checkbox/date/url) — defs di props.dbFields, values di row cells
> (plain-object, Yjs-safe terverifikasi). `tsc` 0 error, `vitest` 342 passed,
> `next build` lokal lolos (menangkap + memperbaiki import server-di-client),
> e2e production 6/6 ALL-PASS. Project board kini mencakup doc project itu
> sendiri bila di-pin sebagai member.

1. Field types: `select` (multi), `checkbox`, `date`, `url` — skema Row
   diperluas dengan migrasi Yjs yang backward-compatible (unknown → text).
2. Template gallery + CSV/Markdown import (referensi algoritma
   `collab::importer`, tulis ulang — bukan copy-paste).
3. Row history (pakai pola `workspace_history` yang sudah ada, per-row).
4. Calendar polish (drag antar hari), board swimlanes lanjutan.

### Fase 4 — (Opsional, butuh gate lisensi) crate `AppFlowy-Collab` (L)

1. Vendor `collab::database/folder` sebagai dep `aivory-collab`;
   compat layer skema Aivory (`database` Y.Array) ↔ skema AppFlowy.
2. Publish source service fork (AGPL-compliant) + catat di README.
3. Tanpa ini pun Fase 1–3 jalan penuh — Fase 4 = akselerator, bukan prasyarat.

### Fase 5 — (Nanti, tim terpisah) klien Flutter (XL)

Fork `AppFlowy` client sebagai app desktop/mobile Aivory, bicara ke API/Collab
yang sama. Repo terpisah, CI Codemagic/GitHub Actions. Tidak dibahas detail
sampai Fase 1–3 hijau.

## 5. Dampak VPS & infra

- Fase 1–3: **nol infra baru** (Postgres + `aivory-collab` yang sudah jalan).
- Fase 4: nol infra (crate di service existing).
- Yang TIDAK dibawa masuk: Redis, GoTrue, MinIO/S3, Postgres 14+ khusus —
  pola AppFlowy yang butuh itu tidak kita adopsi.

## 6. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Kontaminasi AGPL (copy code AppFlowy) | Opsi C = pola saja; Fase 4+ lewat gate + publish source |
| Skema Yjs Aivory vs AppFlowy tidak kompatibel | Compat layer di Fase 4; Fase 1–3 tidak menyentuh format bytes |
| Cerveau worker membanjiri room (PUT storm) | Pakai disiplin persist yang sudah ada (diff + throttle 2s + single in-flight); rate-limit service-token di collab |
| Agent menulis sebagai user (spoof `X-Agent-Type`) | Trust hanya via service-token (sudah di-enforce `main.rs`); dashboard proxy satu-satunya pemegang token |
| Scope creep (kalender gantt, mindmap…) | Mindmap/canvas tetap backlog pasca-Fase 3, sesuai keputusan pivot |

## 8. Catatan deploy (Fase 1)

Migrasi baru harus di-apply sekali ke Postgres produksi + lokal:

```bash
docker exec -i avry-postgres psql -U aivory -d aivory \
  < frontend/avry-user-dashboard/migrations/workspace-agent-acl.sql
```

`CREATE TABLE IF NOT EXISTS` → aman di-run ulang. Setelah itu rebuild +
redeploy `avry-user-dashboard` dan `aivory-collab` (kode Rust berubah).
Tidak ada env baru, tidak ada infra baru.

## 9. Keputusan yang dibutuhkan dari user sekarang

1. Scope: **C saja / C+B / C+B+A** (rekomendasi: C saja dulu).
2. Otorisasi publish source bila suatu hari ambil Fase 4 (ya/nanti saja).
3. Mulai Fase 1 sekarang? (estimasi: migrasi+ACL+UI+skill+test, 3–5 sesi kerja)
