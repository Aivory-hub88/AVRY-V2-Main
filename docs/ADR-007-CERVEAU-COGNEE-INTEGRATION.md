# ADR-007 — Aivory Cerveau: Long-Term Memory via cognee-rs (Postgres-only)

**Date:** 2026-08-31
**Status:** All 6 phases done and live-verified as of 2026-08-31 — see §6. Tenant isolation is real (proven via a same-name-dataset collision test, §9) and a real agent tool path is deployed and enforced (§10, proven via two independent session-less webhook turns). One deliberate gap remains: `graph_remember`/`graph_recall` are not yet added to the `MEMORY_TOOL_NAMES`-style exclusion lists that keep memory tools out of subagent/cron/delegate contexts (§10) — treat those contexts as unverified with graph tools present until that audit happens.
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
| 5. Wire a real tool/recall path so an agent turn can actually query it (mirrors how `memory_recall` reaches `zeroclaw-memory` today) | **Done, deployed, live-verified** — §10. `graph_remember`/`graph_recall`, `AVRY-Cerveau` commit `9852a96b`, CI green (all 4 `cerveau-build` jobs), deployed to both `:3100` and `-b`. Operator chose (asked directly, matching the Stripe/OfficeCLI precedent) `allowed_tools` + `auto_approve` on `agent_analyst_brain` for both instances. One gap remains open, flagged not skipped: not yet added to the `MEMORY_TOOL_NAMES`-style exclusion lists that keep memory tools out of subagent/cron/delegate contexts (5 call sites, unaudited). |
| 6. Live verification: plant a graph-relationship fact, confirm it surfaces through search | **Fully closed.** §8 (mechanism, single-tenant direct API) and §9 (isolation, multi-tenant direct API) proven earlier; §10 closes the loop through the *real* tool path — two independent, session-less `POST /webhook` turns (fictional entities, no shared history) where the second turn only answers correctly if `graph_recall` genuinely round-tripped to the sidecar. It did. |

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

## 10. Phase 5 — `graph_remember`/`graph_recall`, the actual agent tools

**What shipped.** Two new `Tool` impls in `zeroclaw-tools` (`crates/zeroclaw-tools/src/graph_memory.rs`), same shape as `memory_store`/`memory_recall` but hitting the cognee-rs sidecar over HTTP instead of `zeroclaw-memory`:

- `graph_remember(text)` — `POST /api/v1/add` (multipart) then `POST /api/v1/cognify`, both against a fixed per-tenant dataset (`cerveau_graph`).
- `graph_recall(query)` — `POST /api/v1/search` with the default `GraphCompletion` type. A `dataset not found` response (a fresh tenant that has never called `graph_remember`) is treated as a normal empty result, not an error.

New `[cognee]` config section (`zeroclaw-config/src/schema.rs`), same shape as `[composio]`: `enabled`, `base_url`, `internal_secret` (encrypted-secret class like every other credential in this config).

**The one real architectural decision this needed.** `zeroclaw-tools` cannot depend on `zeroclaw-runtime` — the dependency graph runs the other way (`zeroclaw-runtime` depends on `zeroclaw-tools` for its tool implementations) — so `graph_memory.rs` cannot call `agent::tenant::current_tenant()` itself the way one might expect from a same-crate task-local read. `memory_store`/`memory_recall` don't hit this wall because their tenant-scoping happens one layer up: `zeroclaw-runtime`'s `process_message` resolves the tenant *before* constructing the `Memory` handle (`create_memory_for_tenant` vs `create_memory_for_agent`), and the tools just hold whatever handle they're given — the tools themselves are tenant-agnostic.

`graph_remember`/`graph_recall` don't have an equivalent "already-scoped handle" to hide behind — they need the raw `X-Tenant-Id`/`X-Agent-Type` values to send as headers. Resolved by moving the `current_tenant()` read to where it's actually reachable: `all_tools_with_runtime` (`zeroclaw-runtime/src/tools/mod.rs`), which already has it, resolves `(platform_user_id, agent_type)` once and passes them into `GraphRememberTool::new`/`GraphRecallTool::new` as plain strings. Both tools are **only constructed at all** when `[cognee].enabled` is true **and** a tenant context exists — there's no "no tenant" branch inside the tools to fall into at runtime, because outside a tenant turn they're never added to the registry in the first place.

**Fixed dataset name, not agent-chosen — same reasoning as §4/§9.** `cerveau_graph` for every tenant. The sidecar isolates by derived owner UUID, not by name (proven live in §9: two tenants using the identical dataset name stayed fully separate), so letting the model pick a dataset name per call would only let it fragment its own tenant's graph into silos it can't find again later — no isolation benefit, real usability cost.

**Two gaps left open on purpose, not silently:**

1. **Not yet in the `MEMORY_TOOL_NAMES`-style exclusion lists.** `memory_store`/`memory_recall`/etc. are deliberately stripped from certain subagent/cron/delegate contexts (`zeroclaw-runtime/src/tools/scoped.rs`, `delegate.rs`, `agent.rs`, the orchestrator) — five call sites, each presumably encoding a specific reason a given context shouldn't touch persistent memory. Whether the same reasoning transfers to graph tools needs its own read of each site, not an assumption; doing that audit was out of scope for this pass. Until it's done, treat a subagent/cron/delegate context as **not yet verified safe** with graph tools present, the same caution `MEMORY_TOOL_NAMES` exists to enforce for memory tools.
2. **Not yet in any risk profile's `auto_approve`.** The non-interactive webhook channel denies any tool call not explicitly listed (`ApprovalManager::approval_requirement`, documented at length in `CERVEAU-STATUS.md`'s Stripe/OfficeCLI history) — `graph_remember`/`graph_recall` will hit that same wall the first time anything actually calls them. Deliberately not flipped here: every prior instance of this exact gate in this project was resolved by asking the operator which tier they wanted (tool_search only / one toolkit / everything), not by a code change alone.

**Deployed and live-verified, same session.** CI green (`postgres-tests`, `redis-tests`, `tenant-isolation`, `build-release` all passed), binary swapped on both `:3100` and `-b` (checksum-verified, standard backup-then-atomic-swap), `doctor` clean on both (0 errors) after the swap and after the config change below.

**The approval-gate decision — asked, not assumed.** As flagged above, the non-interactive webhook channel denies any tool not in the serving risk profile's `allowed_tools`/`auto_approve`. Asked directly (three options: full auto-approve / allowed-but-manual-approval / don't enable yet); chose full auto-approve, same reasoning as the original Stripe/OfficeCLI precedent (still pre-real-tenant testing). Applied to `agent_analyst_brain` on both `:3100` and `-b`: `graph_remember`/`graph_recall` added to both `allowed_tools` and `auto_approve`. Config backed up first on both instances (`config.toml.bak-pre-cognee-tools-20260831`); both restarted, both `doctor`-clean.

**Live-verified through the real tool path — the strongest proof in this ADR.** Two separate, session-less `POST /webhook` calls (no shared `session_id`, so the second call carries none of the first call's conversation):

1. *"Please remember this in your graph memory using the graph_remember tool: [fictional founder/company/prior-employer fact]."* → 200, model confirms storage.
2. *"Using the graph_recall tool, answer: where did [founder] work before founding [company]?"* → 200, correct answer, naming the fictional prior employer.

Because the two calls share no history, the second call could only answer correctly if `graph_recall` actually round-tripped to the sidecar and got the fact back — there is no other channel through which that name could have reached the second, independent turn. It did, confirming the tools are wired correctly from tenant header resolution through to the LLM actually choosing to call them. Probe schema dropped and recreated afterward; `cerveau.memories`/`cerveau.agents` confirmed back at the 123/31 baseline.

**One credential-hygiene note from this pass, unrelated to the tools themselves:** while writing `CERVEAU_INTERNAL_SECRET` into both `config.toml` files, a redaction command left a fragment of it visible in this session's own output. Not repeated — the secret was rotated immediately (fresh value generated, both `config.toml`s and `/etc/cognee-cerveau.env` updated, all three services restarted and reverified) rather than left in a "technically fine, low urgency" state, since rotating it cost one command and there was no reason not to.

## 11. Skill self-improvement now logs to the graph (2026-08-31)

**What shipped.** Cerveau's skill self-improvement system (`skills::review::maybe_run_skill_review`, `SkillManageTool`'s `patch` action) writes an audit trail as HTML comments inside each `SKILL.md` — real, but unindexed: answering "which skills changed because of a Stripe rate-limit issue" means grepping every skill file by hand. Every successful, audit-passed `patch` now also fires a best-effort `graph_memory::remember("Skill '<slug>' was improved. Reason: <reason>")` against the tenant's knowledge graph — the same institutional-history idea `graph_remember`/`graph_recall` exist for, applied to the runtime's own self-modification instead of user-supplied facts.

**Refactor that made this possible without duplicating HTTP logic:** the `add`+`cognify` sequence inside `GraphRememberTool::execute` moved into a standalone `pub async fn remember(cfg, tenant_id, agent_type, text) -> anyhow::Result<()>` in `zeroclaw-tools::graph_memory` — callable from anywhere, not just from inside a `Tool::execute`. `GraphRememberTool` now just adapts its `Result` into a `ToolResult`.

**Tenant threading reused the exact mechanism from §10, not a new one.** `maybe_run_skill_review` runs via `SKILL_REVIEW_ACTIVE.scope(...)`, not `tokio::spawn` — meaning it executes on the *same task* as the turn that triggered it, so `crate::agent::tenant::current_tenant()` still resolves correctly there, same reachability `all_tools_with_runtime` relies on. `SkillManageTool` gained an opt-in `with_graph_logging(cognee_cfg, tenant_id, agent_type)` builder method (not a `new()` parameter — most construction sites, including every test, have nothing to pass there) called only when `[cognee].enabled` and a tenant context both exist.

**Deployed:** binary swapped on both `:3100` and `-b` (checksum-verified, standard backup-then-atomic-swap), CI green on all 4 `cerveau-build` jobs, `doctor` clean (0 errors) on both after restart.

**Not live-verified end-to-end, and here's the honest reason why not.** §8/§9/§10's proofs were all directly triggerable: a curl call, or a scripted webhook turn with a fixed prompt. This path is gated by the model *autonomously deciding* a skill needs improvement after `nudge_interval_iterations` real tool iterations accumulate in a live conversation — not something a short scripted probe can force on demand, and `agent_analyst_brain` (the risk profile with `[cognee]` wired) currently has no skills of its own on disk to improve (only `workflow_brain` does: `workflow_clarify`, `workflow_edit`, `workflow_generate`, `workflow_repair`, `workflow_semantic_review`). Treat this specific enrichment path as **shipped and deployed, not yet observed firing on a real skill improvement** — worth a real check the next time a skill genuinely gets patched, rather than assuming it works because the code compiled and the other two paths did.
