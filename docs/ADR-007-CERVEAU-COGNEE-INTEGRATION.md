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
| 1. CI green on the trimmed feature set | **Done** — run `33388407201`, both `check` and `build-release` green, binary published to the rolling `cerveau-cd` release (`cognee-cerveau-x86_64-linux.tar.gz`, sha256 `f9b28327…`). Checksum re-verified after download; the binary is a plain dynamic ELF against only `libgcc_s`/`libm`/`libc` — no bundled native stack, confirming the feature trim actually took. |
| 2. Provision Postgres schema (`cognee` schema in `avry-postgres`) | **Done** — `CREATE SCHEMA cognee AUTHORIZATION aivory`. Reuses the existing shared `aivory` role (same as every other schema on this instance) rather than a new one, matching project convention. |
| 3. Deploy `cognee-http-server` to `tencent-vps` as its own systemd unit | **Done** — `cognee-cerveau.service`, port 3200, enabled at boot. §8 has the full deploy account, including two real bugs found and fixed before it worked. |
| 4. Tenant-identity bridge, enforced | **Done** — §9. `cerveau-server` binary (new, OSS `cognee-http-server` + a real `AuthResolver`), `REQUIRE_AUTHENTICATION=true`, deployed and live-verified: two tenants using the identical dataset name get structurally separate data, and every unauthenticated shape (no headers / headers without the shared secret / wrong secret) gets a real 401, not a fallback identity. |
| 5. Wire a real tool/recall path so an agent turn can actually query it (mirrors how `memory_recall` reaches `zeroclaw-memory` today) | Not started |
| 6. Live verification: plant a graph-relationship fact, confirm it surfaces through search | **Mechanism proven** (§8) single-tenant, and **isolation proven** (§9) multi-tenant — both direct-API smoke tests, not yet through a real Cerveau agent turn or the tool-call path (that's Phase 5). Re-run once Phase 5 lands, through the actual tenant path, before calling Phase 6 fully closed. |

Nothing here is wired to a real Cerveau agent turn yet (Phase 5). Do not point real tenant traffic at this until that phase has a live-verified pass recorded in [CERVEAU-STATUS.md](CERVEAU-STATUS.md), the same bar every other Cerveau capability in this project has cleared before being called done. Tenant *isolation*, specifically, is no longer the blocker — see §9.

## 7. `tencent-vps` RAM headroom, checked before deploying this — not gatekept, but not idle either

`free -h` reads `266Mi free` at a glance, which looks alarming until the columns are read correctly: `buff/cache` is `4.3Gi` and it is reclaimable page cache, not memory anything has actually claimed. The number that matters is `available`: **4.0 GiB**. No cgroup limits the box (`MemoryMax=infinity` on the relevant units) — there is no artificial ceiling lower than physical RAM.

Two things worth recording anyway, neither blocking this deploy:

- **`Swap: 1.9Gi total, 1.1Gi used`.** The box has genuinely been under real memory pressure at some point (consistent with the 2026-08-18 `cargo test` OOM that forced a Tencent Console reboot — see [CERVEAU-STATUS.md](CERVEAU-STATUS.md)'s CI-hygiene entry). Not a live problem right now (`available` is healthy), but worth a glance if `cognee-http-server`'s footprint turns out larger than expected once it's actually running.
- **Four `next-server` processes under a separate Linux user (`lighthouse`, uid 1001), ~361 MB RSS combined, running natively (not in `docker ps`'s 27 containers), uptimes of 6–13 days.** Not Aivory's — no `avry`/`aivory` naming, its own home directory, permission-denied to even list from the `ubuntu`/root access this session has. Reads as another tenant's site on shared hosting, not orphaned Aivory infra. Left alone; flagged here only because it showed up while explaining where the RAM actually goes, not because it needs action.

`dockerd` itself is the single largest process at 1.2 GB RSS (27 running containers) — high but not obviously a leak at that container count; not investigated further since it isn't on the critical path for this deploy.

## 8. Phase 2–3 + a mechanism proof — deployed 2026-08-31, three real bugs found live

**Schema and service.** `CREATE SCHEMA cognee AUTHORIZATION aivory` on `avry-postgres`. `cognee-cerveau.service` (systemd, port 3200, `User=ubuntu`, `EnvironmentFile=/etc/cognee-cerveau.env` mode 600), enabled at boot. Binary: the `cerveau-cd` release, checksum-verified (`f9b28327…`, matched) before install. RSS at idle: **8.1 MB** — the trimmed feature set is genuinely light, not just light to build.

**Bug 1 — the Postgres password broke its own connection string, and almost leaked into this transcript.** the shared `aivory` role's password contains an unescaped `@` (a special char in a position `postgres://user:pass@host` parses as the userinfo/host delimiter) — the literal `@` in the password would have been read as "end of password, start of host." My first attempt to build the env file printed a partially-redacted fragment of the real password into my own output while checking it — caught immediately, not repeated. Fixed properly: the password is now URL-percent-encoded (`urllib.parse.quote`, `safe=""`) into `VECTOR_DB_URL`/`GRAPH_POSTGRES_URL`, done entirely in a script on the VPS with the plaintext value never printed to this session's transcript again, and the intermediate file `shred -u`'d after use.

**Bug 2 — `LLM_PROVIDER` defaults to `openai`, which strips a LiteLLM-style vendor prefix off the configured model before sending it.** With `LLM_MODEL=deepseek/deepseek-v4-flash-0731` (the model this project already standardized on), the default `openai` provider stripped `deepseek/` and sent bare `deepseek-v4-flash-0731` to OpenRouter — which requires the full `vendor/model` form to route correctly. The binary's own startup warning names the fix (`llm_provider=custom` skips the strip); added to `/etc/cognee-cerveau.env`. Confirmed gone from the logs after restart.

**Bug 3 — `pgvector`'s `vector` type lives in the `identity` schema on this Postgres instance, not `public`.** `search_path=cognee` (the connection-scoped override, chosen over `ALTER ROLE aivory SET search_path` specifically so it doesn't touch every other service sharing that role) hid it, so the first `cognify` run failed with `type "vector" does not exist`. Fixed to `search_path=cognee,identity`. A second, unrelated dimension mismatch surfaced right after fixing that (`expected 768 dimensions, not 1536`) — `EMBEDDING_DIMENSIONS=768` was carried over from Cerveau's own memory config by habit, but OpenRouter's `text-embedding-3-small` returns full 1536-dimension vectors unless a truncation parameter is sent, and nothing in this build sends one. Since this is a genuinely separate vector store (its own `cognee` schema, not `cerveau.memories`), there was no real reason to force 768 — reset to `1536` and the schema (freshly created, only probe data in it) was dropped and recreated to match.

**Mechanism proof, single-tenant, direct API — not yet through a real Cerveau turn (that's Phases 4–5):**

1. `POST /api/v1/add` — a short paragraph naming a fictional company, product, and person with a real multi-hop relationship (chief engineer → previously worked at → a specific former plant). Fictional entities deliberately, so a correct answer can only come from the ingested graph, not the LLM's pretraining.
2. `POST /api/v1/cognify` — `PipelineRunCompleted`. Confirmed at the database level, not just the API's own claim: `SELECT count(*) FROM cognee.graph_node` → 12, `graph_edge` → 17, node names include `Dana Okafor` (PERSON), `Meridian Corp` (ORGANIZATION), `Zephyr-9` (PRODUCT) — real entity extraction, not a no-op.
3. `POST /api/v1/search` (default `GraphCompletion` type) — asked *"Where did the chief engineer who designed the Zephyr-9 previously work, before Austin?"*, a question that requires two hops (product → designer → prior workplace) and never states the answer's own name. Response: **"Chicago plant (Meridian Corp's Chicago plant)"** — correct, and traceable to the ingested graph rather than the model's own knowledge, since none of these entities exist outside this test.
4. Probe dataset dropped afterward (`DROP SCHEMA cognee CASCADE` + recreate), service restarted clean, `/health` confirmed `{"status":"ready","health":"healthy"}`.

**What this proves and what it doesn't.** The `pgvector` + `pggraph` build genuinely works end-to-end against `avry-postgres` — ingestion, chunking/embedding, entity/relationship extraction, and graph-aware retrieval all function, at 8 MB RSS. It does **not** yet prove tenant isolation (closed same day — see §9) or that a real Cerveau agent turn can reach it (§6 Phase 5, still open).

## 9. Phase 4 — tenant isolation, enforced and live-verified (same day)

**The gap this closes.** §8's proof ran with `require_authentication: false` — every caller collapsed onto one synthetic identity (`default_user_from_state`). That's fine for a single-tenant mechanism smoke test; it is not tenant isolation, and turning `require_authentication` on by itself doesn't fix it: the OSS `cognee-http-server` binary never wires an `AuthResolver` (that's explicitly a closed-crate concern per `crates/http-server/src/auth_resolver.rs`'s own module docs), so with auth required and no resolver, the binary just 401s *every* request — there is no way to authenticate with it at all. Neither setting of the flag, on the vanilla binary, gives you real per-tenant isolation.

**The fix: a new binary, not new Rust patches to a shared code path.** `cerveau-server` (`crates/http-server/src/bin/cerveau-server.rs`, second `[[bin]]` in the same crate, commit `49a43a6`) is the same server wired through the existing `RouterBuilder::with_auth_resolver(...)` extension seam — the exact seam the OSS code left for this. `TenantHeaderResolver` reads `X-Tenant-Id`/`X-Agent-Type` (the same header pair Cerveau's own webhook and `/api/memory` already use), reconstructs the identical `t_<user_id>.<agent_type>` alias, and derives `AuthenticatedUser.id` via `Uuid::new_v5(NAMESPACE_OID, alias)`.

That derived UUID is not a new isolation mechanism — it's the *existing* one. `AuthenticatedUser.id` is what already scopes ownership of every dataset/data row in this codebase (the same UUID5 scheme `default_user_from_state` uses for its one fixed default email); this resolver just feeds it a real per-tenant alias instead of always the same email. Two different tenant aliases → two different UUIDs → two structurally separate data trees, the same "isolation is structural, not configured" shape Cerveau's own `create_memory_for_tenant` already uses on the Rust side.

**Gated by a shared secret, checked constant-time.** `X-Tenant-Id`/`X-Agent-Type` are only trusted when `X-Cerveau-Internal-Secret` matches `CERVEAU_INTERNAL_SECRET` — without that gate, those two headers would let any caller claim to be any tenant. The binary refuses to start without the secret configured. CI (`.github/workflows/cerveau-build.yml`, commit `9acfd0b`) now builds and packages both binaries; `cerveau-server` is the one actually deployed.

**Deployed and live-verified on `tencent-vps`:** binary swapped (checksum-verified), `cognee-cerveau.service`'s `ExecStart` updated, `REQUIRE_AUTHENTICATION=true` + a freshly generated `CERVEAU_INTERNAL_SECRET` added to `/etc/cognee-cerveau.env` (mode 600). Four cases, direct API:

| Request | Result |
|---|---|
| No headers at all | `401` |
| Tenant headers, no secret | `401` |
| Tenant headers, wrong secret | `401` |
| Correct secret, tenant A: add → cognify → search its own data | Correct answer returned |
| **Correct secret, tenant B: search the identical dataset NAME tenant A just used** | `{"error":"Search prerequisites not met","detail":"dataset not found: isolation_probe2"}` |

The last row is the actual proof, not the 401s (those just show the gate exists) — tenant B used the *exact same dataset name string* tenant A owns, and still got "not found," because the boundary is `owner_id` (the derived UUID), not the name. A same-name collision would have been the realistic failure mode if isolation were name-based instead of identity-based; it isn't. Probe data (both tenants) dropped afterward — `DROP SCHEMA cognee CASCADE` + recreate — service restarted, `/health` confirmed clean.

**What's still open:** Phase 5 (a real Cerveau agent tool that calls this with real tenant headers, not curl) and re-running both live proofs — §8's graph-relationship one and this session's isolation one — through that real path before either is called fully closed.
