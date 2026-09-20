# ADR-016 — Cerveau memory recall quality: close the Postgres gaps, then measure before changing the ranker

**Status:** Proposed (2026-09-20). P0 done: harness plus keyword and hybrid baselines (§11-§13). P1 implemented, tested, deployed and live-verified (§16). P2 and later are gated on P0 numbers.
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
4. ~~Confirm how many tenants are near their ADR-004 row caps.~~ **Done 2026-09-20 (§10):** none is close.

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

## 10. Measured production data (2026-09-20, read-only queries on `cerveau.memories`)

| Fact | Value |
|---|---|
| Rows / embedded / agents | 549 / 512 / 74 |
| Rows with `importance` set | **0** (G1 confirmed live) |
| Largest tenant-agent | 212 rows (`t_user_d0985ab099ef142a.leads_qualifier`); next 75 and 22 |
| Default caps (`PgLifecycleConfig`) | core 2000, daily 1000, conversation 500 per tenant; age caps daily 180 d, conversation 30 d |
| Per-tier quota table `cerveau.cerveau_tenant_quota` | exists, **0 rows**: no tier override has ever been seeded, so every tenant runs on the flat defaults (an earlier draft of this ADR wrongly said the table was missing; it had queried the wrong name) |

By category and `updated_at` age:

| category | rows | 0-7 d | 7-14 d | 14-30 d | >30 d |
|---|---|---|---|---|---|
| daily | 343 | 188 | 57 | 63 | 35 |
| core | 190 | 135 | 21 | 20 | 14 |
| conversation | 16 | 0 | 3 | 13 | 0 |

Consequences for the plan:

- **G1's budget consequence is not urgent.** The biggest tenant-agent holds 212 rows against caps of 1000/2000, and age caps are 180/30 days, so importance-based pruning has not yet had a chance to choose wrongly. P1.3 stays in the plan but no longer drives priority.
- **G4 is the live problem, and it hits most of the corpus.** `daily` is 62% of all rows (343 of 549). 155 of those 343 (45%) were last updated more than 7 days ago, so after the 7-day half-life and the 0.4 floor they fall out of auto-injection unless their raw score is very high (a raw 1.0 is already 0.5 at 7 days and 0.25 at 14). Only the 190 `core` rows are exempt. This is an upper-bound reading: it does not measure how often those rows would have matched a query.
- **Priority change:** move the recency work (P3) ahead of RRF (P2). It addresses the measured problem, and unlike RRF it needs no proof that the fusion is worse. P0 still comes first, so the change is measured.
- **Corpus is dominated by one tenant plus test tenants** (`pg-test-*`, `test-lat`, `probe-*` and the 16-row `default` agent). Any benchmark golden set must be built from the real tenant and must exclude test tenants.
- The `updated_at` bucket is used because `store` upserts (`ON CONFLICT ... updated_at = EXCLUDED.updated_at`); `created_at` ages would be older.
- The quota table is empty, so the per-tier caps of ADR-004 §2 are not in effect; only the flat defaults apply. Worth a separate decision when tenants approach the defaults, not now.

## 11. P0 status (2026-09-20): harness built, keyword baseline recorded, hybrid baseline pending

**Where:** `AVRY-Cerveau` branch `feat/memory-recall-bench` (`e66d4fdc9`, `b5128d4e8`), not yet merged to `cerveau-main`. Test `crates/zeroclaw-memory/tests/pg_recall_bench.rs`, fixtures in `tests/fixtures/recall_bench/` (`corpus.json`, `baseline.json`, `gen_embeddings.py`). The corpus is fully synthetic (40 memories over three agents, 36 queries in English and Indonesian, rows aged 1-100 days); it deliberately contains **no** production rows, because the fixture is committed. Wired into the CI `postgres-tests` job.

**What it measures:** hit@5 and MRR per query kind (`exact`, `paraphrase`, `indonesian`, `old`, `multi`, `isolation`), through the real `recall_for_agents`, in two pipelines: `raw` (what `memory_recall` returns) and `injected` (raw, then the flat 7-day decay and the 0.4 floor exactly as `memory_inject.rs` applies them). It also asserts zero cross-agent leaks, including a case where the same sentence exists in two tenants. Regression tolerance: hit@5 may fall 0.03 below the recorded baseline. The detection was mutation-checked (a raised baseline makes the run fail).

**Baseline, keyword-only mode (no embeddings yet), raw pipeline:**

| kind | n | hit@5 | MRR |
|---|---|---|---|
| all | 35 | 0.914 | 0.818 |
| exact | 6 | 1.000 | 1.000 |
| indonesian | 8 | 1.000 | 0.906 |
| old | 6 | 1.000 | 1.000 |
| multi | 3 | 1.000 | 1.000 |
| paraphrase | 11 | **0.727** | **0.488** |

**How to read it, honestly:**
- The paraphrase row is the only one with headroom. It is also the row a vector channel should lift, so it is the number P2 has to move.
- These figures are **inflated by the small corpus**: each agent has about 34 rows, so a random top-5 already hits about 15% of the time, and the OR `to_tsquery` over the `simple` text-search config keeps stopwords, so a query such as "what time do reports get sent?" matches many rows on filler words. Do not compare these numbers with production; use them only to compare a change against the same fixture. A larger corpus with more distractors is the obvious next improvement and needs the embeddings step below.
- The `injected` pipeline and the whole `hybrid` mode need precomputed embeddings and are **not measured yet**. That is the number that would quantify G4 (the 7-day cliff) on the `old` queries.

**Update:** the embeddings step and the hybrid baseline are done, see §12. The "pending" statements above describe the state before that.

## 12. P0 result: hybrid baseline and what it says about G4 (2026-09-20)

`embeddings.json` (75 vectors, `text-embedding-3-small`, 768 dims, same as production) was generated on the VPS using its existing OpenRouter key inside the remote shell; the key was never printed, written to a file or committed, and the temporary directory was removed. The baseline was recorded on Postgres 17 with pgvector 0.8.6 (CI uses Postgres 16 with pgvector; scoring is the same SQL). Branch `feat/memory-recall-bench`, commit `ebb94aae6`.

hit@5 by pipeline (35 answerable queries):

| kind | n | raw | floor only (0.4) | injected (7-day decay + 0.4) |
|---|---|---|---|---|
| all | 35 | 1.000 | 0.771 | **0.286** |
| exact | 6 | 1.000 | 1.000 | 0.500 |
| paraphrase | 11 | 1.000 (MRR 0.909) | 0.455 | 0.364 |
| indonesian | 8 | 1.000 | 0.750 | 0.125 |
| multi | 3 | 1.000 | 1.000 | 0.333 |
| old (answer aged 18-70 d) | 6 | 1.000 | 1.000 | **0.000** |

**Findings**

1. **Retrieval itself is not the problem.** Raw hybrid recall finds the answer in the top 5 for every query, and ranks it first for almost all (MRR 0.971). The keyword-only paraphrase weakness (0.727) disappears once vectors are on. **This weakens the case for P2 (RRF):** on this fixture there is nothing left for it to win, so it stays gated and is likely to be dropped unless a larger corpus shows otherwise.
2. **The injection filter discards most of what retrieval found.** From 1.000 raw to 0.286 injected. Two causes stack:
   - **The 0.4 floor is close to typical relevance (new finding, call it G5).** The expected answer's raw hybrid score averages about 0.49 (max 0.70), regardless of age. With vector score `1 − cosine` weighted 0.7, a correct match rarely scores far above 0.4. The floor alone removes 23 points of hit@5 (paraphrase falls to 0.455, Indonesian to 0.750) with **no** decay at all.
   - **The 7-day half-life then finishes the job.** A non-Core memory with a raw score of 0.5 drops below 0.4 after **2.3 days**; 0.6 after 4.1 days; 0.7 after 5.7 days; even a perfect 1.0 lasts only 9.3 days. So in practice a non-Core memory is auto-injected for roughly its first week at best. Only `core` rows are exempt.
3. **Corrects the wording of §9.** §9 said rows fall out "after 7 days". The measured horizon is 2 to 6 days for a typical match.

**Caveats:** the fixture's answers are mostly aged rows (2 of 35 expected hits are 7 days old or less), while production has 188 of 343 `daily` rows in that first week, so the loss in production is smaller than 0.286 for fresh-heavy traffic but of the same nature for anything older. The corpus is small and synthetic; treat the figures as a yardstick for comparing changes, not as production hit rates.

**Consequences for the plan**
- **P3 becomes the main work item and grows.** It must fix both the decay curve and the floor: the floor should be applied to a score that is calibrated (rank-based or normalised), not to a raw hybrid similarity that centres on 0.5. Until then, tuning the decay alone would still leave 23 points on the table.
- **P2 (RRF) is downgraded** from "likely" to "only if a larger corpus shows a gain"; note that RRF scores live around 0.03, so adopting it would force the floor to be redefined anyway (rank cut-off instead of an absolute score).
- **A cheap interim mitigation exists and is reversible:** lowering `memory.min_relevance_score` (for example to 0.2) and/or turning `rerank_enabled` on (which replaces the decay with a recency blend) are config-only changes. Rerank's importance term is still 0 until P1 (G1), so its effect is recency plus retrieval only. Neither should be applied to production before the benchmark shows the result with that setting; the harness can be extended with these variants in an hour.
- P1 is unchanged and still worth doing (G1, G2 are real defects), but it is no longer on the critical path for the user-visible symptom.

## 13. Candidate variants measured (2026-09-20, `feat/memory-recall-bench` after `ebb94aae6`)

The harness now replays the same candidate pool through ten injection variants, so a proposed change can be judged before anything is deployed. `neg` is the share of five no-answer queries that correctly return nothing (ideal 1.00); `ret` is the mean number of memories shown per query. `raw` is the backend's own top 5 and is shown for reference.

| variant | what it is | hit@5 all | paraphrase | indonesian | old | neg | ret |
|---|---|---|---|---|---|---|---|
| `injected` | **production today**: 7-day decay, floor 0.4 | 0.286 | 0.364 | 0.125 | 0.000 | 1.00 | 0.3 |
| `decay_f0.3` | config only: floor 0.3, decay kept | 0.314 | 0.364 | 0.250 | 0.000 | 1.00 | 0.5 |
| `decay_f0.2` | config only: floor 0.2, decay kept | 0.457 | 0.545 | 0.375 | 0.000 | 0.60 | 1.9 |
| `rerank_f0.4` | config only: `rerank_enabled=true`, floor 0.4 | 0.457 | **0.091** | 0.500 | 0.667 | 1.00 | 0.5 |
| `rerank_f0.3` | config only: `rerank_enabled=true`, floor 0.3 | **0.800** | 0.545 | 0.750 | 1.000 | 0.80 | 1.4 |
| `rerank_f0.2` | config only: `rerank_enabled=true`, floor 0.2 | 0.971 | 0.909 | 1.000 | 1.000 | 0.60 | 4.9 |
| `floor_only` | code: no decay, floor 0.4 | 0.771 | 0.455 | 0.750 | 1.000 | 1.00 | 1.0 |
| `nodecay_f0.3` | code: no decay, floor 0.3 | 0.914 | 0.727 | 1.000 | 1.000 | 0.80 | 1.8 |
| `nodecay_f0.2` | code: no decay, floor 0.2 | 1.000 | 1.000 | 1.000 | 1.000 | 0.40 | 4.7 |
| `rerank_imp_f0.4` | needs P1: rerank, heuristic importance stored, floor 0.4 | 0.829 | 0.636 | 0.750 | 1.000 | 0.80 | 2.2 |
| `rerank_imp_f0.3` | needs P1: same, floor 0.3 | 0.943 | 0.818 | 1.000 | 1.000 | 0.60 | 5.0 |

**Reading**
1. **Lowering the floor while keeping the decay barely helps** (0.286 to 0.314 at 0.3, 0.457 at 0.2). The decay is the dominant cause; the floor cannot compensate for it.
2. **Turning rerank on with the current floor is worse than it looks.** The blend is `0.7·hybrid + 0.2·importance + 0.1·recency`; with importance always 0 (G1) a correct match scoring 0.49 blends to about 0.44 at best, so the unchanged 0.4 floor still removes most of them (paraphrase 0.091). **Do not enable `rerank_enabled` without also lowering `min_relevance_score`.**
3. **The best config-only option is `rerank_enabled=true` with `min_relevance_score=0.3`:** 0.286 to 0.800, while still returning nothing for 80% of the no-answer queries and showing 1.4 memories on average. Floor 0.2 is nearly `raw` (0.971) but stops filtering (ret 4.9, neg 0.60).
4. **Storing importance (P1) is worth +0.14 to +0.37 at the same floor** (`rerank_f0.3` 0.800 to `rerank_imp_f0.3` 0.943; `rerank_f0.4` 0.457 to `rerank_imp_f0.4` 0.829). This makes P1 part of the visible fix, not only a defect cleanup. Caveat: the heuristic importance is category-based (core 0.7, daily 0.3), so part of that gain is "prefer core rows", not "prefer relevant rows".
5. **Removing the decay with a modest floor is the best trade-off overall** (`nodecay_f0.3`: 0.914, neg 0.80, ret 1.8). It needs a code change (P3), not just config.

**Limits of this measurement.** The no-answer set is five queries against an agent with only three rows, so `ret` is capped at 3 and `neg` is directional only. Answers are mostly old rows (§12 caveat). The importance variant uses the heuristic scorer, not what the model would choose. Nothing here has been applied to production.

**Recommendation (decision for the owner)**
- **Do not** flip `rerank_enabled` alone.
- **Optional stopgap, no deploy of code:** set `rerank_enabled = true` and `min_relevance_score = 0.3` in `~/.zeroclaw-cerveau/config.toml` and restart. It is global (every tenant), reversible by restoring the two lines, and would print the stale "rerank not implemented" validator warning (§9). Expected effect on this fixture: hit@5 0.286 to 0.800. Not applied.
- **Proper fix:** P1 (persist importance) then P3 (drop or slow the decay under a calibrated floor). The harness will show the gain against `injected` and enforce it in CI.

## 14. Stopgap applied to production (2026-09-20 09:46 CST)

On the owner's instruction, the config-only option from §13 was applied to `/home/ubuntu/.zeroclaw-cerveau/config.toml` `[memory]`: `rerank_enabled = false -> true` and `min_relevance_score = 0.4 -> 0.3`. No binary change.

- **Procedure:** backup `config.toml.bak-pre-rerank-20260920`; a two-line diff and nothing else; `doctor` before restart (87 ok, 23 warnings, 0 errors; the extra warning is the stale "rerank not implemented" message, §9); restart with automatic config rollback if health failed. Health 200, `NRestarts=0`, journal clean, and the config still held the change after the restart (no file watcher reverted it).
- **Probe:** a synthetic tenant stored a fact in one session and a new session, with no hint, answered it correctly ("Kopi Kita wants all invoices sent on the 25th of each month"). Probe rows were deleted afterwards. This shows the memory path works under the new setting; it does **not** measure recall quality in production, which this ADR can only estimate from the fixture (0.286 -> 0.800).
- **Rollback:** `cp -p /home/ubuntu/.zeroclaw-cerveau/config.toml.bak-pre-rerank-20260920 /home/ubuntu/.zeroclaw-cerveau/config.toml && sudo systemctl restart zeroclaw-cerveau`. Note: this backup is from 09:35 CST; any config change made after that by another process would be lost by a full restore, so prefer reverting the two lines by hand.
- **Watch for:** more memories now reach the prompt (mean about 1.4 per turn on the fixture instead of about 0.3), so slightly more context tokens per turn; and near-duplicate collapse is now active. If tenants report irrelevant memories being quoted, raise `min_relevance_score` towards 0.35.

**Reverted by the owner (2026-09-20 09:51 CST).** The two settings were set back to `rerank_enabled = false` and `min_relevance_score = 0.4` about five minutes after they were applied (verified on the VPS: config lines, service active, health 200, journal clean). The stopgap is therefore **not in effect**; production is back to the behaviour measured as `injected` in §13 (0.286 on the fixture). The reason for the revert was not stated. Anything above that says "applied" describes the 09:46-09:51 window only. Re-applying needs the owner's explicit go-ahead.

## 15. P1 implemented (2026-09-20), not deployed

`AVRY-Cerveau` branch `feat/memory-recall-bench`, commit `88e363786` (not merged to `cerveau-main`, not deployed). Changes to `zeroclaw-memory/src/postgres.rs` and the `memory_store` tool:

1. **Importance now works end to end.** Implementing it exposed that G1 had three layers, not one: the store ignored the value, none of the ten SELECT statements fetched the column, and the reader asked for `f64` from a `REAL` column, which the driver rejects and `.ok()` silently turned into `None`. All three are fixed. An explicit value is clamped to 0-1; otherwise `importance::compute_importance` supplies one. Re-storing a key never lowers a deliberate value. The `memory_store` tool takes an optional `importance` (0-1, invalid values ignored, never a reason to lose the memory).
2. **Supersede exists.** `superseded_by` column, `AND superseded_by IS NULL` in all four ranked recall queries, `mark_superseded` / `clear_superseded` on `PostgresMemory`. Rows are kept, so a wrong call is reversible; a fresh write to the same key revives the row; a row cannot supersede itself. The tenant budget now evicts superseded rows first, then orders by importance. Nothing calls `mark_superseded` automatically (that is P4).
3. **Access tracking.** `access_count` and `last_accessed_at`, updated by one best-effort statement after each ranked recall. A failed update cannot fail a recall.
4. **Schema:** four additive columns (`ADD COLUMN IF NOT EXISTS`, nullable or constant-defaulted), now created on every deployment, not only the pgvector path. The previous binary ignores them, so a binary rollback is safe. Rows written before the upgrade keep `importance = NULL` (no backfill, as decided in §5).

**Verification.** New `pg_memory_p1` test (importance stored/clamped/defaulted/kept on re-store; supersede hidden, reversible, revived; budget keeps an old important row and evicts a superseded one first; access counts; in-place upgrade of a table created before P1) and a `memory_store` tool test. Three deliberate mutations (drop the recall filter, drop superseded-first ordering, read importance as `f64` again) each made the test fail. Existing suites unchanged: `pg_lifecycle`, `pg_embedding_recall`, `pg_v3_migration_schema_scope`, `pg_vector_init_thread`, `tenant_isolation` pass; `zeroclaw-memory` lib tests pass except `parsed_lucid_alias_drives_factory_binary_and_distinct_timeouts`, which already failed before this change. Wired into the CI `postgres-tests` job.

**Effect on recall quality.** The benchmark's `rerank_imp_*` variants, which simulated stored importance with the heuristic, now use what the backend really stores and reproduce the same numbers (`rerank_imp_f0.4` 0.829, `rerank_imp_f0.3` 0.943). The production-like `injected` variant is unchanged at 0.286: **P1 alone changes nothing the user sees while `rerank_enabled` is off**, because the time-decay arm never reads importance. Its value is that a later config or code change (rerank on, or P3) now has a real importance signal, and that the budget prune is no longer recency-only.

**Consequence for the config stopgap (§13-§14).** With P1 deployed, `rerank_enabled = true` alone (floor left at 0.4) is the `rerank_imp_f0.4` row: hit@5 0.829, no-answer queries handled 0.80, 2.2 memories shown. That is a one-line config change with a better precision trade-off than the two-line stopgap that was reverted, and it should only be considered after P1 is deployed and the owner agrees.

**New observation (G6, not changed):** `row_to_entry` reports `created_at` as the entry timestamp and the upsert never touches `created_at`, so a fact that is re-stored or corrected keeps looking old to the decay and to rerank's recency factor. Worth deciding in P3 whether ranking should use `updated_at`.

**Deploy plan (needs the owner's go-ahead):** merge to `cerveau-main`, let CI build, run the guarded deploy script (sha256, verified predecessor, doctor, atomic swap, health, rollback). First start runs four `ADD COLUMN IF NOT EXISTS` on `cerveau.memories` (549 rows; metadata-only, brief lock). Then a probe: store with and without `importance`, recall, confirm `access_count` moves.

## 16. P1 deployed and live-verified (2026-09-20 11:10 CST)

The owner merged `88e363786` to `cerveau-main` (my own push and deploy were denied by the permission classifier) and ran `deploy_p1.sh` on the VPS. CI was fully green first: `build-release`, `postgres-tests` (including `pg_memory_p1` and `pg_recall_bench`), `tenant-isolation`, `redis-tests`.

- **Deploy:** binary `4700eb4fbdefc627c1343a2fffb03fd1b507557e0655f1681517139bc03fcb79`, `doctor` 87 ok / 22 warnings / 0 errors, `NRestarts=0`, health 200, backup `/usr/local/bin/zeroclaw-cerveau.bak-pre-memp1-20260920`. Rollback is a plain binary restore (the four new columns are ignored by the previous binary). Journal since the restart: no panic, fatal or memory errors.
- **Schema on production:** `cerveau.memories` now has `access_count`, `importance`, `last_accessed_at`, `superseded_by` (checked with `information_schema`).
- **Probe (synthetic tenant, rows deleted afterwards):** the agent called `memory_store` with an explicit `importance` and once without. Stored values: explicit 0.95 kept as 0.95; the call without it got the heuristic 0.7 (core); the engine's own autosaved rows got heuristic values (0.9 for a core row containing a boost keyword, 0.4 for a daily row). A second session then asked about the fact without a hint and answered correctly; the rows it recalled show `access_count = 3` and `last_accessed_at` set. So importance is stored and read, and access counting runs on the real recall path.
- **Not exercised in production:** `mark_superseded` (no caller yet; covered by `pg_memory_p1`) and the budget ordering (no tenant is near its caps).
- **Effect on users today:** none visible, as predicted in §15, because `rerank_enabled` is still `false`. New rows carry importance from now on; the 549 older rows keep `NULL` until they are re-stored.

**Open decision (owner):** `rerank_enabled = true` with the floor left at 0.4 is now the `rerank_imp_f0.4` row of §13 on new rows (hit@5 0.829 vs 0.286 on the fixture). Note that with old rows still at `NULL` importance, their blend is the lower `rerank_f0.4` case (0.457), so the gain arrives gradually as rows are re-stored, unless a one-off heuristic backfill is approved (§5 default: no backfill). Nothing has been changed; the earlier stopgap was reverted by the owner and is not re-applied without an explicit go-ahead.

