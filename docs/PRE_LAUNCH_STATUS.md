# Status Pre-Launch & Langkah Berikutnya

Tanggal: 2026-07-27
Cakupan: `frontend/avry-user-dashboard`, `vps-bridge`, zeroclaw runtime, n8n stack
Ledger visual: https://claude.ai/code/artifact/91458645-0c39-42c0-92f7-732d2af3572f

---

## 1. Sudah selesai & terverifikasi di produksi

Semua item di bawah sudah live di VPS dan diverifikasi dengan bukti (bukan sekadar "container jalan").

### Deep Diagnostic — laporan & angka

| Item | Commit | Bukti |
|---|---|---|
| Angka IDR membengkak 15.600× di halaman result | `9986eff` | Page & PDF kini identik `IDR 151.483.274` |
| Skor page ≠ PDF (49 vs 58) | `9986eff` | PDF menerima skor blended yang sama |
| Narasi PDF hardcoded & kontradiktif | `9986eff` | Kini data-driven dari jawaban asli |
| ROI narasi null ("payback in 0.0 years") | `9986eff` | Di-guard; tile Payback tak lagi mengklaim palsu |
| Layout PDF mepet / menabrak footer | `9986eff` | Risk register page-break by measured height |
| Kurs statis 15.600 (basi ~15%) | `9986eff` | Route `/api/exchange-rates` live, refresh 2 jam |

**Gotcha permanen:** `formatCurrency()` **mengonversi** (input harus USD); `formatLocalAmount()` hanya memformat. Salah pilih = pembengkakan 15.600× lagi.

### Kebersihan produksi

| Item | Commit |
|---|---|
| URL produksi menunjuk `localhost:9000` (logout & Contact Us mati bagi user nyata) | `29998cc` |
| Fallback akun bersama `GrandMasterRCH` di wallet | `603e69e` |
| Submodule pin monorepo ketinggalan 9–10 commit | `897fcc6` |

### Isolasi tenant (keamanan)

Runtime agent menyimpan **setiap** percakapan ke satu namespace bersama lalu menyuntikkannya ke percakapan baru — request dengan session id unik membalas pertanyaan orang lain dan membocorkan nama credential serta nama workflow. Untuk produk multi-tenant ini kegagalan isolasi, bukan kuirk UX.

- `auto_hydrate = false` + `auto_save = false`. Aman karena continuity Copilot berasal dari `history` yang dikirim dashboard, bukan memory runtime.
- 85 baris di-purge (backup terverifikasi dulu), DB 3.5 MB → 1.3 MB.
- Sweep filesystem menemukan **3 store legacy lain** berisi 183 baris percakapan Mei → diarsipkan, lalu dihapus.
- Re-sweep: 20 database, **nol** baris percakapan kecuali backup rollback yang disengaja.

### Workflow Copilot & deploy

| Item | Commit |
|---|---|
| MCP native n8n tersambung ke runtime (28 tools) | config zeroclaw |
| `tools-registry.js` mengirim daftar tool palsu ke SEMUA request workflow | live patch |
| Approval gate menolak otomatis tanpa approver | config zeroclaw |
| Deploy menolak URL yang wajar di-paste user (404) | `1b7d058` |
| Deploy superadmin satu klik ke n8n Aivory | `91ffd22` |
| Opsi superadmin bisa dimunculkan user biasa via localStorage | `af49287` |
| Opsi hilang senyap setelah token 60 menit kedaluwarsa | `feec099` |
| `JWT_SECRET`/`DATABASE_URL`/encryption key hilang dari compose (semua fitur DB mati) | fix di VPS |

### Terkonfirmasi hidup (bukan kode mati)

`n8n-as-code` **adalah** mesin sandbox-test sungguhan: konfirmasi workflow → bikin sandbox di n8n → strip credential → eksekusi nyata → lapor per node → hapus. `inspectionReport.source = "n8n_mcp"`, jadi resolusi node deterministik via MCP **sudah** bekerja.

---

## 2. Sengaja dibatalkan

**Mengajari LLM memanggil tool MCP sebelum menulis JSON** — 3 percobaan, tiga mode kegagalan berbeda (bertanya balik, menghabiskan anggaran tool lalu bercerita, atau berhenti terlibat). Penyebabnya struktural: "panggil tool dan bernalar" itu multi-turn agentic, "keluarkan satu objek JSON" itu single-shot. Prompt dikembalikan ke versi sehat dan diverifikasi. Analisis lengkap: [`MCP_TOOL_USE_DESIGN.md`](./MCP_TOOL_USE_DESIGN.md).

---

## 3. Langkah berikutnya

### P0 — sebelum launch

**3.1 Sesi kedaluwarsa memutus fitur secara senyap (paling berdampak)**
Access token hidup 60 menit, tapi gate klien hanya memeriksa token *ada*, bukan masih valid. Akibatnya UI tetap tampak login sementara **setiap route server yang memverifikasi JWT** menolak. Saat ini hanya jalur deploy yang pulih sendiri (lewat `authedFetch`).

- Adopsi `authedFetch` (`lib/deployAuth.ts`) di seluruh pemanggilan API dashboard, **atau** buat gate klien memvalidasi klaim `exp` dan refresh proaktif.
- Audit route mana saja yang saat ini gagal senyap setelah 1 jam.
- Kenapa P0: ini menyentuh fitur berbayar (version history, credentials, fixtures, diagnostic history), bukan cuma tool internal.

**3.2 `docker-compose.prod.yml` belum git-tracked**
Env var kritikal hilang dari file ini **dua kali** (25 Jul, lalu 26 Jul), mematikan semua fitur berbasis DB tanpa suara. File watcher IDE di VPS adalah tersangka utama.

- Masukkan ke git (atau minimal snapshot + pemeriksaan berkala).
- Tambahkan health check yang gagal keras kalau env wajib tidak ada, alih-alih 500 per-route.

**3.3 Verifikasi SHA setelah deploy**
`git pull` bisa **abort** karena kerja belum di-commit di VPS, sementara rangkaian `build && up -d` tetap melaporkan "Built / Started" — deploy tampak sukses padahal mengirim commit lama. Sudah kejadian sekali sesi ini.

- Jadikan `git log --oneline -1` (bandingkan dengan yang diharapkan) langkah wajib pasca-deploy.
- File yang tak boleh disentuh di VPS: `app/layout.tsx`, `components/shared/Sidebar.tsx`, `lib/auth.ts`, `lib/moduleAccess.ts`, `components/routing/demo-route-guard.tsx`.

### P1 — segera setelah launch

**3.4 Pindahkan verifikasi node lebih awal** — desain lengkap di [`MCP_TOOL_USE_DESIGN.md`](./MCP_TOOL_USE_DESIGN.md) §3. LLM tetap generate seperti sekarang, lalu bridge memverifikasi dengan **satu** panggilan batch dan melampirkan tipe node n8n yang benar. Biaya tetap, bisa di-unit-test tanpa LLM, gagal-aman. Logikanya sudah ada di `prepareWorkflowDraft` — sebaiknya diekstrak jadi fungsi bersama, bukan ditulis dua kali.

**3.5 Hapus backup rollback** — `~/.zeroclaw/data/memory/brain.db.pre-purge-20260726-233344` adalah satu-satunya file di server yang masih memuat data percakapan. Disengaja sebagai jendela rollback; hapus setelah yakin.

**3.6 Bersihkan kode mati** — `vps-bridge/endpoints.js:824` punya default basi `N8N_AS_CODE_URL || 'http://localhost:3004'` (port salah, nama env beda). Tidak aktif (file tak di-`require`), tapi menyesatkan saat dibaca.

### P2 — pasca-launch

**3.7 Routing agent Copilot** — webhook runtime **tidak punya** pemilihan agent per-request; semua trafik jalan sebagai agent pertama secara alfabet, jadi tools/model/risk-profile `workflow_brain` belum pernah berlaku di produksi. Mekanisme yang **terbukti bekerja**: daemon kedua dengan config-dir terisolasi berisi satu agent. Belum di-deploy karena menambah service + beban sinkronisasi config menjelang launch.

**3.8 Tool use LLM-driven** — butuh prasyarat berurutan: perbaiki routing agent → model lebih kuat (`deepseek-v4-flash` terbukti tak andal untuk tool-calling multi-langkah) → pisahkan fase riset dan generasi jadi dua panggilan. Jangan dibalik urutannya.

---

## 4. Pelajaran operasional

- **Listing `tar` bukan bukti data ada di arsip.** Satu DB legacy hanya 4 KB dengan seluruh 41 baris di write-ahead log; arsip pertama hanya mengambil `.db`, dan uji restore menunjukkan DB ketiga kembali tanpa tabel. Menghapus saat itu = kehilangan permanen. **Selalu uji restore sebelum menghapus asli.**
- **Diam dari agent itu gejala, bukan status.** Tool call yang ditolak muncul sebagai jawaban ramah. Runtime tracing (default mati) adalah satu-satunya cara melihat sebabnya.
- **Webhook runtime membuang field yang tak dipakainya.** `system_prompt` dan `agent` diterima lalu diabaikan. Anggap sebuah field dekoratif sampai trace membuktikan sebaliknya.
- **Interpolasi shell bisa memalsukan keberhasilan.** Menulis `${VAR}` lewat perintah `ssh "…"` membuat shell lokal meng-expand-nya jadi kosong — dan hasilnya **tetap terlihat benar** kalau hanya di-grep. Verifikasi nilai ter-resolve (`docker compose config`), bukan barisnya.
