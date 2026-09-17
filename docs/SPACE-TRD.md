# Team Space — TRD (Technical Requirements Document)

**Date:** 2026-09-17
**Status:** Draft — menunggu persetujuan
**Related:** [SPACE-SCOPE](./SPACE-SCOPE.md) · [SPACE-PRD](./SPACE-PRD.md) · [SPACE-PLAN](./SPACE-PLAN.md)

---

## 0. Dasar research (apa yang sudah diverifikasi sebelum menulis TRD ini)

**Rowboat/Harbor** (clone `rowboatlabs/rowboat`, dibaca langsung):
- `apps/harbor/packages/protocol/src/`: `mcp.ts` (30 tools, `reason` wajib di MCP face),
  `changeset.ts` (`applied/merged/conflict` + `regions`, `reason` + `threadRootId`),
  `mentions.ts` (token grammar `[@N](#member:id)`/`[@here](#here)`/`[@rowboat](#rowboat)`/`[#S](#space:id)`,
  stamp sekali di org — catatan: fixed address `#rowboat` milik Rowboat dipetakan ke
  **per-agent address** di Aivory, satu per agent: `[@Lex](#agent:leads_qualifier)`,
  `[@Geno](#agent:autonomous)`, `[@Finn](#agent:finance_invoice_ops)`,
  `[@Aira](#agent:chief_of_staff)`, `[@Teo](#agent:customer_service)`,
  `[@Ofira](#agent:office_assistant)` — label dari `AGENT_ROSTER`, id = `agent_type`)
  stamp sekali di org, code region = kutipan), `events.ts` (flat thread `threadRoot`,
  topic = annotation row, presence `viewing/typing/agent_working/agent_idle/idle`,
  frame ephemeral `read_mark`/`notify`/`space_added`), `search.ts` (3 kategori + truncated),
  `core.ts` (`Attribution{memberId, actingMode, agentName}`, content plane role-flat),
  `api.ts` (render face).
- `packages/server/src/`: `service.ts` (one core, REST+MCP proyeksi tipis, no privileged path),
  `merge.ts` (three-way base/current/proposed, 6 fixture emas), `mcp.ts` (stateless per-request,
  `x-acting-mode`/`x-agent-name`), `ws.ts` (satu WS per org, `afterOffset` replay, ping 25s,
  backpressure drop), `http.ts` (contract validation dua arah).
- Keputusan yang diadopsi: activity = query bukan tabel; conflict = outcome bukan error;
  agent = member (attribution = cara). Yang **ditolak**: ganti Yjs dengan merge3,
  fork Harbor Node, whiteboard relay, blob S3 (lihat SCOPE §4).

**Aivory existing** (semua path terverifikasi di repo):
- Rust `services/collab/src/main.rs` (780 baris, axum 0.7 + `yrs 0.17` + DashMap + sqlx):
  room `workspace:{id}`, JWT HS256 + `COLLAB_SERVICE_TOKEN`, `X-Agent-Type` hanya dipercaya
  dari service, viewer update di-drop server-side, lazy-load pg + flush debounce 300ms,
  `PUT /api/workspace/:id/doc` octet-stream. → **Tetap otoritas realtime, content-blind.**
- Dashboard API: `app/api/workspace/**` — `workspaceCredential`/`checkAgentAccess`/
  `canReadDocId` (`lib/workspaceAccess.ts`), `loadDbDoc`/`saveDbDoc` (`lib/workspaceDb.ts`),
  board aggregate (`app/api/workspace/projects/[id]/board/route.ts`, cap 20×200),
  notifications (`.../notifications/route.ts`), search (`.../search/route.ts`).
  Agent Python hanya masuk via header `x-service-token + X-Agent-Type` → scoped ke
  `dashboard.workspace_agent_acl`. Pola ini sudah dipakai `database/route.ts`
  (`transact(..., agentType)` + `origin` + `actorName`).
- Console: `MissionControl.tsx` (kartu + status line + badge `bg-amber/15`),
  `AgentRail.tsx` + `NotificationCard.tsx` (kartu netral, warna di glyph:
  error `#FF453A`, warn `#FF9F0A`, info `#0A84FF`; actions di balik divider),
  `AgentAvatar.tsx` (portrait per agent), `useWorkspaceAwareness`, office shell grid push.
- Token UI: `styles/globals.css` @theme — surface `#18181b/#27272a/#3f3f46/#101013`,
  line `rgba(255,255,255,.06)`, radius 12/16/20, accent sage `#b7cba6`/on-accent `#1a1a18`,
  amber `#d9ab6e/#e8b96a/#e8c088`, font Manrope. Aturan: teks = `span`/`div` saja.

## 1. Arsitektur (tidak ada service baru)

```
Browser (Next.js) ──REST /api/workspace/*──┐
                    ──WS /yjs/:room ── aivory-collab (Rust, yrs, otoritas realtime)
Python (backend/avry-backend, Cerveau, n8n) ──HTTP dashboard API──┘
                    (x-service-token + X-Agent-Type → workspace_agent_acl)
```

- **Rust**: sync + awareness + persist + RBAC enforce. Tambah hanya: presence state
  `agent_working` (relai, tidak inspeksi isi) + siarkan read-mark ephemeral bila murah;
  menolak = tetap (viewer drop, closed-by-default). Tidak ada stamping mention di Rust.
- **Next.js**: contract (zod ala `spaces-protocol` versi mini), render face REST,
  composer mention, topic rail, activity query, thread/topic/annotation tables,
  roadmap-import orchestrator (memakai board aggregate yang ada).
- **Python**: dispatcher per-agent (parse stamp → `agent_tasks` ledger → agent run →
  tulis balik via dashboard API dengan `reason` + `agentType`), verifier sweep existing
  (ADR-008) dipakai untuk finding di kartu approval, MCP-subset internal (Fase akhir).

## 2. Data model (delta saja — tabel existing tidak diubah)

| Baru | Kolom inti | Catatan |
|------|------------|---------|
| `workspace_threads` | `id (root msg id), space_id(doc project), created_by, created_at` | Flat; replies = baris `workspace_messages` (DIPUTUSKAN 2026-09-17: Postgres-first, bukan Yjs — thread = workload DB, Yjs khusus isi doc) |
| `workspace_topics` | `id, thread_root, title (goal), archived bool, doc_id nullable, created_by, created_at` | 1 topic per thread (unique partial); hapus topic ≠ hapus pesan |
| `workspace_messages` (atau reuse events) | `id, space_id, thread_root nullable, author (+acting_mode, agent_name), body, mentions[], here bool, cerveal bool, created_at, deleted_at, edited_at` | Stamp saat tulis; tombstone author-only (body → `''`) |
| `workspace_read_marks` | `(space_id, member, thread_root nullable, offset)` | Monotone naik; ephemeral broadcast ke device lain |
| `workspace_projects` lineage | reuse `props` JSON: `{isProject, projectDocs, roadmap_id, wave_id}` | Tanpa kolom baru bila cukup (PATCH `||` merge existing) |

Migrasi: file baru `migrations/workspace-space-*.sql`, additive + nullable, idempotent,
mengikuti pola `workspace-*.sql` existing. Retention history 50 (pola existing).

## 3. API contracts (baru — semua di bawah `/api/workspace/`)

| Route | Method | Auth | Catatan |
|-------|--------|------|---------|
| `/api/workspace/[id]/stream` | GET (`before/after/around`, limit ≤200) | gate baca existing | Roots newest-first + `replyCount` + `truncated` |
| `/api/workspace/[id]/thread?root=` | GET | gate baca | Root + replies oldest-first + topic row |
| `/api/workspace/[id]/messages` | POST `{threadRoot?, body, poll?}` | tulis existing | Stamp mention server-side; reply ke archived → un-archive |
| `/api/workspace/[id]/messages/[m]` | PATCH/DELETE | author-only | Edit in-place + `editedAt`; delete = tombstone |
| `/api/workspace/[id]/topics` | POST `{rootMessageId?, title, body?, docId?}` | tulis | `documentAssetId` = doc id existing |
| `/api/workspace/[id]/topics/[t]` | PATCH | tulis | `retitle/archive/unarchive/remove/attach/detach` |
| `/api/workspace/activity` | GET (`unread, kinds, cursor`) | — | Query lintas Space: mention > here > dm > reply |
| `/api/workspace/activity/read-all` | POST `{spaceId?}` | — | Mark monotone |
| `/api/workspace/roadmap-import` | POST `{roadmapId, projectId?}` | tulis | Wave→doc, deliverable→row, lineage props, return board payload |

Kontrak body mengikuti zod schema baru `lib/spaceProtocol.ts` (mini `spaces-protocol`:
`Attribution`, `MentionStamps`, `Topic`, `Message`, hasil `applied/merged/conflict` untuk
proposal offline/import). Response divalidasi sebelum dikirim (pola Harbor `reply()`).

## 4. Realtime (DIPUTUSKAN 2026-09-17: Postgres-first)

- Pesan/thread/topic/read-mark = baris SQL; dibaca via REST dengan window
  (`before/after/around`, limit 50/200) — paginasi beneran, tanpa sentuh Yjs.
- Delivery live dua lapis (murah → gratis):
  1. **Relai event ringan** lewat broadcast channel Rust yang ada (content-blind —
     hanya `{space_id, thread_root, message_id, offset}`, pola whiteboard-relay Harbor):
     client terima → fetch row-nya via REST. Rust tidak inspeksi isi.
  2. **Fallback poll 5 detik** ala MissionControl (`MissionControl.tsx:104` sudah begitu
     untuk workspace activity) — menjamin konsistensi walau WS putus.
- Doc content tetap Yjs penuh (fetch `/doc` → apply → `WebsocketProvider` → observe →
  PUT debounce, pola `WorkspacePageComments`). Dua sumber kebenaran dipisah tegas:
  Yjs = blok dokumen, SQL = percakapan. `page-comments` existing tidak dimigrasi.
- Presence: `useWorkspaceAwareness` diperluas dengan state `agent_working` (Python
  mem-publish via service call, Rust merelai buta).
- Reconnect: REST replay dari offset terakhir (`workspace_events` hash chain existing
  dipakai sebagai log offsets) + Yjs state-vector sync untuk doc.

## 5. Mention pipeline (detail)

1. Composer kirim **token** `[@Nama](#member:<user_id>)` untuk manusia,
   `[@Lex](#agent:leads_qualifier)` (dan 5 agent lain — id = `agent_type`, label =
   first name dari `AGENT_ROSTER`) untuk agent, `[@here](#here)` untuk semua,
   `[#Judul](#doc:<id>)` untuk referensi doc (usulan D3 SCOPE: `#doc`, bukan `#space`).
2. Server: parse di luar code region → validasi id ∈ roster/ACL Space → stamp
   (`mentions[], here, cerveal`) → simpan. Label tidak pernah di-parse.
3. Konsumen (unread/activity/push/picker) hanya baca stamp.
4. Stamp `#agent:<type>` → enqueue `agent_tasks` untuk agent itu (parent `AIRA-orch`
   per TASK-CONTRACT; `Aira` sendiri bisa jadi parent/orchestrator) → agent run di atas
   engine Cerveau → tulis balik **sebagai agent itu** (`X-Agent-Type` = typenya,
   `agentName` = first name-nya, `reason` wajib) → receipt `✅` + event. Tidak ada router:
   `agent_type` di stamp = `agent_type` yang mengeksekusi, 1:1 dengan gate
   `workspace_agent_acl` existing.

## 6. Roadmap-import mapping (detail)

Input: roadmap object (`lib/roadmapGeneration.ts`, `reportStorage.ts`) —
waves[] → deliverables[] (title, status, priority, assignee, due).
Output: 1 project doc (`isProject:true`, `projectDocs:[waveDocIds]`,
`props.roadmap_id/wave_id`) + N wave docs + M db rows via `POST .../database`
(pola `database/route.ts`: `agentType` = importer, `origin` tercatat).
Idempotent: import ulang dengan `roadmap_id` sama = update (match `wave_id`), bukan duplikat.
Conflict: wave doc berubah sejak dibaca → kembalikan `currentContent + history`
(pola propose-conflict), UI tawarkan adopt/retry — tidak pernah silent overwrite.

## 7. Testing

- `npx tsc --noEmit` 0 error (wajib tiap fase).
- `npm test` hijau; baseline dicatat di PLAN Phase 0 (format: N file / M tests).
- Test baru per route: pola `route.test.ts` existing (mock `query`, `svcAgent` dengan
  `x-agent-type: leads_qualifier`, kasus 403/skip-private-doc).
- Kontrak: golden fixture mini untuk mention parser (token, code-block, bare-word)
  + thread/topic lifecycle (archive-revive, remove-keeps-messages).

## 8. Risks

| Risiko | Mitigasi |
|--------|----------|
| Dua sumber kebenaran (Yjs doc + SQL pesan) | Pisah tegas message vs artifact (ADR-008); pesan tidak pernah dibaca dari Yjs, doc tidak pernah dibaca dari SQL; `page-comments` existing off-limits |
| Mention stamp vs roster drift | Stamp = id; label resolve saat render; unknown id = tampilkan label apa adanya |
| Agent menulis berlebihan | `checkAgentAccess` write + approval gate irreversible + verifier finding; default `bounded`, depth 1 (ADR-008) |
| Scope creep (poll/DM/whiteboard) | SCOPE §4 Never ditegakkan di review tiap fase |
| Global CSS menimpa komponen baru | Hanya `span`/`div` + token @theme; verifikasi via computed styles (pelajaran Phase 10) |
