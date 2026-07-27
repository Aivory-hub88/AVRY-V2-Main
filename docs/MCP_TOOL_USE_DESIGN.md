# Desain: Pemakaian MCP Tool di Workflow Copilot

Status: **usulan** (belum diimplementasikan)
Tanggal: 2026-07-26
Konteks: pre-launch

---

## 1. Kenapa dokumen ini ada

Percobaan langsung hari ini membuktikan bahwa **menyuruh LLM memakai tool MCP lewat instruksi prompt itu gagal**, dan gagalnya merusak jalur yang sebelumnya sehat. Dokumen ini merekam bukti kegagalannya lalu mengusulkan desain yang benar.

### Yang dicoba
Menambahkan instruksi ke prompt `workflow_*` di `buildZeroclawWebhookBody` (`vps-bridge/server.js`): "sebelum menulis JSON, panggil `search_nodes` untuk memverifikasi setiap integrasi".

### Yang terjadi (bukti)
| Percobaan | Hasil |
|---|---|
| Instruksi tool ditaruh **sebelum** schema JSON | Model membalas "no need to start with checks" lalu **mengajukan 6 pertanyaan klarifikasi** — melanggar kontrak "JSON saja" |
| Diurut ulang: schema → tool → aturan output di akhir | Model memanggil tool **berulang kali** (`get_node_types`, `get_sdk_reference`, `get_workflow_best_practices`), habis di iterasi ~8 dari batas 10, lalu **bercerita panjang** soal temuannya, bukan JSON |
| Riset dibatasi "maksimal SATU panggilan `search_nodes`" | Model malah **berhenti terlibat** — balas sapaan generik |

Akar masalahnya struktural, bukan kurang tuning:

1. **Anggaran iterasi vs kontrak output.** `max_tool_iterations = 10`. Riset node itu rakus — satu workflow 5 langkah butuh banyak lookup. Setelah anggaran habis, model tidak punya turn untuk mengeluarkan JSON.
2. **Dua tuan yang bertentangan.** "Panggil tool dan berpikir" itu mode agentic multi-turn. "Keluarkan hanya satu objek JSON, jangan bertanya" itu mode single-shot. Model `deepseek-v4-flash` tidak bisa melayani keduanya sekaligus dengan andal.
3. **Redundan.** Bridge **sudah** memanggil n8n-MCP secara deterministik lewat `n8nMcpClient.js` untuk resolusi node. Menyuruh LLM melakukannya lagi menduplikasi pekerjaan yang sudah dilakukan kode dengan lebih andal.

**Keputusan:** patch prompt sudah di-*revert*. Jalur generate kembali sehat dan terverifikasi.

---

## 2. Prinsip desain

> **Deterministik untuk yang bisa dipastikan. LLM hanya untuk yang butuh penilaian.**

Resolusi tipe node itu *lookup*, bukan penilaian — jangan diserahkan ke LLM. Yang butuh LLM: memahami maksud user, memilih bentuk workflow, menulis deskripsi langkah.

---

## 2b. Bukti pendukung: jalur deterministik SUDAH ada dan bekerja

Verifikasi terpisah (2026-07-26) membuktikan prinsip di atas bukan teori — pola ini **sudah jalan di produksi** pada langkah sandbox-test.

Rantai lengkap yang tervalidasi:
```
user bilang "ya/publish"  → handleConfirmation (intent: confirm)
  → runTests(1)           → bridge.draftTest()
  → /api/copilot/…        → bridge POST /workflows/draft-test
  → prepareWorkflowDraft  → n8nAsCodeServiceClient → n8n-as-code :3500
  → bikin workflow sandbox di n8n → strip credential → eksekusi nyata → hapus
```

Bukti dari panggilan nyata:
- `dummyTest.validationMode = "real_execution"`, `passed: true`, hasil per-node
- **`inspectionReport.source = "n8n_mcp"`** — resolusi node sudah dilakukan **secara deterministik oleh kode**, mis. `"Daily"` → `n8n-nodes-base.scheduleTrigger`
- Artefak draft nyata ditulis: `/opt/workflows-store/drafts/<id>.workflow.ts`

**Artinya:** infrastruktur untuk §3 sebagian besar sudah terpasang. `n8nMcpClient.js` sudah punya klien MCP + retry sesi, dan `inspectionReport` sudah membawa kandidat node hasil MCP. Yang usulan §3 lakukan hanyalah **memindahkan enrichment yang sama ke lebih awal** — ke titik pasca-generasi — supaya `step.app`/`step.action` sudah benar sebelum masuk canvas, bukan hanya saat sandbox-test.

## 3. Arsitektur yang diusulkan: verifikasi pasca-generasi di bridge

Biarkan LLM bekerja seperti sekarang (JSON dari pengetahuannya), lalu **bridge memverifikasi dan memperbaiki** hasilnya dengan MCP secara deterministik.

```
User request
   ↓
LLM (single-shot, tanpa tool)  →  workflow JSON  [seperti sekarang, tidak diubah]
   ↓
[BARU] Node Verification Pass (kode, di bridge)
   ├─ kumpulkan semua step.app yang unik
   ├─ SATU panggilan batch n8n-native__search_nodes { queries: [...] }
   ├─ untuk tiap app: petakan ke tipe node n8n yang nyata
   ├─ jika tak ada padanan → turunkan ke http generik + tandai
   └─ lampirkan `_resolvedNodeType` per step
   ↓
Canvas / deploy mapper  [sudah ada, kini dapat tipe node terverifikasi]
```

### Kenapa ini lebih baik
- **Kontrak output LLM tetap utuh** — tidak ada instruksi bersaing, tidak ada risiko regresi.
- **Biaya tetap**: satu panggilan MCP batch per generasi, bukan N panggilan tak tentu.
- **Bisa diuji tanpa LLM**: fungsi murni `steps[] → steps[]`, gampang di-unit-test.
- **Gagal dengan aman**: MCP mati → lewati verifikasi, pakai perilaku hari ini.
- **Menghapus tebakan** di `nodeMapper.ts`/`n8nMapper.ts` yang selama ini menebak dari kata kunci.

### Titik implementasi
| Berkas | Perubahan |
|---|---|
| `vps-bridge/n8nMcpClient.js` | Tambah `searchNodesBatch(queries[])` (klien MCP + retry sesi sudah ada) |
| `vps-bridge/server.js` | Setelah parse JSON di handler `workflow_generate`/`workflow_edit`, jalankan verification pass |
| `lib/workflows/nodeMapper.ts` | Pakai `_resolvedNodeType` bila ada; fallback ke heuristik lama |
| tes | Unit test verification pass dengan hasil MCP yang di-mock |

Referensi implementasi: logika enrichment yang mau dipakai **sudah ada** di jalur `prepareWorkflowDraft` (`vps-bridge/workflowDraftService.js`) yang menghasilkan `inspectionReport.steps[].candidates[].workflowNodeType`. Idealnya di-ekstrak jadi fungsi bersama, bukan ditulis dua kali.

---

## 4. Kalau memang mau LLM-driven (opsi jangka panjang)

Kalau nanti Copilot benar-benar perlu agentic tool-use (mis. self-repair workflow rumit), syaratnya:

1. **Pisahkan fase.** Turn 1 = riset (tool boleh, output prosa internal, tak pernah dilihat user). Turn 2 = generasi (tanpa tool, prompt bersih + ringkasan riset, kontrak JSON tak terganggu). Dua panggilan LLM, bukan satu.
2. **Anggaran tool eksplisit.** Naikkan `max_tool_iterations` untuk fase riset saja, dan hentikan paksa saat batas tercapai — jangan biarkan mengganggu fase output.
3. **Model yang lebih kuat.** `deepseek-v4-flash` terbukti tidak andal untuk tool-calling multi-langkah + kepatuhan format. Butuh model tier lebih tinggi khusus untuk brain ini.
4. **Routing agent dulu.** Semua trafik saat ini jalan sebagai `analyst_brain`, bukan `workflow_brain` (lihat memory `zeroclaw-mcp-and-agent-routing`). Tanpa ini, tuning per-brain tidak berlaku.

Urutan prasyaratnya: routing agent → model lebih kuat → pemisahan fase. Jangan dibalik.

---

## 5. Rekomendasi pre-launch

| Item | Aksi | Alasan |
|---|---|---|
| Verification pass (§3) | **Lakukan** — terkontrol, bisa diuji, gagal-aman | Manfaat nyata (tipe node benar), risiko rendah |
| LLM-driven tool use (§4) | **Tunda** ke pasca-launch | Butuh ganti model + perbaikan routing; terlalu besar untuk sekarang |
| MCP tetap terpasang | **Ya** | Sudah tersambung & tervalidasi; dipakai jalur deterministik dan tersedia untuk saya saat debugging |

---

## Lampiran: kondisi terverifikasi hari ini

- `n8n-native` MCP tersambung ke zeroclaw — 28 tool, ditemukan lewat `tool_search` (`deferred_loading = true`)
- Eksekusi tool nyata terbukti: `n8n-native__get_node_types` → definisi TypeScript asli n8n, 43ms
- Bug `tools-registry.js` (`workflowgenerate` vs `workflow`) diperbaiki — sebelumnya SEMUA panggilan workflow dapat daftar tool palsu
- Approval gate diperbaiki di `agent_analyst_brain` (profil yang benar-benar jalan); tool destruktif tetap butuh approval
- Kebocoran memory antar-percakapan ditutup (`auto_hydrate = false`, `auto_save = false`)
- Jalur generate diverifikasi sehat setelah revert (JSON sesuai schema, bahasa Indonesia & Inggris)
