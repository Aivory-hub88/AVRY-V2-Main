# ADR-026 — Memory stack Cerveau: lebih lean dan cepat dulu, canggih belakangan dan hanya bila terukur

**Status:** Proposed (2026-11-25). Riset + rancangan. Tidak ada perubahan produksi, tidak ada kode yang di-deploy.
**Tanggal:** 2026-11-25
**Terkait:** [ADR-002](ADR-002-CERVEAU-TENANT-DESIGN.md) (isolasi tenant), [ADR-004](ADR-004-CERVEAU-MEMORY-LIFECYCLE.md), [ADR-007](ADR-007-CERVEAU-COGNEE-INTEGRATION.md) (graf cognee), [ADR-008](ADR-008-CERVEAU-MULTI-AGENT-COLLABORATION.md), [ADR-010](ADR-010-CERVEAU-CONTEXT-BUDGET.md), [ADR-016](ADR-016-CERVEAU-MEMORY-RECALL-QUALITY.md) (kualitas recall, shadow eval).
**Nomor:** 023 dan 024 dirujuk di komentar kode (`ADR-024 B` pinned tier) tetapi belum ada berkas di `main`; 025 sudah dipakai. Dokumen ini memakai 026 supaya tidak bentrok. Ubah bila sesi lain sudah memegang 026.
**Basis:** pembacaan kode `AVRY-Cerveau` (checkout `a1b9110bd`), pengukuran read-only di VPS produksi pada 2026-11-25 (trace `runtime-trace*.jsonl` 11,8 hari, query `EXPLAIN ANALYZE` read-only, uji embedding 36 panggilan), dan riset sumber terbuka (§8). Skrip ukur ada di §12.

---

## 1. Ringkasan keputusan

1. **Waktu recall bukan terutama waktu database.** Query Postgres hybrid pada tenant terbesar (551 baris) memakan **85 ms** (p50). Embedding query ke OpenRouter **0,66 s** (p50, stabil di bawah beban 6 paralel). Graf cognee **0,65 s** (p50). Recall memori dan graf berjalan paralel (`tokio::join!`), jadi biaya teoretis recall ≈ **0,75 s**, bukan 1,4 s median pra-LLM yang terlihat.
2. **Ekor lambat (p90 4,2 s, maks 25 s) belum terjelaskan sepenuhnya, tetapi petunjuknya kuat dan bukan embedding.** Pada burst 5-6 turn serentak (mis. 2026-11-17 07:53 UTC) tahap recall memori selesai **berurutan dengan jeda 1,6-10 s**, padahal graf selesai < 0,7 s dan embedding terbukti tidak antre. Penyebab (starvasi worker tokio di 4 vCPU, antrean pool r2d2, atau yang lain) harus dibuktikan dengan instrumentasi (§5, fase F0), bukan ditebak.
3. **Beberapa knob config yang tampak aktif ternyata tidak melakukan apa-apa** (verifikasi di kode, §4): `retrieval_stages = ["cache","fts","vector"]`, `fts_early_return_score`, dan `embedding_cache_size` pada backend Postgres. Cache recall juga tidak dipakai jalur tenant (`recall_for_agents`). Jadi "FTS dulu, vektor hanya bila perlu" dan "cache embedding" **tidak bisa** dicapai lewat config; butuh Rust.
4. **Jangan ganti stack, jangan tambah komponen.** Korpus produksi kecil (1.613 baris, 9,4 MB, 87 agent). Tidak ada bukti bahwa Mem0/Zep/Letta/graf temporal akan memberi manfaat nyata di skala ini; semuanya menambah panggilan LLM saat tulis atau komponen baru. Rekomendasi: **ukur dulu (F0), buang yang nol nilainya, percepat yang pasti (cache embedding query, timeout, paralel), baru putuskan soal graf (F3).**
5. **Cognee harus jadi stabil dulu, baru lebih canggih (§14).** Hang berulang (3-11 Okt, 17 Nov x3, 22 Nov) dilacak ke self-deadlock di `DatasetRunGuard::acquire` (fork `cognee-rs`, commit `4a60eff`, sudah di-deploy 22 Nov 17:21 CST; 0 hang sejak, tetapi baru 3 hari). Sisa masalah: 7,5% recall graf timeout dan kualitas graf. Cognee **sudah** Postgres untuk vektor dan graf (pgvector + pggraph); yang tersisa SQLite adalah relasional.
6. **Pertanyaan "perlu dua sumber (Postgres + cognee)?" dijawab lewat eval ablasi offline (§7)**, bukan opini. Sampai ada data, graf dibiarkan dan hanya diberi anggaran waktu yang lebih ketat.

Poin 5 dan 6 menggantikan penomoran lama; rekomendasi ranking (gain latensi / usaha / risiko) ada di §6; rencana fase dengan exit gate di §9.

## 2. Pengukuran (sumber dan metode)

Semua angka diambil 2026-11-25 dari VPS `aivory-prod`, hanya baca. Tidak ada percakapan tenant yang dikutip. Alias tenant dianonimkan.

### 2.1 Konfigurasi dan korpus

| Hal | Nilai | Sumber |
|---|---|---|
| `[memory]` | backend `postgres`, `search_mode=hybrid`, `vector_weight=0.7`, `min_relevance_score=0.4`, `rerank_enabled=false`, `retrieval_stages=[cache,fts,vector]`, `fts_early_return_score=0.85`, `embedding_cache_size=10000`, embedding OpenRouter `text-embedding-3-small` 768 dim | `config.toml` (di-parse di server, hanya kunci non-rahasia) |
| Korpus | 1.613 baris (1.576 ber-embedding), 87 agent, 9,4 MB, kategori `daily` 978 + `core` 635, 0 superseded | query `cerveau.memories` |
| Agent terbesar | 551 baris | idem |
| Indeks | btree (id, agent_id+key, category, session, updated_at, namespace) + GIN FTS (`content`, `key`, partial `conversation`). **Tidak ada indeks vektor** (pgvector 0.8.6 terpasang) | `pg_indexes` |
| Host | 4 vCPU, 7,7 GB RAM, `shared_buffers=256MB`, Postgres bersama layanan lain | `nproc`, `free`, `show` |
| Injeksi | default `limit=5`, `max_entries=4`, `entry_max_chars=800`, `max_total_chars=4000` | `memory_inject.rs:40-46` |

### 2.2 Latensi per tahap

| Tahap | n | p50 | p90 | maks | Catatan |
|---|---|---|---|---|---|
| Embedding query (OpenRouter, urut) | 12 | 0,66 s | 1,03 s | 1,18 s | koneksi baru per panggilan dari skrip uji |
| Embedding query (burst 6 paralel x4) | 24 | 0,64 s | 0,79 s | 1,41 s | **tidak antre** |
| Postgres hybrid (vektor+FTS), agent 551 baris | 15+15 | 85 ms | - | 107 ms | `EXPLAIN ANALYZE`, server-side, scan penuh per agent |
| Postgres FTS saja | 15 | 36,6 ms | - | 40 ms | tanpa operand vektor |
| Graf cognee `recall_context` | 237 | 649 ms | 971 ms | 1.503 ms | 14 dari 237 (5,9%) menyentuh batas 1,5 s |
| Landlock (awal setup turn) sampai "shadow eval" | 266 | 1,69 s | 6,19 s | 28,1 s | **proksi kasar**: ikut menghitung perakitan MCP (mis. `connect_ms=810` pada satu sampel) |
| Selisih "graph call" selesai sampai "shadow eval" | 237 | 0,78 s | 4,22 s | 27,0 s | mengonfirmasi angka sesi sebelumnya |
| Peringatan "embedding failed" | - | 0 | | | tidak pernah terjadi di trace 11,8 hari |

Per konkurensi (jumlah turn yang mulai dalam jendela 4 s), proksi Landlock-ke-shadow-eval: 1 turn p50 1,5 s / p90 4,5 s / maks 17,5 s (n=197); ~5 turn p50 2,6 s / p90 6,6 s / maks 12,3 s (n=43). Burst terburuk (2026-11-17 07:53 UTC, 6 turn): shadow eval selesai pada -18,8, -13,4, -10,0, -8,4 s sebelum yang terakhir, sedangkan graf kembali dalam 0,6 s.

### 2.3 Kontribusi memori ke prompt

Dari 266 shadow eval: rata-rata **3,07 entri diinjeksi** per turn (maks 4), pool rata-rata 4,88 (maks 5), **44 turn (17%) tanpa injeksi sama sekali**. Batas keras 4 entri / 4.000 karakter ≈ ≤1.000 token, sekitar 9% dari median input ~11 ribu token. Ukuran blok graf tidak diukur (belum ada instrumen).

### 2.4 Yang TIDAK terukur (jujur)

- Pecahan waktu di dalam daemon (pool, thread, `touch_accessed`) karena tidak ada timer per tahap di log. Karena itu ekor 4-25 s **belum terbukti** milik tahap mana.
- Embedding dari dalam proses daemon (hanya dari skrip Python di host yang sama).
- Kualitas jawaban dengan/ tanpa tiap sumber (belum ada eval; §7).
- Biaya embedding per turn: harga model dari daftar harga vendor, **belum diverifikasi**; secara orde ini jauh di bawah biaya LLM satu turn.

## 3. Alur recall saat ini (terverifikasi di kode)

`turn/mod.rs:1810-1890`: sebelum LLM, `tokio::join!` menjalankan (a) `render_memory_context` (recall Postgres + decay + render) dan (b) `graph_recall` (HTTP ke sidecar 127.0.0.1:3200, dibatasi `recall_timeout_ms`). Keduanya selesai baru prompt dirakit.

`postgres.rs:1290-1420` (`recall_for_agents`): (1) `try_embed` via HTTP; (2) thread OS baru per operasi (`run_on_os_thread`), ambil koneksi `r2d2` (pool maks 8); (3) satu SQL: skor = `keyword*ts_rank_cd + 0.7*(1 - cosine)`; klausa `WHERE` dilebarkan dengan `OR embedding IS NOT NULL` sehingga **tidak bisa memakai GIN maupun indeks vektor** dan menghitung `to_tsvector` per baris; (4) `UPDATE access_count` sinkron di thread yang sama (`touch_accessed`).
Isolasi tenant: filter `m.agent_id = ANY($4)` di `WHERE` (dibungkus `AgentScopedMemory`).

## 4. Temuan kode yang mengubah rencana

| # | Temuan | Bukti | Dampak |
|---|---|---|---|
| K1 | `retrieval_stages` "fts"/"vector" dan `fts_early_return_score` **inert**; hanya "cache" yang dibaca | komentar `retrieval.rs:1-20` | "FTS-first early return" tidak ada; config tidak bisa menghasilkannya |
| K2 | Cache recall **tidak dipakai** oleh `recall_for_agents` (jalur tenant) | `retrieval.rs:680-695` | `"cache"` di config tidak berefek pada turn tenant |
| K3 | `embedding_cache_size` hanya dipakai `SqliteMemory`; `PostgresMemory.try_embed` memanggil API setiap recall | `lib.rs:841`, `postgres.rs:168`, tidak ada cache di `postgres.rs` | tiap turn non-filler membayar ~0,66 s embedding walau query sama |
| K4 | `OpenAiEmbedding` memakai `build_runtime_proxy_client` tanpa timeout eksplisit | `embeddings.rs:85-125`; **belum diverifikasi** apakah `apply_to_reqwest_builder` menambahkan timeout | OpenRouter yang macet bisa menahan recall tanpa batas; graf punya batas 1,5 s, embedding tidak |
| K5 | Perakitan prompt menunggu `join!` dari **dua** sumber; recall memori tidak punya batas waktu | `turn/mod.rs:1862` | ekor ditentukan sumber paling lambat |
| K6 | Query hybrid = scan penuh per agent, `to_tsvector` dihitung per baris | `EXPLAIN` §2.2 (85 ms vs FTS 37 ms) | murah sekarang; tumbuh linear terhadap baris per agent |

## 5. Opsi memangkas latensi

Estimasi penghematan memakai angka §2.2 untuk **kasus tipikal** (median ~0,75 s teoretis; ekor belum dipahami).

| Opsi | Penghematan perkiraan | Usaha | Risiko | Perlu | Isolasi tenant |
|---|---|---|---|---|---|
| **O1. Instrumentasi per tahap** (embed_ms, pool_wait_ms, sql_ms, touch_ms, total) di event `MemoryRecall` | 0 langsung, tetapi membuka diagnosis ekor | Rendah | Rendah | Rust, biner baru | aman |
| **O2. Timeout + fail-open pada recall memori** (mis. 1,5 s seperti graf; jatuh ke FTS-only atau tanpa memori) | memotong ekor ke ≤1,5 s; menutup K4/K5 | Rendah | Rendah-sedang (turn sesekali tanpa memori) | Rust | aman |
| **O3. Cache embedding query** (LRU in-process, kunci = hash teks ternormalisasi + model + dim) | ~0,66 s pada query berulang; hit rate **belum diketahui** (ukur dulu) | Rendah | Rendah | Rust | **kunci cache TIDAK boleh memuat konten tenant lain; embedding bukan data tenant sehingga aman, tetapi jangan cache hasil recall lintas agent** |
| **O4. Embedding paralel dengan setup MCP** (mulai embedding sebelum `MCP assembly`, ~0,8 s pada sampel) | hingga min(0,66 s, waktu MCP) per turn | Sedang | Sedang (urutan kode) | Rust | aman |
| **O5. Embedding lokal** (fastembed/ONNX `multilingual-e5-small`, 384 dim) | 0,66 s -> ~10-50 ms **(estimasi; belum diukur di VPS 4 vCPU)** | Tinggi: dimensi berubah, **re-embed seluruh korpus**, pindah kolom `vector(768)`, memori ~100-500 MB, bukan di jalur kritis lain | Sedang-tinggi (kualitas ID belum terbukti) | Rust + migrasi + model | aman bila re-embed per agent konsisten |
| **O6. FTS-first dengan early return, vektor hanya bila perlu** | sampai 0,66 s pada query dengan skor FTS tinggi; **hit rate belum diketahui** | Sedang | Sedang (kualitas) | Rust (implementasi K1) | aman |
| **O7. Dua CTE terurut + RRF** (ADR-016 P2) | ke bawah: tidak mengurangi latensi, memperbaiki kualitas | Sedang | Sedang | Rust | aman |
| **O8. Indeks HNSW/IVFFlat** | **0 manfaat**: 551 baris, scan eksak 85 ms; indeks perkiraan tak dipakai selama `WHERE` memuat `OR embedding IS NOT NULL` (K6). Dokumentasi pihak ketiga menyarankan indeks baru bila scan mahal; ambang baris tidak disebut | - | rendah | SQL | partisi per tenant tak perlu |
| **O9. Kuantisasi / partisi per tenant** | ~0 pada skala ini | Tinggi | sedang | - | partisi justru memperkuat isolasi, tetapi tak ada gunanya sekarang |
| **O10. Hapus graf dari jalur sinkron** (graf hanya lewat tool/ kueri eksplisit, bukan auto_recall tiap turn) | menghilangkan ≤1,5 s ekor dan 1 hop; tidak memengaruhi median karena paralel | Rendah (config `auto_recall=false`) | **kehilangan konteks relasional** bila graf memang berguna | **config saja** | aman |
| **O11. Turunkan `recall_timeout_ms` graf** (mis. 800 ms: 94% panggilan p50-p90 < 971 ms) | kecil | Rendah | sedikit lebih sering tanpa graf | config saja | aman |
| **O12. Backend lain (Qdrant sudah ada di VPS, SQLite lokal)** | tidak perlu: bukan bottleneck | tinggi | tinggi | - | risiko baru |

Catatan: `rerank_enabled=false` sudah benar secara latensi (rerank = CPU saja, tidak ada panggilan jaringan, tetapi manfaat kualitas belum terbukti; ADR-016 shadow eval berjalan).

## 6. Rekomendasi berperingkat

| Peringkat | Aksi | Alasan |
|---|---|---|
| **1** | **O1 + O2**: instrumentasi per tahap dan timeout fail-open pada recall memori | satu-satunya jalan membuktikan penyebab ekor 4-25 s; O2 menutup ekor secara pasti (K4, K5), risiko terendah |
| **2** | **O3**: cache embedding query (LRU, TTL pendek) + **O11** | ~0,66 s per query berulang; usaha kecil; hit rate diukur di F0 sebelum dipercaya |
| **3** | **Eval ablasi offline (§7)** lalu putuskan graf: pertahankan, ubah jadi on-demand (O10), atau perketat | menjawab "perlu dua sumber" dengan data, bukan klaim vendor |
| 4 | O4 (embedding paralel dengan setup MCP) | bagus, tetapi menyentuh urutan alur turn; lakukan setelah F0 |
| 5 | O6 (FTS-first) dan O7 (RRF) | hanya bila eval menunjukkan kualitas tidak turun; K1 berarti ini fitur baru |
| 6 | O5 embedding lokal | biaya migrasi besar, kualitas Indonesia **belum terbukti**; tunda sampai embedding API terbukti jadi ekor |
| - | O8, O9, O12, penggantian stack | tidak ada alasan terukur |

## 7. Arsitektur memori agent di open source: bukti vs klaim

Legenda sumber: **[P]** paper (peer-reviewed/arXiv, tetap hasil penulisnya), **[D]** dokumentasi resmi, **[V]** blog/benchmark vendor, **[T]** pihak ketiga/mirror. Semua angka vendor = **belum diverifikasi independen**.

| Sistem | Ide inti | Bukti yang ada | Catatan skeptis |
|---|---|---|---|
| **Mem0** | ekstraksi fakta oleh LLM saat tulis, update ADD/UPDATE/DELETE, opsi graf | [P] [arXiv 2504.19413](https://arxiv.org/abs/2504.19413): LoCoMo, J overall (angka dari ringkasan model, perlu dicek ke paper): full-context 72,9%, Mem0g 68,4%, Mem0 66,9%, Zep 66,0%, LangMem 58,1%, A-Mem 48,4%; Mem0 p95 total 1,44 s vs full-context 17,1 s, ~1,8k vs 26k token | harness milik Mem0 (judge gpt-4o-mini); **full-context menang akurasi**, keunggulan Mem0 = latensi dan token. Studi independen [arXiv 2603.04814](https://arxiv.org/html/2603.04814) melaporkan long-context lebih tinggi pada LongMemEval/LoCoMo |
| **Zep / Graphiti** | graf temporal (waktu valid + waktu ingest), episode -> entitas -> fakta | [P] [arXiv 2501.13956](https://arxiv.org/html/2501.13956), Tabel 2 LongMemEval: Zep gpt-4o 71,2% vs full-context 60,2%, latensi 2,58 s vs 28,9 s, konteks 1,6k vs 115k token; gpt-4o-mini 63,8% vs 55,4% | penulis sendiri, dijalankan dari laptop ke AWS; DMR 94,8% vs MemGPT 93,4% diambil dari paper MemGPT. Graf bernilai untuk temporal reasoning, bukan bukti untuk korpus kecil |
| **Letta / MemGPT** | tier: core (blok di prompt), recall (riwayat), archival (vektor); agen mengedit memorinya sendiri | [V] [Letta, Agu 2025](https://www.letta.com/blog/benchmarking-ai-agent-memory): file + grep/search saja = 74,0% LoCoMo, di atas Mem0 68,5% (angka Mem0 versi Letta, diperdebatkan) | pelajaran terpenting: **baseline sederhana kuat**; LoCoMo tak menguji knowledge update |
| **cognee** | ECL (extract-cognify-load) -> graf + vektor | [V] [cognee benchmarks](https://www.cognee.ai/knowledge-graph-memory-benchmarks): HotPotQA 24 pertanyaan x45 run; skor naik dari 0,476 ke 0,815 setelah tuning | benchmark milik sendiri, sampel kecil; cognee sendiri menyebut LLM-judge tidak andal. Tidak ada benchmark independen di sumber yang saya baca |
| **A-MEM, MemoryOS, LangMem** | A-MEM: Zettelkasten, link antar-memori; MemoryOS: tier short/mid/long; LangMem: ekstraksi + prosedural | [P] Mem0 melaporkan A-Mem 48,4%, LangMem 58,1% (LangMem p95 60 s). Paper stabilitas/plastisitas [arXiv 2609.30558](https://arxiv.org/pdf/2609.30558) memberi ranking berbeda (A-MEM tinggi, Mem0 rendah) | **ranking berbalik antar benchmark**: tidak ada pemenang umum |
| **Hermes Agent** | `MEMORY.md` (~2.200 char) + `USER.md` (~1.375 char) di system prompt (snapshot beku per sesi), `session_search` FTS5 + ringkasan LLM | [D] [Hermes memory docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory); batas karakter dari panduan pihak ketiga, cocok dengan docs | sangat lean; tanpa embedding bawaan; recall lintas sesi = FTS |
| **OpenClaw** | `MEMORY.md` kurasi + log harian; `memory_search` hybrid vektor 0,7 + BM25 0,3, chunk ~400 token/overlap 80, opsi decay half-life 30 hari, QMD reranker opsional | [D/T] docs konsep memori (mirror; versi berbeda mungkin) | mirip keputusan hybrid Cerveau; **log harian tidak diinjeksi, dicari on-demand** |
| **Nakama** (ahmadrosid) | memori org = Markdown (`Pinned` + log bertanggal) ≤2.048 byte di prompt; `org_memory_search`; agen *mengusulkan*, admin menyetujui; merge oleh LLM | [D] [org-memory](https://ahmadrosid.github.io/nakama/org-memory), [profiles](https://ahmadrosid.github.io/nakama/profiles) | embedding/ranking **tidak didokumentasikan**; menarik: **persetujuan manusia sebelum konsolidasi** |
| **LongMemEval** | benchmark 500 soal, 5 kemampuan (ekstraksi, multi-sesi, temporal, knowledge update, abstain) | [P] [arXiv 2410.10813](https://arxiv.org/abs/2410.10813), ICLR 2025; asisten komersial turun ~30% | rancangan "indexing/retrieval/reading" dan *time-aware query expansion* bernilai; judge LLM |
| **LoCoMo** | dialog panjang ~26k token | dipakai Mem0/Letta | tidak menguji knowledge update; harness tiap vendor beda |

**Yang cukup terbukti (lintas sumber):** (a) memori terkurasi kecil di prompt + pencarian on-demand (Hermes, OpenClaw, Nakama, Letta) memberi hasil kompetitif dengan biaya jauh lebih rendah; (b) hybrid BM25+vektor adalah praktik umum; (c) full-context sering **akurasi** tertinggi, jadi keuntungan memori = **latensi/token**, bukan akurasi; (d) graf temporal membantu pertanyaan temporal/knowledge-update (Zep, LongMemEval) tetapi dibuktikan di percakapan 100k+ token. **Klaim pemasaran:** angka SOTA antar-vendor tidak bisa dibandingkan; ranking berbalik antar benchmark.

Implikasi untuk Cerveau: korpus per tenant kecil (ratusan baris), turn singkat. Pelajaran yang relevan bukan "ganti stack", melainkan **anggaran kecil + retrieval murah + konsolidasi terkontrol** (sebagian sudah ada: pinned tier, hygiene, `core`/`daily`).

## 8. Lean: anggaran token dan dua sumber

- Anggaran memori terukur ≈ ≤1.000 token dari ~11 ribu; rata-rata 3 entri; 17% turn tanpa injeksi. Ruang pemangkasan memori **kecil** (≈ ≤9% input); keuntungan terbesar ada di latensi, bukan token.
- Dua sumber: graf cognee memakai sidecar `cognee-rs` (biner native `cerveau-server`, systemd `cognee-cerveau`, :3200), proses `cognify` LLM tiap 90 dtk per (tenant, agent), dan 0,65 s per turn. Nilai marjinalnya **belum pernah diukur**. Eval ablasi (§9, F1) memutuskan: Postgres saja / graf saja / keduanya.
- Biaya per turn: embedding query ~1 panggilan kecil (harga: belum diverifikasi, orde sen/ribuan turn); `cognify` LLM adalah komponen biaya yang tidak terlihat di jalur turn dan harus dimasukkan ke ablasi.

## 9. Evaluasi dan rencana fase

### 9.1 Harness eval (dibangun di F1, dapat diulang)

- **Set kueri:** 80-120 kasus anonim: sebagian dari baris memori nyata yang **diparafrase dan dibersihkan dari PII** (EN + ID), sebagian sintetis; tiap kasus punya `expected_keys`. Kategori mengikuti LongMemEval: ekstraksi, multi-sesi, temporal, knowledge update, abstain.
- **Lengan:** A = Postgres hybrid saat ini; B = FTS saja; C = A + RRF; D = graf saja; E = A + graf (produksi); F = tanpa memori.
- **Metrik:** latensi p50/p90 per tahap, recall@5, MRR, token injeksi, biaya embedding + cognify per turn, kualitas jawaban (LLM-judge **dengan** sampel dinilai manusia 20%, karena cognee sendiri menyebut judge tak andal), kebocoran lintas tenant = 0 (assertion keras).
- **Pelaksanaan:** skema Postgres sementara dengan embedding pra-hitung (pola ADR-016 P0), tanpa menyentuh data prod; set kueri hanya berisi data anonim.

### 9.2 Fase (masing-masing dapat dikirim dan di-rollback sendiri)

| Fase | Isi | Perlu | Exit gate terukur | Rollback |
|---|---|---|---|---|
| **F0** | O1 instrumentasi + log tahap; kumpulkan 7 hari | Rust, biner baru **(basis harus fork BYOK `8a455bc`; rebase, jangan biner upstream)** | tiap turn punya embed_ms/pool_wait_ms/sql_ms/total; **ekor p90 >2 s teratribusi ke satu tahap** dengan bukti | pasang ulang biner sebelumnya (kolom/ tabel tak berubah) |
| **F1** | Eval harness + ablasi (§9.1) | repo + skrip, tanpa biner | baseline tercatat di ADR ini; arm E vs A vs D punya recall@5, MRR, kualitas, biaya | tidak ada (offline) |
| **F2** | O2 timeout fail-open (recall memori) + O3 cache embedding + O11 | Rust (+ config `recall_timeout_ms`) | p90 pra-LLM ≤ 2,5 s dan **maks ≤ 5 s** pada replay beban 6 paralel; recall@5 tidak turun > 2 poin vs baseline; 0 kebocoran tenant | flag config per fitur; biner lama |
| **F3** | Putusan graf dari F1: pertahankan / on-demand (O10, **config saja**) / buang | config atau ADR lanjutan | skor kualitas arm tanpa graf ≥ arm E − 2 poin **atau** graf terbukti menambah ≥ 5 poin pada kategori relasional | kembalikan `auto_recall=true` (config) |
| **F4** | O4 embedding paralel dengan setup MCP; O6/O7 bila F1 mendukung | Rust | median pra-LLM turun ≥ 0,4 s; kualitas tidak turun | flag |
| **F5** (opsional) | O5 embedding lokal | Rust + migrasi + model | hanya bila F0 menunjukkan embedding API menyumbang ekor; recall@5 ID ≥ baseline | embedding 768 lama disimpan di kolom paralel; sakelar config |

Yang cukup **config saja**: O10, O11 (dan penurunan batas graf). Butuh Rust: O1-O4, O6, O7. Butuh biner baru: semuanya yang Rust; ingat daemon prod berjalan dari `/usr/local/bin/zeroclaw-fork-8a455bc` (fork BYOK), jadi setiap perubahan harus dibangun di atas fork itu.

### 9.3 Fitur "canggih" (konsolidasi, forgetting, graf temporal): sengaja ditunda

Tidak ada bukti bahwa pada korpus 1,6k baris hal ini menambah nilai. Syarat masuk: (a) F1 menunjukkan kategori knowledge-update/temporal sebagai titik lemah; (b) rancangan konsolidasi mengikuti pola Nakama (usulan, bukan penulisan otomatis) agar tidak menimpa fakta benar. ADR-016 P1-P4 (importance, supersede, RRF, decay per kategori) tetap berlaku dan tidak digantikan dokumen ini.

## 10. Risiko isolasi tenant (ADR-002)

| Opsi | Risiko | Mitigasi |
|---|---|---|
| O3 cache embedding | kunci cache mencampur teks; embedding query bukan data tenant, tetapi **cache hasil recall** akan bocor lintas agent | cache **hanya vektor query**, tidak pernah hasil recall; uji: dua tenant, query sama, hasil recall berbeda |
| O2 fail-open | turn tanpa memori bukan kebocoran, tetapi jangan fallback ke recall tanpa filter agent | fallback tetap lewat `recall_for_agents` dengan `agent_id = ANY` |
| O6/O7 (SQL baru) | mengubah klausa `WHERE`; salah ubah = kebocoran | wajib uji "wrong-tenant leak = 0" (ADR-016 P0) di CI |
| O5 embedding lokal | re-embed menyentuh seluruh baris | batch per agent, verifikasi jumlah baris per agent sebelum/sesudah |
| O10 graf off | tidak mengancam | - |
| Sistem pihak ketiga (Mem0/Zep/Letta) | menyimpan memori di layanan/skema bersama; kontrol scope `t_<user>.<agent_type>` harus dipetakan ulang | **diluar opsi yang direkomendasikan** |
| Eval | data tenant nyata di set uji | anonimkan; set uji tidak memuat identitas, kunci, atau alias nyata |

## 11. Klaim yang belum terverifikasi

1. Semua angka Mem0, Zep, Letta, cognee (§7) adalah hasil penulis/vendor; angka Mem0 pada tabel saya ambil dari ringkasan model atas paper dan **harus dicek ke paper** sebelum dikutip.
2. Penyebab ekor p90 4,2 s / maks 25 s: hipotesis (starvasi tokio di 4 vCPU, antrean pool r2d2/thread, UPDATE `touch_accessed`, jaringan) **belum dibuktikan**; hanya terbukti **bukan** embedding (burst terukur) dan **bukan** query SQL (≤107 ms).
3. Proksi Landlock-ke-shadow-eval memuat perakitan MCP; waktu recall sebenarnya lebih kecil dari angka itu.
4. K4 (tak ada timeout HTTP embedding) dari kode; apakah builder proxy menambah timeout belum dibaca.
5. Estimasi embedding lokal 10-50 ms dan kualitas `multilingual-e5-small` untuk Indonesia: **belum diukur**; sumber hanya melaporkan kuantisasi 26-54% lebih cepat dan tidak menguji bahasa Indonesia (Elastic model card).
6. Hit rate cache embedding dan FTS-first: belum diketahui.
7. Harga embedding OpenRouter/OpenAI: belum diverifikasi.
8. Ukuran blok graf yang disuntik dan nilai marjinalnya terhadap jawaban: belum diukur.
9. Rincian Hermes/OpenClaw dari dokumentasi dan mirror/blog; versi saat ini belum dicek ke kode sumber.

## 12. Cara mengulang pengukuran (read-only)

- Trace: `sudo -n python3 -I -` dengan skrip dari stdin yang membaca `runtime-trace*.jsonl` (event `memory_inject shadow eval`, `cerveau: graph sidecar call`, `Landlock sandbox enabled`).
- Query: `docker exec avry-postgres psql` dengan kredensial dibaca server-side dari config dalam skrip yang tidak mencetaknya; `BEGIN READ ONLY; EXPLAIN (ANALYZE, TIMING OFF) <query hybrid>; ROLLBACK;`.
- Embedding: 12 panggilan urut + 4 putaran x 6 paralel ke endpoint embedding dengan kunci dari config (server-side).
- **Insiden kecil selama riset:** satu dump struktur config mencetak string koneksi Postgres karena kunci bersarang (`storage.postgres.default.db_url`) lolos dari filter nama. Nilainya tidak dipakai di dokumen ini; **disarankan merotasi password DB `aivory`** karena sempat muncul di transkrip sesi riset.

## 14. Jalur cognee: stabil dulu, canggih kemudian

### 14.1 Bukti (read-only, 2026-11-25)

| Hal | Temuan | Sumber |
|---|---|---|
| Stack cognee | `cerveau-server` (fork `cognee-rs`, branch `cerveau-main`) di systemd :3200; `VECTOR_DB_PROVIDER=pgvector`, `GRAPH_DATABASE_PROVIDER=postgres` ke DB `aivory` (schema `cognee,identity`); embedding 1536 dim via OpenRouter; LLM ekstraksi `deepseek-v4-flash`; `COGNEE_FORCE_BACKGROUND_COGNIFY`, batch 10, ingest gate mode `shadow` | `/etc/cognee-cerveau.env` (nilai rahasia diredaksi) |
| Relasional | masih SQLite: thread `sqlx-sqlite-worker` pada snapshot hang, dan 190 MB di `~/.cognee-cerveau` (isi tidak diperiksa) | snapshot watchdog, `du` |
| Akar hang | snapshot 22 Nov (gdb): 4 worker tokio semua terblokir di `Mutex::lock_contended` pada `Mutex<HashSet<Uuid>>`, dari `DatasetRunGuard::acquire -> then_some -> drop`. `then_some` membangun guard secara eager; saat dataset sedang berjalan guard dibuang saat `acquire` masih memegang mutex, `Drop` mengunci lagi: self-deadlock pada `std::Mutex`. Semua cognify berikutnya antre di belakangnya sampai server berhenti menjawab, sementara kernel tetap menerima koneksi (Recv-Q naik) | `/var/lib/aivory/cognee-watchdog/hang-20261122T164506.txt`; kode `crates/http-server/src/routers/cognify.rs`; fix `4a60eff` (merge `569240c`, 22 Nov 09:12 UTC) |
| Cakupan bukti | hanya snapshot 22 Nov yang saya bedah; snapshot 17 Nov dan hang 3-11 Okt (sebab "unknown" di insiden) **belum diperiksa**, kemungkinan sama tetapi belum terbukti | - |
| Setelah fix | `NRestarts=0`, aktif sejak 22 Nov 17:21 CST (3 hari), tanpa baris ERROR di journal sejak 1 Nov | `systemctl show`, `journalctl` |
| Recall graf sebelum/sesudah fix | sebelum n=186: ok 78%, empty 10%, timeout 8%, http_error 3%; sesudah n=80: ok 81%, empty 10%, **timeout 7,5%**, http_error 1,3%; p50 663 -> 713 ms, p90 1,28 -> 1,46 s | trace `graph sidecar call` |
| Kualitas graf | log WARNING `Skipping edge: target node ... not found in extracted nodes` (edge yatim dari ekstraksi LLM); 2 peringatan `tool-call request failed; falling back to legacy function/JSON mode` | journal cognee |
| Ingest gate | mode `shadow`: yang saya lihat semua `would_drop=false`; log memuat `tenant=` kosong dan `dataset=cerveau_graph`: **perlu dipastikan isolasi per tenant** (belum diverifikasi) | journal cognee |
| Komponen sisa | container Python `cognee/cognee:latest` (`:8000`) up 7 hari, peran saat ini tidak diverifikasi | `docker ps` |
| Duplikasi kerja | satu query di-embed dua kali per turn: memori Cerveau (768 dim) dan cognee (1536 dim), keduanya ke OpenRouter | config kedua sisi |

Koreksi atas jawaban saya sebelumnya: saran "taruh cognee-rs di atas Postgres" sebagian **sudah terlaksana** (ADR-007): vektor dan graf sudah di Postgres. Yang belum: relasional (SQLite) dan konsolidasi ke satu penyimpanan terdokumentasi.

### 14.2 Rencana cognee (paralel dengan §9, tiap langkah bisa di-rollback sendiri)

| Fase | Isi | Perlu | Exit gate terukur | Rollback |
|---|---|---|---|---|
| **C0** | Konfirmasi fix bertahan; periksa snapshot 17 Nov dan 3-11 Okt untuk tanda tangan yang sama; audit semua `std::sync::Mutex` di `http-server` (guard yang dipegang melewati `drop` atau `.await`); tambah uji lock-order | baca kode + PR kecil di fork | 14 hari tanpa hang dan `restarts` watchdog = 0; audit tercatat | tidak ada (baca) |
| **C1** | Instrumentasi recall cognee per tahap (embed, pgvector, ekspansi graf, total) dan log `outcome` terperinci | Rust di fork, biner baru | 7 hari data; timeout 7,5% teratribusi ke satu tahap | biner lama |
| **C2** | Satu embedding per turn: Cerveau menyelaraskan dimensi (768 via Matryoshka) dan meneruskan vektor query ke cognee, atau sebaliknya | perubahan API cognee + **re-embed vektor cognee** | timeout recall graf < 3%; satu panggilan embedding per turn | flag; vektor lama dipertahankan di kolom paralel |
| **C3** | Relasional SQLite -> Postgres (SeaORM) | migrasi di fork | satu backup untuk semuanya; uji isolasi dan latensi tidak memburuk | pertahankan file SQLite lama |
| **C4** | Kualitas graf: buang edge yatim, nilai ingest gate (shadow -> enforce hanya bila eval F1 mendukung), evaluasi model ekstraksi | config + eval | eval F1: arm dengan graf unggul >= 5 poin pada kategori relasional/ multi-sesi, atau graf dipensiunkan | gate kembali ke `shadow` |
| **C5** | "Lebih canggih": fakta temporal (valid_at/invalid_at gaya Zep) **hanya bila** F1 menunjukkan kelemahan temporal/knowledge-update; kemampuan temporal cognee-rs belum diverifikasi | ADR lanjutan | ditentukan setelah F1 | - |

SLO usulan untuk sidecar: tidak ada hang > 3 menit (watchdog sudah memulihkan), `recall_context` p90 < 1 s dan timeout < 3%, error HTTP < 1%.

### 14.3 Risiko isolasi untuk jalur cognee
Graf bersama di schema `cognee` memakai `tenant_id`/dataset; log menunjukkan `tenant=` kosong pada ingest gate. Sebelum C2/C3/C4: uji "wrong-tenant leak = 0" pada recall graf (dua tenant, entitas bernama sama), dan konfirmasi dataset benar-benar per tenant. Re-embed atau migrasi relasional harus dikerjakan per tenant dengan verifikasi jumlah baris.

## 13. Sumber

- Mem0: https://arxiv.org/abs/2504.19413 · independen: https://arxiv.org/html/2603.04814
- Zep: https://arxiv.org/html/2501.13956 · https://blog.getzep.com/zep-a-temporal-knowledge-graph-architecture-for-agent-memory
- Letta: https://www.letta.com/blog/benchmarking-ai-agent-memory
- cognee: https://www.cognee.ai/knowledge-graph-memory-benchmarks
- LongMemEval: https://arxiv.org/abs/2410.10813 · stabilitas/plastisitas: https://arxiv.org/pdf/2609.30558
- Hermes: https://hermes-agent.nousresearch.com/docs/user-guide/features/memory
- OpenClaw (mirror docs): https://cdn.jsdelivr.net/npm/activeclaw@2026.4.9/docs/concepts/memory.md
- Nakama: https://ahmadrosid.github.io/nakama/org-memory · https://ahmadrosid.github.io/nakama/profiles · https://github.com/ahmadrosid/nakama
- fastembed: https://docs.rs/crate/fastembed/5.17.1/source/README.md · e5-small kuantisasi: https://huggingface.co/elastic/multilingual-e5-small-optimized
- pgvector HNSW/IVFFlat (pihak ketiga): https://supabase.com/docs/guides/ai/vector-indexes/hnsw-indexes · https://docs.digitalocean.com/products/vector-databases/postgresql/concepts/vector-search/
- Kode: `services/AVRY-Cerveau/crates/zeroclaw-runtime/src/agent/memory_inject.rs`, `.../agent/turn/mod.rs`, `zeroclaw-memory/src/{postgres,retrieval,embeddings,lib}.rs`, `zeroclaw-tools/src/graph_memory.rs`
