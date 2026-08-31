# ADR-007 — Aivory Cerveau: Long-Term Memory via cognee-rs (Postgres-only)

**Date:** 2026-08-31
**Status:** Decided and started. Fork created (`Aivory-hub88/cognee-rs`), first patch (`GRAPH_POSTGRES_URL` wiring) written and pushed to `cerveau-main`, CI building. Nothing deployed to `tencent-vps` yet — see §6 for the phased plan and what's still open.
**Context:** [[cerveau-memory-scoping-and-rag]] (the earlier "don't add RAGflow" decision this one updates), [ADR-004](ADR-004-CERVEAU-MEMORY-LIFECYCLE.md) (the retention/lifecycle system this sits next to, not inside).

---

## 1. Why this exists

Cerveau's own memory (`zeroclaw-memory`, Postgres + pgvector) does hybrid vector+keyword recall — proven end-to-end as of 2026-08-30 (a document upload's facts came back correctly in a real tenant turn, see [CERVEAU-STATUS.md](CERVEAU-STATUS.md)). What it does not do is **graph reasoning**: "who is connected to X through Y", multi-hop entity relationships, anything that needs a knowledge graph rather than a ranked list of similar chunks. As Cerveau moves toward real enterprise deployments, that gap was judged worth closing ahead of a specific customer hitting it, not after — the product needs to be able to answer relationship questions, not just similarity questions, and retrofitting graph structure onto an enterprise tenant's already-large memory later is a worse position than building the capability now while the tenant base is still small.

An earlier session considered this exact question (2026-08-30, `cerveau-memory-scoping-and-rag` memory) and said no to **RAGflow**: it needs Elasticsearch + MySQL + Redis + MinIO, 16 GB RAM, 50 GB disk — the VPS had ~400 MB free. That verdict stands; RAGflow is not being reconsidered. `cognee-rs` (github.com/topoteretes/cognee-rs, Apache-2.0, Rust, actively maintained) is a different shape of tool: its default build is fully embedded (SQLite + an embedded graph store + an embedded vector store, no external services), and critically it also ships **`pgvector`** and **`pggraph`** adapters — its vector and graph stores can point at a Postgres instance instead of the embedded ones. That is the fact that changes the calculus: it does not have to become a third storage engine next to `avry-postgres`. It can live inside it.

## 2. The decision

Run `cognee-http-server` (the `cognee-rs` workspace's standalone HTTP binary) as a sidecar service on `tencent-vps`, built **Postgres-only**:

- **Vector** (`pgvector` feature) → `avry-postgres`, new schema, not `cerveau.memories`.
- **Graph** (`pggraph` feature) → same Postgres instance, graph-as-tables.
- **Relational metadata** (pipeline runs, ingestion records) → stays on the crate's default embedded SQLite. This is small bookkeeping, not tenant data, and moving it to Postgres too would need a `Cargo.toml` dependency-feature change (`cognee-database` is pinned to `features = ["sqlite"]` in `http-server`'s own manifest) that buys nothing proportionate to the risk of touching it. Revisit only if the SQLite file becomes an actual operational problem.
- **Embeddings** via OpenRouter (`EMBEDDING_PROVIDER=openai` + `OPENAI_URL` pointed at OpenRouter), matching how Cerveau's own memory already embeds — not the bundled ONNX runtime.
- **No telemetry.** `cognee-http-server` defaults to OpenTelemetry export; the build drops that feature. Nothing about tenant memory content should be leaving `tencent-vps`.

Two things this ruled out, and why:

1. **Vendoring `cognee-rs` into the `zeroclaw-cerveau` Cargo workspace.** `cerveau-build.yml` already runs 4 parallel jobs in ~12–14 minutes; pulling in a ~25-crate external workspace risks that build time and its stability for a capability that doesn't need to share a binary with the gateway. A sidecar called over HTTP — the same shape as the OfficeCLI/Stripe MCP integrations and the `office_assistant` native-bridge module — keeps the blast radius of a `cognee-rs` bug contained to its own process.
2. **The default (embedded) `cognee-rs` build.** Confirmed live on `tencent-vps`: no `cmake`, no `protoc`, no `cargo`/`rustc` installed, and 374 MB free RAM. The default feature set (`ladybug` + `lancedb` + `onnx`, all default-on) needs `cmake` (Ladybug), `protoc` (LanceDB's bundled Arrow/lance C++ tree), and a bundled ONNX runtime — the same class of footprint problem RAGflow had, just smaller. Dropping to `pgvector,pggraph,html-loader,bin` (no `ladybug`, `lancedb`, `onnx`, `bedrock`, `telemetry`) needs none of that — confirmed by reading upstream's own `ci.yml`, which already runs `cargo check -p cognee-http-server --no-default-features --features pgvector,pggraph,...` as one of its gates, so this is a build shape upstream itself keeps green, not an unproven configuration.

## 3. What had to be patched, and why it's a real patch and not just config

`pggraph` is a real, buildable feature — but `HttpServerConfig::backend_context()` hardcoded `graph_postgres_url: None` with a comment stating plainly that the standalone server doesn't wire it: *"here for consumers that build their own `BackendBuildContext`"*. Vector already had the equivalent path (`VECTOR_DB_URL` env → `validate_vector_config` → `vector_postgres_url`); graph didn't.

Fork: `github.com/Aivory-hub88/cognee-rs`, branch `cerveau-main` (mirrors `AVRY-Cerveau`'s own `cerveau-main` convention — upstream `main` untouched). First patch, commit `7dc88b6`:

- New `HttpServerConfig.graph_postgres_url: Option<String>`, env `GRAPH_POSTGRES_URL` (env-only, no `--flag`; this deployment sets it via systemd `Environment=`, same as every other DB URL here).
- Wired into `BackendBuildContext.graph_postgres_url` in `backend_context()`.
- New `validate_graph_config`, mirroring `validate_vector_config`'s shape exactly: empty → actionable error naming the env var; wrong scheme → actionable error instead of the registry's generic connection failure.
- `wire_graph_db` takes `cfg` now (needed it for the validation call), one caller site updated.

`.github/workflows/cerveau-build.yml` added to the fork (mirrors `AVRY-Cerveau`'s own `cerveau-build.yml`): `check` (the trimmed feature set) → `build-release` (release binary, packaged, published to a rolling `cerveau-cd` release) on push to `cerveau-main`.

## 4. Identity: mapping into Cerveau's existing tenant model

`cognee-rs`'s memory API takes `--tenant-id` natively (`remember`/`recall`/`improve`/`forget` all accept it) — simpler than Cerveau's own `t_<user_id>.<agent_type>` alias scheme, which exists because `cerveau.agents` has no separate tenant column and isolation is structural through the alias. Plan: pass Cerveau's existing alias (`t_<user_id>.<agent_type>`) as `cognee-rs`'s `tenant_id` verbatim, rather than inventing a second identity scheme or trying to collapse the two into one shared column. This is a decision for the wiring phase (§6), not resolved by this ADR — flagged here so it isn't improvised differently later.

## 5. What this does *not* replace

`zeroclaw-memory`'s pgvector-backed hybrid recall stays exactly as it is — this is not a migration. Document ingestion (shipped 2026-08-30, `cerveau_memory.py` → `/api/memory` → `cerveau.memories`) is unaffected. `cognee-rs` is additive: a second, graph-capable recall path for the questions hybrid vector search structurally can't answer, not a replacement for the one that already works.

## 6. Phased plan — what's proven, what's next

| Phase | Status |
|---|---|
| 0. Fork + `GRAPH_POSTGRES_URL` patch | **Done**, commit `7dc88b6` on `Aivory-hub88/cognee-rs:cerveau-main` |
| 1. CI green on the trimmed feature set | **In progress** — `cerveau-build.yml` triggered on push, not yet confirmed green |
| 2. Provision Postgres schema (`cognee` schema in `avry-postgres`, or a role scoped to it) | Not started |
| 3. Deploy `cognee-http-server` to `tencent-vps` as its own systemd unit, `GRAPH_POSTGRES_URL`/`VECTOR_DB_URL` both pointed at `avry-postgres`, embeddings via OpenRouter | Not started |
| 4. Tenant-identity bridge: Cerveau's native-bridge or gateway calls `cognee-http-server`'s HTTP API with `tenant_id = t_<user_id>.<agent_type>` | Not started — design only, §4 |
| 5. Wire a real tool/recall path so an agent turn can actually query it (mirrors how `memory_recall` reaches `zeroclaw-memory` today) | Not started |
| 6. Live verification: plant a graph-relationship fact through `remember`, confirm it surfaces through a real tenant turn — same discipline as every other Cerveau live-verification in this project (plant → real turn → check the actual answer, not the tool's own success claim) | Not started |

Nothing here is deployed to production yet. Do not point a real tenant at this until Phase 6 has a live-verified pass recorded in [CERVEAU-STATUS.md](CERVEAU-STATUS.md), the same bar every other Cerveau capability in this project has cleared before being called done.
