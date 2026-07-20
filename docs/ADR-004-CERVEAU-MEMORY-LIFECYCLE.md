# ADR-004 — Aivory Cerveau Phase 3: Memory Storage & Lifecycle

**Date:** 2026-07-17
**Status:** Accepted; implementation in progress
**Context:** Phase 3 of [DEPLOYABLE_AGENT_RUNTIME_PLANNING.md](DEPLOYABLE_AGENT_RUNTIME_PLANNING.md). Seam read of the fork's `zeroclaw-memory` at v0.8.3.

---

## 1. The finding that reshapes Phase 3

The plan (and the Memory Storage Budget section) assumed we could "reuse zeroclaw-memory's lifecycle in place." That is only true for the **SQLite** backend. Verified in v0.8.3:

- `hygiene::run_if_due` — retention pruning, archival, and **budget compaction** (`budget::compact_category_to_budget`) — opens a **SQLite** connection at `workspace_dir` and archives **markdown/session files**. It never touches the Postgres backend.
- `PostgresMemory` implements storage, hybrid keyword+vector recall, and **surgical** deletes (`forget`, `purge_session_for_agent`, `purge_agent`) — but **no retention pruning, no budget/quota, no decay-driven eviction**.
- What *is* backend-agnostic: `consolidation::consolidate_turn` (LLM distill-before-embed, writes through the injected `Memory`, so tenant-scoped when the memory is tenant-scoped) and `decay::apply_time_decay` (recall-time ranking only, not storage pruning).
- **Correction (found live 2026-07-18):** `consolidate_turn` has **no call sites** — `DefaultMemoryStrategy` is never constructed anywhere in the v0.8.3 runtime. Automatic distill-after-turn does not run; memory writes happen only when the agent invokes the `memory_store` tool. Wiring the strategy into tenant turns is a queued fork patch (**P-consolidation**).

**Consequence:** naively enabling `vector_enabled = true` on Postgres yields an **unbounded-growth** store — exactly the 650 GB/yr failure the budget math warned about. Cerveau must **build** the Postgres lifecycle. (Decision confirmed with Irfan 2026-07-17: build it, don't defer.)

## 2. Design — set-based, tenant-scoped, one query for all tenants

Because every tenant's rows live in one shared `memories` table keyed by `agent_id`, a single **windowed SQL statement enforces per-tenant budget across all 10k tenants at once** — simpler *and* more scalable than SQLite's per-file approach.

- **Retention prune** (per category, age-based; `core` is durable and exempt):
  `DELETE FROM memories WHERE category=$1 AND created_at < now() - make_interval(days=>$2)`.
- **Per-tenant budget** (keep top-N per agent by importance then recency, delete overflow):
  a `row_number() OVER (PARTITION BY agent_id ORDER BY importance DESC NULLS LAST, created_at DESC)` filtered to `rn > cap`.
- **Per-tier quotas**: a `cerveau.tenant_quota(agent_id, category, max_rows)` table LEFT JOINed into the budget query; `COALESCE(q.max_rows, default)`. The bridge/resolver populates it from the tenant's tier (foundation < pro < enterprise — same tiering as Office Assistant). Absent row → default cap. This keeps the whole thing one query while giving per-tier caps.

Driver: a periodic tick (cron/systemd-timer or a runtime maintenance task) invoking `run_lifecycle`; the work is set-based so cadence is cheap. Landed as a tested primitive first (`PostgresMemory::run_lifecycle` + `init_lifecycle_schema`); the daemon-supervision driver wiring is a thin follow-up.

## 3. Embedding decision (locked before first ingestion — changing dims = re-embed everything)

- **Dimensions: 768** (down from the 1536 default). 4× storage reduction vs 1536-float32 once paired with halfvec; negligible retrieval-quality loss at this corpus scale.
- **Model: `text-embedding-3-small` with `dimensions=768`** (Matryoshka-native reduced dims; ~$0.02/M tokens). Swappable via `custom:<url>` for an OpenAI-compatible endpoint.
- **Scalar type: `vector` (float32) at 768 for v1** (3 KB/vec, already half of 1536). **`halfvec(768)`** (1.5 KB/vec) is a follow-up `ALTER COLUMN embedding TYPE halfvec(768)` — a non-re-embedding migration, so it is not gated on this decision. Only the dimension count is irreversible, and it is now locked at 768.

Steady-state disk with distill-before-embed + these settings: ~2k memories/tenant × ~1.5–3 KB ≈ 3–6 MB/tenant → ~30–60 GB at 10k tenants. Fits the 60–80 GB budget.

## 4. Exit-gate mapping (Phase 3)

A 90-day synthetic tenant shows **flat (asymptotic) disk** after consolidation + lifecycle kick in; a >10 MB upload is rejected at both bridge and engine (Phase 3.4). The lifecycle primitive is verified by integration tests against a real Postgres service container in CI.

## 4b. Phase 3.2 deployment status & queued follow-ups (2026-07-18)

**Live and verified on `:3100` against production `avry-postgres`** (Irfan-authorized): `cerveau` schema auto-created (agents/memories/schema_version), tenant turn on the Postgres backend, tenant-scoped write proven end-to-end (`memory_store` → row in `cerveau.memories` attributed to `t_cerveau_smoke.cs`), cross-tenant blindness re-verified live, lifecycle timer live (daily 03:30, interim psql driver), throwaway `cerveau_e2e` dropped. Config: `memory.backend=postgres`, dims 768, `vector_enabled=false` (see below), new webhook secret, `auto_approve=["memory_store","memory_recall"]` on the analyst risk profile (memory ops are the agent's own state, not external side effects — full approval tiering is Phase 4.3).

Queued follow-ups from live findings:

1. **Upstream bug #2 — pgvector init panics from async context:** `PostgresMemory::new` with `vector_enabled=true` runs `try_enable_pgvector` on the calling thread; constructed from the daemon runtime it panics "Cannot start a runtime from within a runtime" → crash-loop. CI missed it (tests use vector=false). Fork fix: move the call onto the init/OS thread (upstreamable). Until then `vector_enabled=false`.
2. **avry-postgres image lacks the pgvector extension** (`pg_available_extensions` has no `vector`): enabling vectors needs an image swap to `pgvector/pgvector` in a maintenance window + an embedding API key (OpenAI — OpenRouter has no embeddings API). Keyword-only recall meanwhile.
3. **P-consolidation** — wire distill-after-turn (see §1 correction).
4. ~~**P-recall-scope** — session-scoped recall.~~ **Root cause re-diagnosed (2026-07-18): NOT session scoping.** The `memory_store`/`memory_recall` tools already pass `session_id=None` (store at `memory_store.rs:96`, recall at `memory_recall.rs:106`), so tenant memory is already tenant-wide across sessions. The real bug: the Postgres backend built its keyword filter with `plainto_tsquery`, whose implicit **AND** requires every query term to be present — so recall("preferensi pengiriman pelanggan VIP") missed a row saying "lebih suka pengiriman" (no "preferensi"). The earlier session-A "recall" was actually the model answering from in-session conversation history, masking the miss. **Fixed (patch 0006):** `recall`/`recall_for_agents` compose an **OR** `to_tsquery` from the query's own lexemes (ranked top-k by `ts_rank_cd`), matching how retrieval should behave; punctuation-only queries yield a NULL tsquery (no match, no error). Validated live via psql and in `pg_lifecycle` scenario 4.

## 5. Upstream bug found (upstreamable fix)

The v3 memory migration (`zeroclaw-config/src/schema/v2.rs::migrate_postgres_memory_to_v3`) gates constraint creation on `SELECT 1 FROM pg_constraint WHERE conname = 'memories_agent_id_notnull_chk'` **without scoping to the table's schema**. `pg_constraint.conname` is not unique across schemas, so two same-named `memories` tables in different schemas being migrated concurrently interfere: the second sees the first's constraint, skips its own `ADD ... NOT VALID`, then `VALIDATE CONSTRAINT` fails because the constraint doesn't exist in *its* schema. Cerveau production uses a single `cerveau` schema so this never triggers there; it only surfaced in per-schema parallel tests. The correct upstream fix scopes the existence check via `pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=<schema> AND t.relname=<table>`. Candidate to upstream (per the fork-maintenance strategy).
