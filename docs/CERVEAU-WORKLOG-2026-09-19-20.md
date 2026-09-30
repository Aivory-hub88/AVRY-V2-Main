# Cerveau — Catatan kerja 2026-09-19 s/d 2026-09-20

**Cakupan:** perbaikan A2A/delegasi, memori graph cognee-rs (permanen), tool calling (studi Hermes Agent), latensi, kebenaran ledger task, backfill memori lama, dan rotasi password Postgres.
**Sistem:** Cerveau (fork zeroclaw) di `tencent-vps`, `:3100`, config `~/.zeroclaw-cerveau/config.toml`, repo `~/Documents/AVRY-Cerveau` (branch deploy `cerveau-main`).
**Dokumen terkait:** [ADR-014](ADR-014-CERVEAU-DELEGATION-ENVELOPE-AND-LEDGER-LINK.md) (delegation envelope + ledger link, dikerjakan sesi paralel), [ADR-015](ADR-015-CERVEAU-TOOL-CALLING-VS-HERMES.md) (tool calling vs Hermes, detail teknis lengkap), [ADR-007](ADR-007-CERVEAU-COGNEE-INTEGRATION.md) (cognee).

Dokumen ini adalah **ringkasan kronologis apa yang dikerjakan, apa yang terbukti, dan apa yang belum**. Detail desain ada di ADR masing-masing.

---

## 1. Ringkasan satu halaman

| # | Pekerjaan | Status |
|---|---|---|
| 1 | Delegasi antar-agent memakai memori tenant yang salah | Diperbaiki, live |
| 2 | Sub-turn delegasi melewati gerbang approval (`approval: None`) | Diperbaiki, live, diverifikasi (write parkir, read jalan) |
| 3 | Konteks tenant/origin/approval hilang di `tokio::spawn` (jalur background & paralel) | Diperbaiki, live |
| 4 | cognee-rs praktis tidak terpakai (7 dokumen total, model tak pernah memanggil `graph_remember`) | Auto-ingest + auto-recall permanen, live |
| 5 | Prompt Lex terlalu besar | Dipangkas: median input token 50.942 → 11.383 (−78%) |
| 6 | Ledger task: pesan menyesatkan, lubang `cancelled`, relabel sync | 4 perbaikan, live |
| 7 | Studi Hermes Agent → adopsi (C1, C2, B1, B2) + audit B8 | Live; B3–B7 sengaja tidak dikerjakan |
| 8 | Latensi: `preload` tool, fast path sapaan | Live; dampak kecepatan **belum terbukti** (lihat §9) |
| 9 | Deploy ADR-014 A1/A2 (dari sesi paralel) | Live, migrasi kolom ledger terverifikasi |
| 10 | Backfill memori `core` lama ke graph cognee | Selesai: 126 fakta, 7 grup, terverifikasi |
| 11 | Rotasi password Postgres `aivory` | Selesai (percobaan pertama gagal + rollback bersih; kedua sukses) |

Belum dikerjakan / butuh keputusan: rotasi password Redis dan `x-bridge-key`, password panel `vps-panel`, ±130 file `.bak` berisi password lama, keputusan produk hub-and-spoke, ukur ulang latensi Lex. Lihat §11.

---

## 2. A2A / delegasi: tiga akar masalah

Gejala awal: agent Cerveau kadang kesulitan saat diminta berkomunikasi dengan agent lain.

**2.1 Memori tenant salah** (`125c3d782`). Sub-turn delegasi membuka memori dengan scope yang keliru. Scope tenant yang benar adalah `t_<user>.<agent_type>` (`create_memory_for_tenant`), sehingga agent target tidak melihat memorinya sendiri. Perbaikan di `tools/delegate.rs` (`memory_for_target_agent`, `delegate_memory_tenant_id`).

**2.2 Gerbang approval terlewati** (`81e4dae21`). Loop sub-turn delegasi berjalan dengan `approval: None`, jadi tool berisiko di dalam delegasi tidak pernah diparkir. Sekarang parent menurunkan template approval (`ApprovalManager::delegation_template`, task-local `DELEGATION_APPROVAL`) dan sub-loop memakai `derive_for_risk_profile(profile)`. Diverifikasi live: Aira → Lex, `create_lead` parkir (pending), baca jalan.

**2.3 Konteks hilang di spawn.** Task-local (`TENANT_CONTEXT`, `TURN_ORIGIN_CONTEXT`, `LAST_PENDING_APPROVAL`, `DELEGATION_APPROVAL`) tidak diwarisi `tokio::spawn`/`zeroclaw_spawn::spawn!`. Ditambahkan `DelegateAmbient` yang menangkap dan meng-scope ulang ketiganya di jalur background dan paralel.

**2.4 Relabel jalur sync** (`7cc6323af`). Hop delegasi sinkron kini berjalan di bawah overlay tenant milik spesialis target (`delegate_tenant_overlay`, wrapper `execute_sync_with_admission`).

Pelajaran: bahaya terbesar ada di batas `spawn`, bukan di logika delegasi itu sendiri. Setiap task-local baru harus ditambahkan ke `DelegateAmbient`.

---

## 3. Memori graph cognee-rs: dari opsional jadi otomatis (`45eb71ec5`)

**Masalah terukur:** graph hanya terisi jika *model* memilih memanggil `graph_remember`. Di produksi itu tidak pernah terjadi (7 dokumen total, tidak ada yang baru selama berhari-hari).

**Desain:**
- **Auto-ingest** (`agent/graph_sync.rs`, hook di `agent/loop_.rs` setelah `consolidate_turn_extract`): fakta hasil konsolidasi tiap turn di-`add` langsung (~0,1 dtk), sedangkan `cognify` (pipeline LLM, ~40–60 dtk) di-debounce per `(tenant, agent_type)`, default 90 dtk, sehingga satu rentetan fakta = satu ekstraksi.
- **Auto-recall** (`agent/turn/mod.rs`, `agent/memory_inject.rs::with_graph_knowledge`): `graph_memory::recall_context` berjalan `tokio::join!` bersama `render_memory_context`, dengan timeout 1500 ms dan batas 1200 karakter, dilipat ke dalam blok `[Memory context]`. Gagal → fail-open (turn tidak terganggu).
- Config baru `[cognee]`: `auto_ingest`, `ingest_debounce_secs`=90, `auto_recall`, `recall_timeout_ms`=1500, `recall_max_chars`=1200. Client HTTP di-cache dan di-*warm* saat daemon start.

**Bukti live (E2E):** fakta yang hanya ada di graph dijawab dengan **nol tool call dalam 3,9 dtk**; isolasi antar-tenant terverifikasi.

**Backfill (§10)** melengkapi memori sebelum auto-ingest aktif.

---

## 4. Pemangkasan prompt Lex

Prompt Lex membengkak (skill di-inline penuh). Perbaikan lewat mode skill `compact` + `read_skill` pada profil runtime Lex (`open_skills_enabled` tetap dikontrol terpisah). Hasil, median token input per turn: **50.942 → 11.383 (−78%)**. Kualitas diuji ulang lewat skrip uji sebelum dan sesudah; tidak ada regresi yang teramati.

---

## 5. Kebenaran ledger task

| Commit | Perbaikan |
|---|---|
| `58afef48e` | Task yang sudah selesai dijawab "already done", bukan "not found" (`MissingTask`, `already_done_error`, `StatusUpdate {Applied, AlreadyDone, StoppedByOperator}`) |
| `6f0cce1ed` | `done` yang terlambat tidak lagi mengubah task yang dibatalkan operator menjadi "delivered" (filter `status <> 'cancelled'` pada penghapusan arsip) |
| `7673aa7b5` | `task_update_status` tidak lagi mengklaim sukses untuk tulis yang diabaikan ledger: pesan jujur "NOT APPLIED … stopped by an operator … Do not retry", `success:false`; tidak ada aksi avry-backend hantu |
| `7cc6323af` | Relabel `agent_type` di jalur sync (lihat §2.4) |

Alasan perubahan pesan: sebelumnya agent mengira task selesai padahal statusnya tetap `cancelled`.

---

## 6. Studi Hermes Agent dan adopsi (ADR-015)

Basis: `NousResearch/hermes-agent` dibaca via GitHub API + trace produksi Cerveau (16–18 Sep: 927 hasil tool, 159 gagal). Cerveau sudah unggul di approval/tier/idempotensi/isolasi tenant; yang diadopsi:

- **C1 (`d0f342c3a`)** `render_call_error` di `mcp_tool.rs`: rantai error penuh (`{:#}`), redaksi URL, batas 500 karakter. Pemicu: satu tool (`get_thread_memory`) gagal 102/102 kali dan model tak pernah tahu alasannya karena `e.to_string()` hanya memuat konteks terluar anyhow.
- **C2 (`d0f342c3a`)** `unknown_tool_message`: nama tool terdekat + rute `tool_search select:X`.
- **B2 (`0fba501d2`)** *Deny-by-default batch planner* (`plan_tool_batch`, `execute_tools_planned`): hanya tool yang dideklarasikan aman-paralel (`[tool_concurrency] parallel_safe`, atau builtin baca-saja) yang dijalankan bersamaan; `tool_search` dan `delegate` adalah penghalang; segmen berurutan. Sebelumnya seluruh batch berjalan paralel kecuali beberapa pengecualian, sehingga tulis yang bergantung bisa balapan. Risk tier sengaja **tidak** dipakai sebagai sinyal (tier `safe` berarti "jalan tanpa parkir", bukan "read-only"). Log live: `tool batch plan: P2,S1`.
- **B1 (`9dadd0cf3`)** Dua lapis:
  - *Dalam turn*: `LoopDetector::record_failure` untuk tool `server__tool`: peringatan pada kegagalan ke-3, blokir ke-4, hentikan turn ke-5 (`[pacing] loop_failure_streak_threshold`=3). Built-in dan penolakan approval dikecualikan.
  - *Lintas turn*: `turn/tool_breaker.rs`: 5 kegagalan **sisi server** berturut-turut (`MCP server \`…` dari `dispatch_rpc`) → panggilan berikutnya dijawab "sementara tidak tersedia"; cooldown 60 dtk, berlipat, maks 300 dtk (`tool_breaker_threshold`, `tool_breaker_cooldown_secs`; `0` mematikan tanpa deploy). Tool yang membalas error aplikasi ("thread not found") membuktikan server hidup dan mereset hitungan.
- **B8 (audit)**: JSON argumen rusak sudah ditolak tanpa dieksekusi; 0 kejadian dalam 3 hari. Tidak ada celah.

**Koreksi penting yang tercatat:** sebelum B1, `results_collect` hanya memberi detektor loop panggilan yang *sukses*, jadi kegagalan tak pernah terlihat oleh pola mana pun. Klaim awal bahwa detektor membatasi kegagalan hingga 7 per turn keliru; yang membatasi adalah batas iterasi.

**Tidak dikerjakan (sengaja, "ukur dulu"):** B3 budget agregat + spill hasil tool, B4 koersi argumen, B5 sanitizer skema, B6 cap delegate/web_search per turn, B7 stub hasil identik.

---

## 7. Latensi

Fakta dari 213 turn (16–18 Sep): eksekusi tool hanya ≈2,3% waktu total; satu panggilan LLM median 7,8 dtk (p90 21,6 dtk); turn dengan tool median 48,6 dtk / 4 panggilan; turn tanpa tool median 4,4 dtk. Beban terbesar: 87% turn-tool Lex membayar satu hop `tool_search` tambahan (median 59 dtk vs 24 dtk tanpa).

Ditambahkan (`b81519681`):
- **`tool_filter_groups mode = "preload"`**: pra-aktivasi tool tanpa membatasi. Jebakan yang dihindari: mode `always`/`dynamic` adalah *whitelist* (menyembunyikan semua MCP tool yang tak disebut). Dipasang untuk 6 tool mail tenant milik Lex.
- **`[fast_path] smalltalk`** (`agent/smalltalk.rs`): pengklasifikasi leksikon deterministik untuk sapaan/terima kasih/pamit. Melewati recall dan konsolidasi per-turn; tool tetap tersedia. "ya/oke/lanjut/kirim" sengaja tidak masuk.

Config yang diterapkan user: `[fast_path] smalltalk = true`, grup `preload` Lex, `[tool_concurrency] parallel_safe` (4 tool baca mail + `list_leads`); backup `config.toml.bak-pre-latency-20260920`.

---

## 8. Deploy dan verifikasi

Binary yang live: `cerveau-main` `9dadd0cf3` (rilis bergulir `cerveau-cd`). Urutan deploy dalam periode ini, masing-masing dengan backup binary `/usr/local/bin/zeroclaw-cerveau.bak-pre-*`: patch delegasi/cognee → A1/A2 + planner + C1/C2 (`0fba501d2`) → preload + smalltalk (`b81519681`) → breaker (`9dadd0cf3`).

Resep deploy: unduh rilis → cek sha256 → `doctor` → backup binary → `.new` + `mv` atomik → `systemctl restart` → health check. CI (`cerveau-build.yml`) memakai `cancel-in-progress: true`; `build-release` menunggu `postgres-tests`, `redis-tests`, `tenant-isolation`. Jangan push saat build yang diinginkan masih berjalan.

Regresi live terakhir (binary `9dadd0cf3`): sapaan memicu fast path; planner mencatat 3 batch; delegasi Aira → Lex baca OK / tulis parkir; siklus task normal; tidak ada event breaker/loop-detector palsu; data uji dibersihkan; service sehat (NRestarts 0, health 200).

Migrasi A2: 6 kolom baru di `cerveau.agent_tasks` (`ADD COLUMN IF NOT EXISTS`) terverifikasi; snapshot sebelum migrasi di `~/cerveau_ledger_pre_a2_20260919_2214.sql` (VPS).

---

## 9. Yang **tidak** terbukti (dinyatakan jujur)

- **Circuit breaker belum pernah terpicu live.** Memancingnya butuh server MCP yang benar-benar mati (mengganggu produksi). Dijaga tes unit + tes wiring (`post_exec` → `prepare_tool_calls`) yang gagal bila pemanggilan pencatatan dihapus.
- **Fast path sapaan:** klasifikasi terbukti (3 sapaan kena; "ya" dan "halo, tolong tampilkan…" tidak). Manfaat kecepatan **tidak** terbukti (n=3, tenggelam dalam noise LLM; perkiraan ~1 dtk).
- **`preload`:** satu turn nyata (mail Lex dari Mission Control Room, 16:43Z) memakai tool mail tanpa `tool_search`; sejak 16:25Z 1 dari 3 turn-tool Lex masih butuh search (baseline 87%). n terlalu kecil; ukur ulang dengan `latency_after.py <cutoff>` setelah trafik nyata terkumpul.

---

## 10. Backfill memori lama ke graph cognee

Auto-ingest hanya mencerminkan fakta baru; memori sebelumnya tak pernah masuk graph. Skrip `cognee_backfill.py` (default dry-run, `--apply --tenant <id>`).

- **Cakupan:** hanya alias `t_user_<id>.<agent_type>` (user nyata). Tabel `cerveau.memories` berisi 190 baris `core`; 64 milik tenant probe/test tidak dimasukkan. Jadi angkanya 126, bukan 117.
- **Hasil:** `user_d0985ab099ef142a` (122: leads_qualifier 92, autonomous 20, chief_of_staff 8, customer_service 1, office_assistant 1) dan `user_9e552e5f601c49b8` (4: chief_of_staff 3, leads_qualifier 1). Canary di tenant terkecil dulu.
- **Verifikasi:** setiap grup dicari lewat kutipan faktanya sendiri: semua ketemu via `CHUNKS`; 0 kebocoran antar-tenant.
- **Gotcha:** `cognify` mengekstrak *semua* dokumen dataset dalam satu batch (`chunks_per_batch=2000`, tanpa opsi memperkecil). Grup 92 dokumen gagal HTTP 500 setelah 141 dtk (tanpa detail di log) dan berhasil pada retry biasa (228 dtk); dokumen sudah tersimpan sehingga retry tak perlu `add` ulang. Auto-ingest normal aman karena debounce menjaga batch tetap kecil.
- Sidecar aktif = service systemd `cognee-cerveau` (`journalctl -u cognee-cerveau`); container docker `cognee-cerveau` adalah sisa lama tanpa log.

---

## 11. Insiden keamanan dan rotasi password Postgres

**Apa yang terjadi.** Saat mencari backend memori, saya (Claude) menjalankan `grep -n "postgres\|db_url\|database"` pada `config.toml`. Redaksi saya hanya mencocokkan format URL (`postgres://user:pw@`), sedangkan config memakai `db_url = "host=… password=… dbname=…"`, sehingga password `aivory` tercetak utuh di output tool. Kelalaian saya. Password itu sebelumnya juga sudah ada di 36 transkrip sesi lama dan satu memory note, jadi ini bukan kebocoran pertama, tapi kemunculan di sesi ini tanggung jawab saya.

**Penilaian risiko.** `pg_hba.conf`: `trust` untuk lokal/`127.0.0.1`, `scram-sha-256` untuk sumber lain; port 5432 diblokir ufw dari internet (diuji dari luar: tidak terjangkau). Jadi password hanya berguna dari dalam VPS/jaringan docker. Bocor nyata, tidak dapat dieksploitasi dari internet.

**Tindakan.**
1. Password di memory note `new-vps-key-storage-supabase.md` disamarkan (3 → 0 kemunculan).
2. Inventaris read-only: 16 container membawa password lewat env, 14 file aktif, 144 file total (±130 adalah backup).
3. Skrip `rotate_pg_password.py` (default dry-run; backup 700; `ALTER ROLE` lewat stdin; ganti hanya file aktif; recreate service satu per satu dengan health check; verifikasi password baru diterima dan lama ditolak lewat jalur scram; rollback otomatis). Dijalankan oleh user, karena mengubah kredensial produksi bukan hal yang dieksekusi Claude sendiri.
4. **Percobaan pertama gagal di langkah pertama, rollback otomatis bersih** (file, password lama, service): pemulihan diverifikasi. Penyebab: skrip menjalankan `docker compose` tanpa `-f`, sehingga compose naik ke direktori induk dan memilih `/home/ubuntu/docker-compose.yml` (isinya `vps-panel`). Dry-run sebelumnya hanya menguji jalur edit, bukan jalur restart. Kelalaian saya.
5. **Kebocoran kedua akibat skrip yang sama:** stderr compose mengutip potongan `PANEL_PASSWORD_HASH` (hash bcrypt di `/home/ubuntu/.env`, terpotong di karakter `$`), dan skrip meneruskannya mentah ke terminal. Yang bocor hash, bukan password.
6. Perbaikan skrip: compose dipanggil dengan project/direktori/`-f` dari label container; stderr selalu disamarkan; dry-run menguji jalur restart; unit systemd yang tidak aktif dilewati (kalau tidak, memicu rollback palsu).
7. **Percobaan kedua sukses:** 14 file, 13 service compose + 5 unit systemd, password baru diterima, lama ditolak. Verifikasi pasca: tidak ada file aktif yang masih memuat password lama; 6 login gagal muncul tiap 30 dtk selama jendela restart (01:51–01:54Z) lalu berhenti (0 setelahnya).
8. Dua folder backup `~/pgrot-backup-*` (berisi password lama) dihapus oleh user.

**Pelajaran operasional:**
- `docker compose` tanpa `-f` naik ke direktori induk dan bisa mengenai project yang salah. Selalu pakai label `com.docker.compose.project.*`.
- Jangan pernah mencetak stderr compose mentah: ia mengutip nilai `.env` yang terpotong di `$`.
- Grep ke file config: cari nama key saja, atau samarkan semua pola `password=`/`secret`/`key`.
- Uji password Postgres dari IP non-loopback container (`hostname -i`), karena jalur loopback `trust`.
- Dry-run harus menjalankan jalur restart, bukan hanya jalur edit.

---

## 12. Butir terbuka

**Butuh tindakan user (tidak dikerjakan Claude):**
1. Rotasi password Redis di `redis_url` dan `x-bridge-key` native bridge (keduanya pernah tercetak di output tool sekali).
2. Ganti password panel `vps-panel` (sebagian hash bcrypt-nya tercetak; risiko rendah, prioritas naik bila panel dapat diakses publik).
3. ±130 file `.bak*`/`deploy-backups`/dokumen lama yang masih berisi password Postgres lama (sudah mati; penghapusan data adalah keputusan user).
4. Keputusan produk hub-and-spoke: apakah agent produk boleh saling delegasi langsung, atau tetap lewat `autonomous`.
5. Ukur ulang latensi Lex (`latency_after.py <cutoff>`) setelah trafik nyata cukup.

**Sudah rusak sebelum periode ini (bukan dari pekerjaan di atas):** `cerveau-health-check.service` (mengecek `:3101`, instance B yang sudah dihapus; disarankan dinonaktifkan), `docker-user-firewall.service` (gagal sejak 17 Sep), `cerveau-config-drift.service` (not-found), container `avry-console` unhealthy sejak 17 Sep.

**Backlog Hermes opsional (B3–B7):** hanya jika trace menunjukkan masalahnya; detail di ADR-015.

---

## 13. Gotcha yang layak diingat

- anyhow `to_string()` membuang rantai penyebab; gunakan `{:#}` saat merender error untuk model atau log.
- `zeroclaw_log::record!` menulis ke `runtime-trace.jsonl`, bukan journald.
- Jangan jalankan `cargo fmt -p zeroclaw-runtime` (memformat ulang file yang tak terkait); pakai `rustfmt --edition 2024 <file>`.
- Tes runtime `peer_turn_cost_scope_through_execute_boundary` stack overflow (dilewati); 2 kegagalan lama di `zeroclaw-config` (`connection_gate*`) dan 1 di `zeroclaw-memory` (`lucid`) sudah ada sebelumnya.
- Mode `tool_filter_groups` `always`/`dynamic` = whitelist; `preload` = pra-aktivasi tanpa membatasi.
- Classifier shell menahan edit config live dan operasi data massal; skrip dengan dry-run default + eksekusi oleh user adalah pola yang dipakai sepanjang pekerjaan ini.
- Path skrip di scratchpad hanya ada di Mac; jalankan lewat `ssh tencent-vps 'python3 - <args>' < skrip` atau salin dulu.

## 14. Lampiran: commit periode ini di `cerveau-main`

Dikerjakan dalam alur kerja ini: `125c3d782`, `81e4dae21`, `45eb71ec5`, `58afef48e`, `6f0cce1ed`, `7673aa7b5`, `7cc6323af`, `d0f342c3a`, `0fba501d2`, `b81519681`, `9dadd0cf3`.
Dari sesi paralel (ADR-014 dan ledger), di-deploy bersama: `5fcd622e2` (A1 envelope), `b5fd5882d` (A2 ledger link), `9fe78f0ad`, `9facf2a68`, `042128caf`, `c172c8427`, serta rangkaian penguatan tier/velocity-gate/tenant-escape 18–19 Sep (`b69840b87`, `9461de9f9`, `9ee78ef8e`, `67cb498b5`, `b97724213`, `bdb8a9d80`, `1578a857a`, `75ab7cab9`).
Atribusi commit didasarkan pada ringkasan kerja; verifikasi lewat `git log` bila perlu.
