# Team Space — PRD (Product Requirements Document)

**Date:** 2026-09-17
**Status:** Draft — menunggu persetujuan
**Related:** [SPACE-SCOPE](./SPACE-SCOPE.md) · [SPACE-TRD](./SPACE-TRD.md) · [SPACE-PLAN](./SPACE-PLAN.md)

---

## 1. Problem

1. Mission Control (`components/office/MissionControl.tsx`) menjawab "apa yang dikerjakan
   semua agent **saya**" — single-player, per-agent view.
2. Workspace (`app/workspace/`) menjawab "dokumen **saya**" — per-doc view
   (Write/Data/Board), komen per-page (`WorkspacePageComments.tsx`).
3. Tidak ada layar yang menjawab "**apa yang dikerjakan tim saya + agent**, di mana
   diskusinya, di mana hasilnya" — eksekusi roadmap berhenti di `/roadmap` (baca saja),
   tidak mengalir ke tempat kerja tim.

## 2. Users

| User | Job-to-be-done |
|------|----------------|
| Owner tim (Sarah) | Putuskan hal lintas-doc ("launch cut Jumat?"), lihat semua status tanpa buka 10 doc |
| Member tim (John) | Dapat mention yang jelas, kerjakan task, reply di thread yang benar |
| Agent (Lex, Geno, Finn, Aira, Teo, Ofira — di atas engine Cerveau) | Terima tugas via mention langsung, laporkan progres, minta approval sebelum tulis irreversible |
| Viewer/stakeholder | Baca tanpa bisa merusak (read-only + banner existing) |

## 3. Requirements

### F1 — Space view: Discussion sebagai mode ke-4 (P0)

- Di `/workspace/[id]` untuk doc bertipe project (`props.isProject`), tab bertambah:
  `Discussion | Write | Data | Board` — pola pill existing (`bg-white/[0.04]`, aktif `bg-white text-black`).
- Discussion = stream **root messages** Space, bukan komen 1 doc. Avatar 32px, nama 13px,
  timestamp 11px, body 13px/1.6, reaksi di bawah, reply summary inline ("4 replies · terakhir John 2 mnt").
- Klik reply/thread → panel kanan terbuka, **stream kiri tetap di tempat** (tidak replace).
- Rail kiri (`WorkspaceNavigator` berevolusi): Spaces/projects → Discussions → Files → Members.
- Write/Data/Board tidak berubah satu piksel pun (acceptance: diff visual nol).

### F2 — Thread + Discussion/Topic (P0)

- Reply selalu flat menempel ke **root id** (tidak ada reply-of-reply).
- "Title thread" → topic row: judul = goal ("Decide: launch cut", bukan ringkasan),
  max 1 topic per thread, `archived` flag, `attach_doc` (UI buka doc di samping thread).
- Archive = hilang dari rail; **reply baru menghidupkan lagi** (un-archive + event).
- "Convert back to thread" (hapus topic) tidak menghapus satu pesan pun.

### F3 — Mention + referensi (P0)

- Ketik `@` → picker manusia + agent (Lex, Geno, Finn, Aira, Teo, Ofira) + `@here`;
  ketik `#` → picker doc.
- `@nama-agent/@nama-orang/@here` = address (notify); `#doc` = referensi (buka doc, notify **nol**).
- Token di dalam code block = kutipan, bukan sapaan. Bare `@word` = prose, mencapai **nol** orang.
- Label chip di-resolve ulang dari roster saat render (bukan di-parse dari nama).

### F4 — Agent bekerja di thread (P0)

- `@Geno <perintah>` (atau agent lain) di composer/thread → receipt `👀 picked it up`
  di pesan pemicu (reaksi, bukan chat baru) + kartu task di panel Agent (status Running →
  Idle ala MissionControl: putih/60 → putih/35, count badge `bg-amber/15`).
- Hasil kembali dua bentuk: **message** (jawaban/teks) sebagai reply, atau **artifact**
  (file edit/doc baru/task rows) dengan `reason` terlihat ("why" commit-style).
- Tulis irreversible → kartu approval bahasa NotificationCard: kartu netral, glyph ⚠
  `#FF9F0A` + badge `Approval`, actions di balik hairline divider — **Approve sage
  `#b7cba6`/teks `#1a1a18`** (konvensi rail console), Deny sekunder.
- Atribusi: pesan agent berkepala nama agent-nya ("Geno" + pill `agent`;
  `agent_type` + `actingMode` tercatat di data). Tidak ada akun bot terpisah; Cerveau
  disebut hanya sebagai kredit engine bila perlu ("ditenagai Cerveau").
- Privasi: ringkasan saja yang menyeberang ke shared; email/chat mentah tidak pernah dipaste.

### F5 — Activity inbox (P1)

- Bell naik jadi "What's new for me" lintas Space, urutan: mention > here > DM > reply.
- Baris = NotificationCard per tone (mention biru info `#0A84FF`, selesai hijau,
  pin/warn oranye): title 13.5 semibold + subtitle 12.5 + timestamp tabular 11px.
- "Mark all read" eksplisit — clear badge + semua device. Activity = query saat dibaca,
  bukan tabel fan-out (konsisten dengan keputusan Harbor yang ditiru).

### F6 — Import roadmap → project (P0 killer flow)

- Tombol di Board project / halaman roadmap: "Import dari Roadmap → jadi Project".
- Tiap **wave → 1 member doc** (masuk `projectDocs`), tiap **deliverable → 1 task row**
  (Todo, priority/assignee terbawa bila ada), lineage `roadmap_id/wave_id` di props.
- Selesai → `router.push(/workspace/[id]?view=board)` — board langsung penuh, tiap wave
  sudah punya thread-nya (F2) untuk didiskusikan + `@Lex`/`@Geno`/agent lain untuk dieksekusi.

### F7 — Presence (P1)

- Avatar stack di topbar + presence dot di member list: viewing (hijau), typing (kuning),
  `agent_working` (ungu, denyut). Chip "<Agent> working…" (mis. "Geno working…") → lompat ke tab Agent (ada Stop).

## 4. Non-functional

| Aspek | Syarat |
|-------|--------|
| Perf | Stream window 50 default, cap 200; board aggregate cap existing (20 docs × 200 rows) tidak naik |
| AuthZ | Semua baca/tulis lewat gate existing (`getDocRole`, `checkAgentAccess`, collab `resolve_access`); service tanpa `X-Agent-Type` = legacy, dengan agent = scoped |
| Realtime | Rust broadcast + awareness yang ada; reconnect = replay dari offset/state terakhir |
| A11y | Message action reachable keyboard (aturan Rowboat #4 yang diadopsi); tombol ≥ 32px |
| i18n | ID default, EN fallback (mengikuti `WorkspaceAIPanel` prompt rule) |

## 5. Acceptance criteria (ringkas — detail per fase di PLAN)

1. Buka project → tab Discussion ada; Write/Data/Board identik (screenshot diff).
2. Kirim root → muncul di stream; reply di kanan; stream kiri tidak reload/reset scroll.
3. Title thread → muncul di rail Discussions; archive → hilang; reply → muncul lagi.
4. `@Geno` → receipt 👀 → kartu task Running → Approve → tulis terjadi + atribusi + reason; Deny → tidak ada tulis.
5. Import roadmap fixture (3 waves/11 deliverables) → 1 project + 3 docs + 11 rows + Board penuh.
6. Viewer: composer disabled + banner existing; agent tidak bisa diberi tugas tulis.
7. `tsc` 0 error, `npm test` hijau, smoke VPS 200.

## 6. Metrics (pasca-launch, 30 hari)

- % roadmap yang di-import jadi project; median waktu roadmap → board penuh.
- % thread yang melibatkan agent; median waktu mention → receipt 👀; approval approve/deny rate.
- DAU Space view vs doc view; regresi nol pada penggunaan Write/Data/Board.

## 7. Rollout

Beta di 1 workspace internal (dogfood) → flag per-workspace → default on untuk project baru.
Rollback = sembunyikan tab Discussion (1 flag), data thread/topic tidak dihapus.
