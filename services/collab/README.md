# aivory-collab — y-octo CRDT engine (Rust)

Rust websocket + HTTP service speaking `y-protocols` (compat `yjs 13`) with a
Postgres-backed room store ("OctoBase pg store"). Replaces `y-websocket:3220` (Node, in-memory)
as the single collab engine for Workspace (`Pages` + `Database`).

Planning & decisions: `frontend/avry-user-dashboard/docs/COLLAB-Y-OCTO-PLAN.md`.
Edge Worker mirror (no secrets): `./edge-worker.js`.

## Layout

```
services/collab/
  Cargo.toml        yrs 0.17, axum 0.7 (ws), tokio, dashmap, sqlx 0.7 (pg), tracing
  src/main.rs       rooms + y-protocols sync + HTTP doc API + OctoBase persist
  Dockerfile        rust:1.89 builder (sqlx transitive deps need rustc >= 1.88) → debian-slim
  edge-worker.js    mirror of CF Worker aivory-uk-reverse-proxy (/yjs bypass) — keep in sync
```

## Routes

| Route | Protocol | Keterangan |
|---|---|---|
| `GET /health` | HTTP | `aivory-collab ok 3200 y-octo` (compose healthcheck + Traefik) |
| `GET /info` | HTTP | JSON: service/crdt/store/ws/api |
| `GET /yjs` , `/yjs/` | WS | fallback room `default` |
| `GET /yjs/:room` | WS 101 | `y-protocols`: sync step1→step2, update apply+broadcast, awareness passthrough; header `X-Agent-Type`/`X-User-Id` logged |
| `GET /api/workspace/:id/doc` | HTTP octet-stream | full-state update V1 for `workspace:{id}`; `404` bila kosong |
| `PUT /api/workspace/:id/doc` | HTTP octet-stream | apply update + broadcast ke WS peers + trigger flush; header `X-Agent-Type` |

Rooms in-memory (`DashMap`, `broadcast` per room) + persist per room (debounce 300ms) ke
`dashboard.workspace_docs(id, yjs_update BYTEA, updated_at)`:

- key room: `workspace:{docId}` (HTTP API) atau `workspace:db:{docId}` / `workspace:{docId}` (WS).
- first access: lazy-load row room-keyed, lalu merge legacy bare-id row (migrasi yjs→OctoBase built-in).
- `yrs Transaction` is `!Send` — semua transaksi di-scope dalam block, tidak boleh menyeberang `.await`.

## Env

| Var | Wajib | Keterangan |
|---|---|---|
| `PORT` | no (3200) | listen port |
| `DATABASE_URL` | no (in-memory saja bila kosong) | `postgresql://…@avry-postgres:5432/aivory`; pool `connect_lazy`, max 4 |
| `JWT_SECRET` | no (belum di-enforce) | disiapkan untuk AuthZ per-workspace (scope tersisa) |
| `OCTOBASE_PATH` | no (`/data`) | reserved; volume `collab_data:/data` sudah dipasang |
| `RUST_LOG` | no (`info`) | log level |

## Local dev

```bash
cargo check --manifest-path services/collab/Cargo.toml
PORT=3201 DATABASE_URL=postgresql://… cargo run --manifest-path services/collab/Cargo.toml
# catatan: port 3200 host di VPS dipakai cerveau-server → lokal/VPS gunakan 3201:3200 bila perlu
```

## VPS deploy (tencent-vps, `~/.ssh/claude_code_vps -p 63222`)

```bash
cd ~/AVRY-V2-Main
docker compose -f docker-compose.prod.yml build aivory-collab   # >10 mnt bila tambah dep besar → jalankan background + poll
docker compose -f docker-compose.prod.yml up -d --force-recreate aivory-collab
curl -s http://localhost:3201/health
```

Compose (repo `docker-compose.production.yml`, VPS `docker-compose.prod.yml`):

- `ports: ["3201:3200"]` di VPS (konflik host `3200` dengan `cerveau-server`); repo `3200:3200` untuk lokal.
- Traefik: `PathPrefix(/yjs)` `priority=100` `web,websecure` + `tls certresolver=letsencrypt` → internal `3200`.
  PathPrefix-only (tanpa Host) karena CF Worker me-rewrite Host origin menjadi `aivory.id`.
- `y-websocket:3220` sudah dihapus (2026-09-10) — `aivory-collab` kini single engine untuk `/yjs`.

## Cloudflare edge

- `aivory.uk` A → VPS, proxied; `ssl=full`, `websockets=on`.
- Worker route `aivory.uk/*` → `aivory-uk-reverse-proxy`: `/yjs` + `/yjs/*` WAJIB passthrough
  `fetch(request)` mentah — wrapping `new Response()` throw untuk `101` (error `1101`).
  Mirror + cara deploy via API ada di `edge-worker.js` header. Backup versi lama: VPS `/tmp/rp.js.bak`.
- Token CF HANYA di VPS `~/AVRY-V2-Main/.env` (`CF_EDGE_TOKEN_USER`, `600`, gitignored).
  Jangan hardcode, jangan commit. Token yang pernah terekspos di chat wajib di-rotate.

## Verify

```bash
# persist: tulis via dashboard API (agentType ikut ke collab)
curl -k -s -X POST https://aivory.uk/dashboard/api/workspace/<doc>/database \
  -H 'Content-Type: application/json' -H 'X-Agent-Type: leads_qualifier' \
  -d '{"title":"t","status":"Todo","priority":"High","assignee":"Leads Agent","due":"2026-09-10"}'
# dua baris: <doc> (pg fallback) + workspace:<doc> (OctoBase flush)
docker exec avry-postgres psql -U aivory -d aivory \
  -c "select id, octet_length(yjs_update), updated_at from dashboard.workspace_docs where id in ('<doc>','workspace:<doc>')"
# restart → GET tetap 200 (lazy-load dari pg):
docker restart aivory-collab && sleep 8
curl -m 10 -s -o /dev/null -w '%{http_code} %{size_download}\n' http://localhost:3201/api/workspace/<doc>/doc
# wss via edge (harus 101):
curl --http1.1 -k -m 8 -i -N -H 'Connection: Upgrade' -H 'Upgrade: websocket' \
  -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==' \
  https://aivory.uk/yjs/<room> | head -n 8
```

## Troubleshooting

| Gejala | Sebab / fix |
|---|---|
| `getrandom/icu_* requires rustc 1.8x` saat build | naikkan `FROM rust:*` di Dockerfile (sekarang `1.89`) |
| `failed to bind host port 3200` | konflik `cerveau-server` → gunakan `3201:3200` |
| `future ... is not Send` (`yrs::Transaction`) | bungkus transaksi dalam block `{}` |
| via CF `500 error 1101` padahal direct `101` | Worker membungkus `101` → pastikan bypass `/yjs` terdeploy |
| via CF jatuh ke `main-app` (404) | cek rule collab `PathPrefix(/yjs)` priority `100` aktif (`docker inspect`) |
| SSH timeout saat build | VPS load tinggi (compile Rust) → tunggu + retry |
