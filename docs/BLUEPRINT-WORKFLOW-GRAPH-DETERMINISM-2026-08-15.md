# Blueprint → n8n Workflow: Graph-Semantics & Branch-Detection Fixes (2026-08-12 → 2026-08-15)

**Status:** ALL FIXES SHIPPED & DEPLOYED (dashboard commits `2122ad0`, `2803735`, `bf96a4c` on 2026-08-12, `7bfa64d` on 2026-08-15, all on `Aivory-hub88/avry-user-dashboard` main; VPS container `avry-user-dashboard` rebuilt + restarted, smoke-tested live after each round).
**Trigger:** two separate rounds of user bug reports against the "Generate Workflow" feature on the Blueprint page — (1) a detailed structural bug report against a live-generated "Otomasi Onboarding Pelanggan" workflow, and (2) six screenshots of live-generated canvases showing completely flat, unbranched workflows for blueprints that clearly implied decision/exception logic.
**Repo touched:** `Aivory-hub88/avry-user-dashboard` — `lib/workflows/blueprintPlanner.ts`, `lib/workflowConverter.ts`, `app/api/console/workflows/from-blueprint/route.ts`, `components/workflow/WorkflowCanvas.tsx`, `app/workflows/page.tsx`, `hooks/useWorkflows.ts`, `app/blueprint/page.tsx`.
**Owner:** Irfan · **Created:** 2026-08-15

---

## TL;DR (Bahasa Indonesia)

Fitur "Generate Workflow" (Blueprint → grafik n8n) punya dua lapis masalah
berbeda, diperbaiki dalam dua putaran:

1. **Putaran 1 (12 Agustus):** grafik n8n yang dihasilkan salah secara
   struktural — kondisi TRUE/FALSE pada exception gate terbalik, cabang
   "sukses" tidak tersambung ke mana pun (dead end), jalur exception malah
   otomatis lanjut ke eksekusi normal alih-alih berhenti untuk human review,
   dan ada node `Limit` yang muncul begitu saja padahal tidak diminta blueprint.
   Semua diperbaiki + ditambah 2 lapis validator baru (`validatePlannedWorkflow`
   diperluas, `validateN8nGraph` baru) yang secara aktif mendeteksi kelas bug
   ini di masa depan.

2. **Putaran 2 (15 Agustus):** setelah putaran 1 di-deploy, user mengirim
   screenshot yang menunjukkan regresi baru — dua blueprint (bahasa Inggris)
   yang jelas-jelas menyiratkan titik keputusan/eskalasi malah menghasilkan
   grafik **datar total**, tanpa satu pun node IF/switch. Root cause: deteksi
   cabang/exception di planner hanya bergantung pada field `type` yang
   dikirim blueprint-generation LLM (sistem terpisah), dan LLM itu sering
   memberi label generik (`execution`) pada step yang teksnya jelas berarti
   "escalate to a human" atau "approve exceptions". Kalau labelnya meleset,
   SELURUH mesin deteksi cabang dilewati begitu saja. Diperbaiki dengan
   membuat pembacaan teks step jadi sinyal utama (bukan lagi bergantung penuh
   pada label `type` dari LLM lain), dengan pengamanan supaya tidak salah
   tangkap pola lain yang sudah ada (step notifikasi biasa, pola
   track-progress-dan-escalate-delay).

Total 7 test regresi baru ditambahkan untuk skenario spesifik ini, penuh
suite `npx vitest run` sekarang **182/182 lulus**, sudah di-deploy dan
diverifikasi live di VPS.

---

## 0. Architecture context — two independent systems, one deterministic

Penting untuk dipahami sebelum membaca bug-bug di bawah: ada **dua sistem
LLM yang terpisah** di jalur ini, dan hanya satu yang non-deterministik:

- **Upstream — `lib/blueprintGeneration.ts`.** Memanggil LLM untuk membuat
  JSON Blueprint bisnis (`steps[].type`, salah satu dari enum 6 nilai:
  `ingestion`/`ai_processing`/`decision`/`execution`/`human_review`/
  `notification`). Prompt hanya memberi panduan ringan soal enum ini — LLM
  bebas memilih label mana pun yang "masuk akal" untuknya.
- **Downstream — `lib/workflows/blueprintPlanner.ts` → `nodeMapper.ts` →
  `lib/workflowConverter.ts`.** 100% deterministik, regex/keyword-driven,
  **tidak ada panggilan LLM sama sekali** untuk struktur graf atau pemilihan
  tipe node. Inilah lapisan yang semua bug di dokumen ini menyangkut.
- **Advisory, terpisah lagi — `lib/workflows/blueprintLlmValidator.ts`**
  (`llmSemanticReview()`). Lapisan audit pihak ketiga yang murni memberi
  saran/warning, tidak pernah mengubah graf, dan gagal-terbuka (fail-open)
  kalau bridge-nya tidak tersedia.

Screenshot regresi di putaran 2 sempat diduga user disebabkan oleh "LLM yang
merusak hasil deterministik" — investigasi git history + code reading
membuktikan `planned.steps` **tidak pernah** dimutasi oleh panggilan
LLM/sandbox mana pun; bug sesungguhnya murni ada di lapisan deterministik
(§2 di bawah), akibat lapisan itu terlalu percaya pada label `type` dari
sistem upstream yang non-deterministik.

---

## 1. Putaran 1 — bug struktural di graf (2026-08-12)

**Commits:** `2803735` (fix inti), `bf96a4c` (+7 aturan validator tambahan).
**Blueprint uji:** "Otomasi Onboarding Pelanggan" — 6 langkah bahasa
Indonesia, integrasi CRM/Customer Communication/Scheduling, dilaporkan
lengkap dengan diagram graf yang diharapkan.

### 1.1 Kondisi TRUE/FALSE pada exception gate terbalik

**File:** [`lib/workflows/blueprintPlanner.ts`](../frontend/avry-user-dashboard/lib/workflows/blueprintPlanner.ts) — `buildExceptionGate()`

**Root cause:** `n8n-nodes-base.if` punya konvensi output tetap — index 0 =
TRUE, index 1 = FALSE. `buildExceptionGate()` menaruh cabang `incomplete`
(data tidak lengkap) di index 0 dan `complete` di index 1 — persis
terbalik. Hasilnya: kalau data **lengkap**, workflow malah masuk ke jalur
exception; kalau **tidak lengkap**, malah lanjut seolah normal.

**Fix:** urutan array `branches` ditukar — `complete` sekarang index 0
(TRUE, cabang kosong/lanjut normal), `incomplete` index 1 (FALSE, cabang
exception).

### 1.2 Cabang kosong (jalur "sukses") tidak tersambung ke mana pun

**File:** [`lib/workflowConverter.ts`](../frontend/avry-user-dashboard/lib/workflowConverter.ts) — loop pewiring cabang di `convertSteps()`

**Root cause:** loop lama langsung `return` untuk cabang tanpa langkah
(`if (!branch.steps.length) return`) — sama sekali tidak membuat koneksi
apa pun, bahkan ke node join. Akibatnya cabang "data lengkap" (dan kedua
output switch node routing) di graf n8n yang sebenarnya **tidak punya
output sama sekali** — dead end total, apa pun jalur yang dieksekusi n8n
saat runtime.

**Fix:** cabang kosong non-terminal sekarang disambungkan langsung ke node
join.

### 1.3 Jalur exception otomatis lanjut ke eksekusi normal

**File:** `lib/workflowConverter.ts`, `lib/workflows/blueprintPlanner.ts`

**Root cause:** tidak ada konsep "cabang terminal" sama sekali — setiap
cabang yang punya langkah (termasuk review/exception) selalu disambungkan
balik ke node join dan lanjut ke alur normal. Karena sistem wait/resume
belum didukung penuh, ini artinya kasus exception "diam-diam" lanjut
seakan sudah diselesaikan.

**Fix:** field baru `terminal?: boolean` di `PlannedStepBranch`/
`WorkflowStep.branches`. Cabang `incomplete` pada exception gate sekarang
`terminal: true` — langkah-langkahnya tetap dibangun dan disambung satu
sama lain, tapi ekornya sengaja **tidak** disambung balik ke join. Alurnya
jadi: tandai kasus → minta info tambahan dari requester → tunggu resolusi
manusia, lalu berhenti eksplisit di situ.

### 1.4 Node `Limit` yang tidak diminta blueprint

**File:** `lib/workflowConverter.ts`, dipicu dari `app/api/console/workflows/from-blueprint/route.ts`

**Root cause:** heuristik lama otomatis menyisipkan node
`n8n-nodes-base.limit` setiap kali sebuah step punya intent
`MULTI_ITEM_INTENTS` — berguna untuk mode lain, tapi untuk graf hasil
blueprint planner ini adalah node yang diciptakan sendiri, tidak diminta.

**Fix:** flag baru `skipAutoLimit?: boolean` pada `AivoryWorkflow`, di-set
`true` khusus di titik panggilan blueprint-sourced (`from-blueprint/route.ts`).

### 1.5 Dua lapis validator baru

- **`validatePlannedWorkflow()`** (diperluas) — sekarang mendeteksi: kondisi
  `Data complete?` duplikat, inversi TRUE→exception, cabang exception yang
  tidak `terminal`, business action yang "terdampar" di cabang terminal.
- **`validateN8nGraph()`** (baru, ekspor baru) — bekerja langsung di atas
  JSON n8n hasil akhir: error untuk node `Limit` yang diciptakan sendiri,
  error untuk node tanpa koneksi masuk (kecuali trigger/sub-node LLM
  chat-model), warning untuk node tanpa koneksi keluar (kecuali
  `wait`/`respondToWebhook`). Dipanggil sebagai "Stage 8b" di
  `from-blueprint/route.ts`, jalan tanpa syarat (cepat, lokal, tanpa
  network) bahkan saat validator tree-level di atas sudah menemukan error.

### 1.6 Regression test permanen

Semua 8 skenario di atas dikodifikasi di
[`lib/workflows/blueprintPlanner.graphSemantics.test.ts`](../frontend/avry-user-dashboard/lib/workflows/blueprintPlanner.graphSemantics.test.ts),
persis memakai blueprint "Otomasi Onboarding Pelanggan" dari laporan bug
sebagai kasus uji utama, plus test khusus untuk masing-masing 8 aturan
deteksi baru di `validateN8nGraph`.

---

## 2. Putaran 2 — deteksi cabang jangan bergantung pada label `type` upstream (2026-08-15)

**Commit:** `7bfa64d`.
**Trigger:** screenshot 6 canvas n8n live — dua blueprint bahasa Inggris
("Support Ticket Triage" dan sejenis "Customer Onboarding Automation") yang
jelas menyiratkan titik keputusan ("escalate complex ones to a human",
"approve exceptions") tapi hasil generate-nya **rantai linier datar tanpa
satu pun IF/switch node** — persis gejala yang sebelumnya dilaporkan sudah
diperbaiki di putaran 1, tapi muncul lagi di blueprint lain.

### 2.1 Root cause

**File:** [`lib/workflows/blueprintPlanner.ts`](../frontend/avry-user-dashboard/lib/workflows/blueprintPlanner.ts) — `buildPlannedSteps()`, deteksi `reviewIndices`/`outcomePairs`

Sebelum fix, SEMUA mesin deteksi cabang/exception (`buildExceptionGate`,
pasangan outcome routine/complex, alur approval) hanya aktif kalau field
`step.type` dari blueprint **persis** cocok — `'human_review'` untuk gate
dasar, atau pasangan `'execution'` diikuti `'human_review'` untuk outcome
pair. Field `type` ini datang dari LLM upstream yang terpisah
(`lib/blueprintGeneration.ts`, lihat §0) dengan panduan yang ringan — teks
"Escalate complex ones to a human" atau "Approve exceptions" sama-sama
wajar dilabeli `execution` biasa oleh model itu, dan secara empiris memang
sering begitu. Begitu labelnya meleset, **seluruh** mesin deteksi cabang di
bawahnya dilewati sepenuhnya — step itu jatuh ke node action datar biasa,
menghasilkan persis gejala di screenshot: rantai linier tanpa cabang sama
sekali.

Dibuktikan secara empiris lewat scratch test: teks yang identik
menghasilkan struktur graf yang berbeda semata-mata berdasarkan label
`type`-nya berubah dari `human_review` ke `execution`.

### 2.2 Fix — `isHumanReviewLike()`, teks sebagai sinyal utama

```ts
function isHumanReviewLike(step: BlueprintStepInput): boolean {
  if (step.type === 'human_review') return true
  if (step.type === 'ingestion' || step.type === 'ai_processing' || step.type === 'decision') return false
  const text = step.action
  // review/approve/tinjau tidak ambigu — step berteks begitu MEMANG aksi
  // review/approval, titik.
  if (/\btinjau|meninjau|peninjauan|review\b|approv|persetujuan\b/i.test(text)) return true
  // "escalat" saja TIDAK cukup jelas. Kecualikan dua kasus yang sudah
  // dimiliki pola lain yang lebih spesifik: (a) step notifikasi biasa yang
  // menyebut eskalasi sebagai kata benda ("notify the team about
  // escalations"), bukan aksi eskalasi itu sendiri; (b) step
  // track/monitor+escalate-delay, yang buildTrackEscalateSemantic()
  // dekomposisi sendiri dengan struktur observe→evaluate→IF-delayed
  // →escalate yang lebih presisi — pola itu harus dapat prioritas duluan,
  // tidak boleh direbut di sini.
  if (!/\bescalat/i.test(text)) return false
  if (COMMUNICATION_KEYWORDS.test(text)) return false
  if (TRACK_MONITOR_RE.test(text) || DELAY_OVERDUE_RE.test(text)) return false
  return true
}
```

`type` sekarang cuma sinyal fallback/penguat — bukan gerbang keras.
Dipakai baik untuk `reviewIndices` (exception gate dasar) maupun deteksi
`outcomePairs` (pasangan routine/complex) di `buildPlannedSteps()`.

### 2.3 Dua regresi yang ditemukan-dan-diperbaiki sendiri selama proses ini

1. **False positive "escalations" sebagai kata benda** — versi awal
   `isHumanReviewLike()` mencocokkan `/\bescalat/i` terlalu lebar, menangkap
   "Notify the relevant team member on escalations" (step notifikasi biasa)
   seakan itu aksi review/eskalasi. Menghasilkan exception gate duplikat
   palsu. Diperbaiki dengan syarat tambahan `!COMMUNICATION_KEYWORDS.test(text)`.
2. **Bentrok dengan pola track/monitor+escalate-delay** — setelah fix #1,
   full suite (`npx vitest run`) memunculkan 6 test baru gagal, semuanya di
   `blueprintPlanner.semantic.test.ts` untuk pola "Track progress and
   escalate delays". Pola itu juga mengandung kata "escalat" dan lolos dari
   filter komunikasi, jadi direbut duluan oleh `isHumanReviewLike()` sebelum
   `buildSemanticSteps()` (yang menangani pola ini lebih presisi:
   observe→evaluate SLA→IF delayed→escalate) sempat jalan. Diperbaiki dengan
   syarat tambahan `!TRACK_MONITOR_RE.test(text) && !DELAY_OVERDUE_RE.test(text)`.

Setelah kedua fix ini, full suite kembali hijau 100% — bukti langsung bahwa
perbaikan tidak merusak pola-pola lain yang sudah ada.

### 2.4 Regression test permanen

[`lib/workflows/blueprintPlanner.typeRobustness.test.ts`](../frontend/avry-user-dashboard/lib/workflows/blueprintPlanner.typeRobustness.test.ts)
(baru, 7 test):

- Kedua skenario live dari screenshot (`Support Ticket Triage`,
  `Customer Onboarding Automation`) dengan step eskalasi/approval
  sengaja diberi `type: 'execution'` — harus tetap menghasilkan cabang,
  bukan rantai datar.
- Notifikasi yang menyebut "escalations" sebagai kata benda tetap jadi
  step komunikasi biasa, bukan exception gate palsu (guard §2.3.1).
- Pola "Track progress and escalate delays" tetap lewat
  `buildTrackEscalateSemantic()`, bukan gerbang exception generik
  (guard §2.3.2).
- Baseline: kalau `type` upstream memang sudah akurat (`human_review`),
  hasilnya identik dengan versi yang salah-tipe — fix ini tidak mengubah
  perilaku saat label upstream sudah benar.

---

## 3. Verifikasi & deploy

- `npx vitest run` (seluruh suite dashboard) → **182/182 lulus** (175 dari
  putaran 1 + 7 baru putaran 2), nol regresi di kedua putaran.
- `npx eslint` pada semua file yang diubah → bersih.
- `npx tsc --noEmit -p tsconfig.json` → hanya 2 error pra-existing yang
  tidak terkait perubahan ini (`app/integrations/callback/route.ts`,
  `next.config.ts`), sama seperti sebelum kedua putaran fix.
- Deploy VPS (putaran 2, `7bfa64d`): push ke `aivory-hub/main` → pull
  fast-forward bersih di `/home/ubuntu/avry-user-dashboard` (symlink dari
  `AVRY-V2-Main/frontend/avry-user-dashboard`) → `docker compose -f
  docker-compose.prod.yml build avry-user-dashboard` → `up -d` → container
  `Up`/`Ready` → smoke test langsung ke
  `POST /dashboard/api/console/workflows/from-blueprint` dengan step
  eskalasi bertipe `execution` → **200 OK**, membuktikan fix aktif live.

---

## 4. Kenapa ini penting (ringkas)

Sebelum putaran 1, graf yang dihasilkan **terlihat** bercabang tapi secara
struktural rusak (TRUE/FALSE terbalik, dead end, exception yang diam-diam
lanjut) — user tidak akan sadar sampai workflow benar-benar dijalankan di
n8n dan berperilaku salah. Sebelum putaran 2, graf yang dihasilkan malah
**terlihat** benar (rantai linier rapi) tapi diam-diam kehilangan logika
keputusan/eskalasi yang blueprint aslinya minta — regresi yang lebih
berbahaya karena tidak ada error, cuma workflow yang "terlalu sederhana"
untuk kasus bisnis yang sebenarnya butuh cabang. Kedua kelas bug ini sekarang
punya lapisan pertahanan permanen (`validatePlannedWorkflow`,
`validateN8nGraph`, dan `isHumanReviewLike()` yang teks-dulu) plus 15 test
regresi gabungan yang mengunci skenario persis yang dilaporkan.
