# Team Space — PLAN (rencana eksekusi)

**Date:** 2026-09-17
**Status:** Draft — D1–D2 DIPUTUSKAN 2026-09-17 (produk = **Team Space**; mention **per-agent**
`@Lex/@Geno/@Finn/@Aira/@Teo/@Ofira`, Cerveau = nama engine). Tersisa D3–D4 di [SCOPE](./SPACE-SCOPE.md) §7.
**Related:** [SPACE-SCOPE](./SPACE-SCOPE.md) · [SPACE-PRD](./SPACE-PRD.md) · [SPACE-TRD](./SPACE-TRD.md)

Aturan eksekusi (dari WORKSPACE-PARITY-HANDOFF + CERVEAU-WORKING-OFFICE):
`git add <path>` eksplisit (tidak pernah `-A`), 1 sub-fitur = 1 commit kecil + test,
`tsc` + `npm test` hijau tiap fase, deploy = build background + poll → smoke → catat.
Baseline (diisi saat Phase 0 mulai): dashboard HEAD `______`, `tsc` `______`,
`npm test` `______` file / `______` tests.

---

## Phase 0 — Fondasi + keputusan (blocking, tanpa kode produk)

- [x] D1–D2 dikunci 2026-09-17 (Team Space, per-agent). D3–D4 dikunci 2026-09-17
      (Postgres-first, wireframe di `docs/space/wireframe.html` — sudah dipindahkan).
- [ ] Tulis `lib/spaceProtocol.ts` (zod mini: Attribution, MentionStamps, Topic, Message,
      hasil applied/merged/conflict) + golden fixture mention parser (token, code-block,
      bare-word) + test hijau.
- [ ] Catat baseline tsc/test/HEAD di atas.
- **Exit gate:** fixture parser hijau; baseline tercatat. (Keputusan sudah lengkap — tidak ada yang menggantung.)
- **Verifikasi:** `npx tsc --noEmit`, `npm test -- spaceProtocol`.

## Phase 1 — Discussion stream + thread baca (F1/F2-read, F7-read)

- [ ] Migrasi `workspace-space-threads.sql` (`workspace_threads`, `workspace_topics`,
      `workspace_messages`, `workspace_read_marks`) — additive, idempotent.
- [ ] `GET .../stream` + `GET .../thread` (window 50/200, `truncated`, replyCount).
- [ ] UI: tab Discussion di project doc + stream + panel kanan thread (read-only dulu)
      + rail Discussions/Files/Members (evolusi `WorkspaceNavigator`, bukan file baru bila bisa).
- [ ] Presence baca (awareness existing) di topbar + member list.
- **Exit gate:** root + reply tampil; klik thread tidak me-reset stream; Write/Data/Board diff nol.
- **Verifikasi:** route tests (200 + cap + 403 private); screenshot diff 3 tab lama.

## Phase 2 — Tulis: root/reply/topic/mention (F1/F2-write, F3, F7-write)

- [ ] `POST .../messages`, PATCH/DELETE author-only (tombstone), `POST/PATCH .../topics`
      (retitle/archive/unarchive/remove/attach/detach), stamp mention server-side.
- [ ] Composer + picker `@`/`#`, chip render, reply composer kanan, receipt `👀` lokal.
- [ ] Presence tulis + `agent_working` relay (Rust: tambah state, tanpa inspeksi isi).
- [ ] Test: archive→reply→un-archive; remove-topic keeps messages; viewer 403 tulis;
      mention dalam code block tidak stamp.
- **Exit gate:** acceptance PRD #2, #3, #6(‑viewer) hijau di dogfood workspace.
- **Verifikasi:** `npm test -- workspace`, live click-through + network tab (PATCH bodies).

## Phase 3 — Agent di thread (F4)

- [ ] Dispatcher per-agent: stamp `#agent:<type>` → `agent_tasks` parent/child (TASK-CONTRACT)
      → run → tulis balik (message vs artifact + `reason` wajib + atribusi).
- [ ] Kartu task (Running → Idle, badge count) + kartu approval NotificationCard
      (glyph warn, divider, Approve sage/Deny) + receipt `✅/❗`.
- [ ] Verifier finding (ADR-008 sweep) tampil di kartu approval ("Automated check: …").
- [ ] Guard: tulis irreversible wajib approval; Deny = nol tulis; audit di activity.
- **Exit gate:** acceptance PRD #4 hijau end-to-end (mention → receipt → approve → tulis tercatat).
- **Verifikasi:** synthetic approval row (pola verifikasi ADR-008 Phase 3a) + e2e dogfood.

## Phase 4 — Roadmap → project (F6, killer flow)

- [ ] `POST /api/workspace/roadmap-import` (mapping TRD §6, idempotent via `roadmap_id`/`wave_id`,
      conflict → `currentContent + history`, tidak pernah silent overwrite).
- [ ] Tombol di Board project + halaman roadmap → push `?view=board`.
- [ ] Tiap wave doc lahir dengan thread-nya (F2) siap didiskusikan.
- **Exit gate:** acceptance PRD #5 (fixture 3 waves/11 deliverables → board penuh).
- **Verifikasi:** import 2× (tidak duplikat) + ubah wave doc lalu import ulang (conflict path).

## Phase 5 — Activity inbox + hardening (F5 + exit keseluruhan)

- [ ] `GET /api/workspace/activity` (mention > here > dm > reply, cursor) +
      `POST .../read-all` (monotone) + bell → inbox NotificationCard per tone.
- [ ] Hardening: window/paginasi dingin, ukuran blob/room audit, computed-styles check
      (aturan span/div + token), a11y keyboard pada message actions.
- [ ] Docs: perbarui STATUS/handoff + smoke VPS (200 + WSS 101 + board load).
- **Exit gate:** acceptance PRD #1–#7 semua hijau; metrics baseline dipasang.
- **Verifikasi:** full `tsc` + `npm test`, deploy ikut pola handoff (background build + poll + smoke).

---

## Tracker

| Fase | Status | Gate | Tanggal |
|------|--------|------|---------|
| 0 fondasi | ⬜ belum mulai | D3–D4 + fixture hijau | — |
| 1 baca | ⬜ | stream/thread + diff nol | — |
| 2 tulis | ⬜ | root/reply/topic/mention | — |
| 3 agent | ⬜ | e2e mention→approve→tulis | — |
| 4 roadmap-import | ⬜ | board penuh idempotent | — |
| 5 activity+hardening | ⬜ | acceptance #1–#7 | — |

## Perintah verifikasi standar (tiap fase)

```bash
npx tsc --noEmit
npm test -- workspace   # + -- spaceProtocol (fase 0)
curl -s http://localhost:3201/health   # aivory-collab ok
```
