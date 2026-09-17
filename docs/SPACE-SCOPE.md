# Team Space — Scope (ruang kerja bersama manusia + agent)

**Date:** 2026-09-17
**Status:** Draft — menunggu persetujuan sebelum eksekusi
**Related:** [SPACE-PRD](./SPACE-PRD.md) · [SPACE-TRD](./SPACE-TRD.md) · [SPACE-PLAN](./SPACE-PLAN.md)
**Wireframe:** `docs/space/wireframe.html` (klik-able, sudah selaras gaya dashboard + console)

---

## 1. Latar (satu paragraf)

Mission Control di AI Console menjawab "apa yang dikerjakan semua agent *saya*" — single-player.
Workspace hari ini menjawab "dokumen *saya*" — Notion-like per-doc (Write/Data/Board).
Yang belum ada: **ruang tim** tempat manusia dan agent kerja bareng di satu tempat —
diskusi, file, dan eksekusi dalam satu layar. Dokumen ini mengunci scope-nya supaya
eksekusi tidak melebar.

Inspirasi pola (bukan fork): Rowboat/Harbor — Space = channel + file folder,
`@mention` agent sebagai member, atribusi "Nama (via Agent)", activity sebagai query.
Hasil research kode Rowboat + `aivory-collab` + jalur Python tercatat di TRD §0.

## 2. Goal (satu kalimat)

1 Team Space = 1 project = **stream diskusi + kumpulan docs + 1 board + member
(manusia + agent)**, dengan killer flow **roadmap → project** yang mengisi
board otomatis dari hasil generate.

> Istilah (dikunci 2026-09-17): produk = **Team Space**. **Cerveau** = nama engine
> agentic Aivory (fork zeroclaw yang dimodifikasi) — infrastruktur, bukan yang di-mention.
> Yang di-mention adalah agent: **Lex** (`leads_qualifier`), **Geno** (`autonomous`),
> **Finn** (`finance_invoice_ops`), **Aira** (`chief_of_staff`), **Teo** (`customer_service`),
> **Ofira** (`office_assistant`) — sesuai `agentRoster.generated.ts` / `agent_roster.py`.
> Jadi user menulis `@Geno`, `@Finn`, `@Teo` — tidak pernah `@cerveau`.

## 3. In scope (dikunci — di luar ini = change request)

| # | Item | Keterangan |
|---|------|------------|
| S1 | Mode Discussion di Space view | Stream root messages lintas-doc; Write/Data/Board yang sudah ada **tidak disentuh** |
| S2 | Thread + topic annotation | Reply flat ke root; topic = judul goal + archived + attach doc (1 thread max 1 topic) |
| S3 | Mention `@Lex`/`@Geno`/`@Finn`/`@Aira`/`@Teo`/`@Ofira` + `@here`/`@nama` + referensi `#doc` | Token per-agent langsung (tanpa router), stamp server-side, code block = kutipan |
| S4 | Kartu agent di thread (Approve/Deny) + receipt `👀/✅/❗` | Bahasa NotificationCard console; Approve sage `#b7cba6` |
| S5 | Activity inbox "What's new for me" lintas Space | Query saat dibaca (mention > here > DM > reply), bukan fan-out table |
| S6 | Import roadmap → project | Tiap wave jadi member doc, tiap deliverable jadi task row; lineage di props; buka Board |
| S7 | Presence manusia + `agent_working` | Via awareness channel Rust yang sudah ada |

## 4. Out of scope

**Never (fase ini):**
- Whiteboard kolaboratif (relay ephemeral + snapshot blob — mahal, jarang kepake di flow roadmap → eksekusi)
- Ganti Yjs CRDT dengan merge engine lain — `yrs` di `aivory-collab` tetap otoritas realtime
- Fork/self-host Harbor/Rowboat sebagai service baru — **nol service baru**, prinsip ADR-008/CERVEAU-WORKING-OFFICE
- Mobile layout penuh — tablet = drawer, mobile = tab bawah, cukup
- A2A wire protocol (lihat ADR-008 Phase 5 — hanya on real trigger)

**Later (dicatat, tidak dikerjakan):**
- Polls/voting, DM antar member, blob store S3, per-space mute/DND
- MCP door publik penuh (TRD hanya menyiapkan subset internal 8–10 tools)
- Synthesis agent khusus (ADR-008: caller synthesizes = the feature, di skala ini)

## 5. Constraints (non-negotiable)

1. **RBAC existing tidak dilemahkan:** owner/editor/viewer + `workspace_agent_acl` + closed-by-default tetap; agent hanya via grant.
2. **Tidak ada identitas "bot" terpisah:** agent bertindak *sebagai* member (`actingMode` + `agentName` = cara, bukan siapa).
3. **Gaya UI = kombinasi existing:** chrome workspace (pill, badge role, ungu AI) + bahasa kartu console (NotificationCard, Bar, sage Approve). Token di `styles/globals.css` @theme. Tidak ada warna/border/radius baru.
4. **Aturan tag:** teks hanya `span`/`div`, tidak pernah `p`/`h1-h6` (global prose style menimpa — bug Phase 10, sudah dua kali kejadian).
5. **Rust content-blind:** `aivory-collab` cek membership saja; stamping/ranking milik Next.js/Python.
6. **Privasi agent:** privat → shared hanya sebagai ringkasan; tidak pernah paste email/chat mentah ke Space.

## 6. Success criteria (diukur saat exit tiap fase, lihat PLAN)

- Tenant bisa buka Space, kirim root, reply di thread, title thread jadi Discussion di rail.
- `@Geno` (atau agent lain) di thread → kartu task → Approve → tulis tercatat dengan reason + atribusi.
- Import roadmap → project terisi (N docs + M tasks) → Board langsung penuh.
- `npx tsc --noEmit` 0 error; `npm test` hijau (baseline = jumlah file/tests saat mulai, dicatat di PLAN).
- Tidak ada regresi Write/Data/Board (smoke: buka doc, edit, board move).

## 7. Open decisions (harus dijawab sebelum/saat eksekusi, pemilik: user)

| # | Keputusan | Opsi | Rekomendasi |
|---|-----------|------|-------------|
| D1 | Nama produk untuk Space vs Project | "Space" baru / "Project" existing | ✅ DIPUTUSKAN 2026-09-17: **Team Space** |
| D2 | `@cerveau` router atau agent spesifik? | Satu fixed address → router / per-agent | ✅ DIPUTUSKAN 2026-09-17: **per-agent langsung** (`@Lex`, `@Geno`, `@Finn`, `@Aira`, `@Teo`, `@Ofira`); Cerveau = nama engine, bukan alamat mention. Tanpa router. |
| D3 | Thread storage: Yjs room sama vs tabel Postgres | Room sama (co-locate) / tabel Postgres | ✅ DIPUTUSKAN 2026-09-17: **tabel Postgres** (thread = workload DB: append/query/paginate/redact, bukan CRDT). Yjs tetap khusus isi doc. `page-comments` existing tidak dimigrasi. |
| D4 | Lokasi wireframe final | `/tmp` vs repo | ✅ DIPUTUSKAN 2026-09-17: **`docs/space/wireframe.html`** (sudah dipindahkan 2026-09-17). |
