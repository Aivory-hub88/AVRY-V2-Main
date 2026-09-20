# ADR-016 — Cerveau memory recall quality: close the Postgres gaps, then measure before changing the ranker

**Status:** Proposed (2026-09-20). Nothing implemented. P0 and P1 are ready to start; P2 and later are gated on P0 numbers.
**Date:** 2026-09-20
**Related:** [ADR-004](ADR-004-CERVEAU-MEMORY-LIFECYCLE.md) (Postgres lifecycle, embedding dims), [ADR-007](ADR-007-CERVEAU-COGNEE-INTEGRATION.md) (graph memory), [ADR-013](ADR-013-CERVEAU-STAGE2-TENANT-LEARNING.md).
**Number:** 015 is taken by `ADR-015-CERVEAU-TOOL-CALLING-VS-HERMES.md` (another session, not yet committed).
**Basis:** a read of `zeroclaw-memory` in `AVRY-Cerveau` (`cerveau-main`) on 2026-09-20, and an earlier comparison against the open-source `uteke` memory engine. The uteke mechanisms quoted in §4 come from that earlier read and must be re-verified against its source before P2/P3 start (§7).

---

## 1. Decision in one paragraph

Do **not** replace `zeroclaw-memory` and do **not** port uteke. Instead: (P0) build a cheap, repeatable recall benchmark so every later change is judged by numbers; (P1) fix four verified defects in the Postgres backend where the SQLite backend already does the right thing; (P2) replace the Postgres linear score fusion with Reciprocal Rank Fusion **only if** P0 shows it helps; (P3) replace the flat 7-day recall decay with a per-category recency curve; (P4) treat uteke's "dream cycle" and contradiction detection as research, overlapped with cognee, not as a commitment.

## 2. What the code does today (verified 2026-09-20)

Tenant memory lives in `cerveau.memories` on Postgres; production has pgvector on with `text-embedding-3-small` at 768 dims and hybrid recall (measured 2026-08-30: 123 rows, 85 embedded, 30 agents — a **small** corpus).

| # | Defect | Evidence |
|---|---|---|
| G1 | **`importance` is never written on Postgres.** `store_with_agent` takes `_importance` and ignores it; the column is only created by the pgvector migration. Every row has `importance = NULL`. | `postgres.rs:1031` (`_importance: Option<f64>`), `postgres.rs:1493-1496` |
| G2 | **Supersede is a no-op.** `superseded_by` is hard-coded `None` when a row is read, there is no such column on Postgres, and `conflict::mark_superseded` is written against `rusqlite`. Recall never filters superseded rows. | `postgres.rs:460`, `conflict.rs:42-53` |
| G3 | **Score fusion is linear over incomparable scales.** Keyword is `ts_rank_cd` (unbounded, length-dependent, ×2 for key matches) and vector is `1 − cosine`; they are added with `keyword_weight`/`vector_weight`. The weights cannot be tuned meaningfully because the two terms are not on a common scale. | `postgres.rs:597-604`, `1168-1175` |
| G4 | **Recall decay is one flat 7-day half-life for everything non-Core**, applied at injection time. **Confirmed live (2026-09-20): `memory.rerank_enabled = false`**, so this is the path that runs in production, and it is followed by `min_relevance_score = 0.4`. | `decay.rs:5-6`, `memory_inject.rs:334`, live `/home/ubuntu/.zeroclaw-cerveau/config.toml:558` |

**G1 has two consequences that the earlier analysis missed:**

1. **ADR-004's per-tenant budget is silently recency-only.** The budget query keeps the top-N rows per agent by `importance DESC NULLS LAST, created_at DESC` (`postgres.rs:1576`). With importance always NULL, the ordering degenerates to "newest wins": the daily prune can delete an old, important fact in favour of newer chatter. Nothing is broken today only because no tenant has hit its cap yet.
2. **The rerank plane already exists and is starved.** `rerank.rs:96` computes `entry.importance.unwrap_or(0.0)`, so on Postgres the importance term (weight 0.2) contributes exactly zero for every candidate. Fixing G1 activates code that is already shipped and tested.

Also relevant: the tenant-facing `memory_store` tool has no `importance` parameter, so the model cannot supply one even if the backend stored it.

## 3. Non-goals

- Replacing the Postgres backend, the embedding model, or the 768-dim decision (ADR-004 §3 stays).
- Any LLM call in the recall hot path. Recall must stay deterministic and free.
- Touching tenant isolation. Scoping stays by agent alias `t_<tenant>.<agent_type>`; no new tenant column.
- Re-deriving what cognee (ADR-007) already provides for relational recall.

## 4. The uteke mechanisms worth borrowing (to re-verify, §7)

| Mechanism | Why it matters here |
|---|---|
| Reciprocal Rank Fusion of keyword and vector lists | Rank-based, so no scale problem (fixes G3) |
| Type-aware recency, roughly `exp(−age/τ)` with τ per memory type | Preferences and policies should outlive chit-chat (fixes G4) |
| Salience = `0.5·importance + 0.3·log10(access_count)/3 + pin` | Gives the budget query and rerank a real signal; needs `access_count` |
| Contradiction candidates by tag overlap (Jaccard ≥ 0.3) and low cosine (≤ 0.6), batched consolidation | Cheap pre-filter before any LLM judge |
| "Dream cycle" without an LLM | Offline consolidation; overlaps with what `consolidation.rs` and cognee already attempt |

## 5. Plan

### P0 — Recall benchmark (no product change, no LLM cost)
- A fixed golden set of (query → expected memory keys) built from **real production memory rows and traces** plus synthetic paraphrases in English and Indonesian. Small (50-100 cases) is enough; the corpus is small.
- A test-only harness that loads the set into a scratch Postgres schema (same pattern as the `CERVEAU_TEST_PG_URL` tests) using **precomputed** embeddings stored in the fixture, so it costs nothing and is deterministic in CI.
- Metrics: recall@5, MRR, and a "wrong-tenant leak = 0" assertion. Baseline is recorded in this ADR before any ranking change.
- **Exit:** baseline numbers committed; a `cargo test` target that fails on a regression beyond a stated tolerance.

### P1 — Postgres parity (small, additive, low risk)
1. **Persist importance (G1).** `store_with_agent` writes `importance`; when the caller passes `None`, use the existing heuristic scorer (`importance.rs`, category base + keyword boost). Add an optional `importance` to `memory_store` (0-1, clamped). Existing NULL rows are **left as they are** by default (a one-off heuristic backfill is optional and reversible, decided after P0 shows whether it matters).
2. **Supersede for real (G2).** Add `superseded_by TEXT NULL` (idempotent `ADD COLUMN IF NOT EXISTS`, same pattern as ADR-014 A2); read it into `MemoryEntry`; filter `superseded_by IS NULL` in every recall query and in the budget query. **Mark, never delete**, so a false positive is reversible. Do not enable automatic conflict marking in this phase: only the column, the filter, and a `memory_supersede` code path exist. Automatic detection waits for P4.
3. **Make the budget meaningful (follows from G1).** Once importance is populated, the ADR-004 budget query needs no change; add a test that an important old row survives a prune that a newer low-importance row does not.
4. **Access tracking (prerequisite for salience).** Add `access_count INT NOT NULL DEFAULT 0` and `last_accessed_at`, updated best-effort on recall hits with a single batched `UPDATE`. Failure to update must never fail a recall.

Rollback for all of P1: the previous binary ignores the new columns, so a binary rollback is safe (same property as ADR-014 A2).

### P2 — Reciprocal Rank Fusion (gated)
Replace the additive `keyword·w + vector·w` expression with two ranked CTEs fused as `Σ 1/(k + rank)` (k = 60), in SQL, keeping the existing OR-`to_tsquery` behaviour (ADR-004 §4b). **Gate:** ship only if P0 shows recall@5 or MRR does not regress and improves on paraphrase cases. If it does not, drop P2 and record the result here. Keep the old expression behind a config switch for one release.

### P3 — Type-aware recency (gated on P0 and on the live `rerank_enabled` check)
Give each memory category its own decay constant instead of one 7-day half-life, applied inside the existing rerank stage (not a second decay pass). Core and pinned stay evergreen. Concrete constants are chosen from P0 results, not guessed now.

### P4 — Consolidation and contradictions (research only)
Evaluate whether uteke's tag-overlap contradiction pre-filter is worth adding **on top of** `consolidation.rs` and cognee. Deliverable is a short comparison with P0 numbers, not code. Not scheduled.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Heuristic importance is crude and could pin the wrong rows | Heuristic is only a default; the model can pass an explicit value; benchmark checks the effect |
| A wrong supersede hides a still-true fact | Mark-not-delete, filter is reversible, no automatic marking in P1 |
| RRF worsens results on a very small corpus (rank fusion needs enough candidates) | P0 gate; config switch back to linear |
| Access-count writes add load on the recall path | Single batched best-effort update; skip if the pool is busy; measure in P0 harness |
| Schema change on the shared production table | Idempotent `ADD COLUMN IF NOT EXISTS`, nullable/defaulted, same deploy guard script pattern as ADR-014 |

## 7. Open items to settle before P2/P3

1. ~~Read the live config for `memory.rerank_enabled`.~~ **Done 2026-09-20:** `rerank_enabled = false`, `rerank_threshold = 5`, `min_relevance_score = 0.4`, `search_mode = "hybrid"`, `vector_weight = 0.7`, `keyword_weight = 0.3`, `retrieval_stages = ["cache","fts","vector"]`, `embedding_dimensions = 768`, `vector_enabled = true` (see §9).
2. Re-verify the uteke figures in §4 against its source; they were carried over from an earlier read.
3. Decide whether to backfill importance for the existing rows (default: no).
4. Confirm how many tenants are near their ADR-004 row caps, to know how urgent the budget consequence of G1 is (use the `ops/cerveau-ledger-health.sql` style of read-only query on the VPS).

## 8. Consequences

**Good:** the shipped rerank and budget code start working as designed; every ranking change is backed by a number; risk stays low because P1 is additive and P2-P4 are gated.
**Cost:** P0 is real work before any visible improvement; the corpus is small, so some effects will be within noise and the honest outcome of P2/P3 may be "no change".

## 9. Live configuration finding (2026-09-20)

Read from the production config, `[memory]` section. Consequences:

- **G4 is live, and stricter than "flat decay".** With rerank off, auto-injected recall is `apply_time_decay` (7-day half-life) and then dropped if the score is below `min_relevance_score = 0.4`. A non-Core memory whose raw hybrid score is 0.8 falls below 0.4 after 7 days and is **not injected**; at 14 days a raw 0.8 becomes 0.2. Only `Core`-category rows are exempt. So whether a fact survives in the auto-injected context depends on which category the agent chose when calling `memory_store`. The explicit `memory_recall` tool does not decay, so the agent can still find such rows by asking, but it will not see them unprompted.
- **Turning `rerank_enabled` on today would not help.** The rerank blend replaces decay, but its importance term is 0 for every Postgres row (G1). Recency alone would replace the flat decay. Fix G1 first, then evaluate enabling it in P3.
- **The config validator's message is stale.** `schema.rs:11805-11812` still says the rerank stage "is not yet implemented", yet `memory_inject.rs:318` runs it. Harmless while the flag is off; if we turn it on, the warning will appear and should be removed as part of P3.
- **The `purge_after_days = 30` / `archive_after_days = 7` / `conversation_retention_days = 30` keys do not govern Postgres rows** (ADR-004 §1). Retention for tenants is the ADR-004 lifecycle job only.
- **Not yet measured:** which categories tenants' agents actually store under. That determines how many rows are exposed to the 7-day cliff. Add a read-only count of `cerveau.memories` by `category` and age bucket to P0 (one query on the VPS, no product change).
