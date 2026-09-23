# ADR-017 — TypeSafe-shaped judgments for Cerveau, with no Jev dependency

**Status:** Proposed (2026-09-23).
**Date:** 2026-09-23
**Related:** [ADR-015](ADR-015-CERVEAU-TOOL-CALLING-VS-HERMES.md) (tool-calling shape), [ADR-016](ADR-016-CERVEAU-MEMORY-RECALL-QUALITY.md) (recall quality; its shadow-eval discipline is reused here), `evals/typesafe-jev/` (question definitions + harness + LLM baseline).
**Basis:** the [`typesafe-ai` skill](https://github.com/typesafe-ai/skills/tree/main/skills/typesafe-ai) (`SKILL.md`) plus the [live TypeSafe docs](https://docs.typesafe.ai/llms.txt) (patterns: confidence-routing, intent-routing, composite-scoring; cookbooks: `llm_guardrails`, `rerank_typesafe`, `citation_check`, `sde_cascade`), read with the assumption **no Jev API is used**.

---

## 1. Decision in one paragraph

Adopt the TypeSafe **design contract** — narrow typed judgments (`Choice` / `Score` / `Noul` + `confidence`) with **policy applied in code, not in prompts** — while implementing the judge itself on Cerveau's existing LLM provider via structured output. No Jev API key, no new vendor dependency, no new network path in the turn loop. Jev (or any calibrated judge) stays a swappable backend later: the question definitions (`evals/typesafe-jev/questions.json`) and the policy (`decide.py`) do not change when the backend does.

## 2. Why the skill is still useful without the model

The skill factors into two independent halves, and only one needs Jev:

| Half | Needs Jev? | What we take |
|---|---|---|
| System One model (fast, calibrated Choice/Score/Noul answers) | Yes | Nothing now; emulated with structured-output LLM calls |
| Programming model (code owns workflow; model supplies narrow judgments; confidence gates action; thresholds per stakes) | **No** | Everything in §4 |

The failure mode the skill is designed against is already Cerveau's lived experience: the 09-17 gate removal ("explicit instruction IS the approval") vs the 09-18 Lex write-loop rollback shows a **binary** gate cannot express "confident enough to act, otherwise confirm, otherwise park". Confidence-gated routing (`confidence-routing.md`: check-balance at ≥0.6, approve-transfer only above 0.85, confirm in between) is exactly that missing third state, and Cerveau already has the surfaces for all three (execute / conversational Ya-Batal / F-1 park).

## 3. What exists today (verified 2026-09-23)

- `evals/typesafe-jev/questions.json` — Choice/Score/Noul definitions for triage + BANT, already the documented single source "a later Cerveau tool should read".
- `evals/typesafe-jev/run_eval.py` — harness with `validate` / `payload` / `run` / `report`, Jev backend **and** an `--llm` OpenRouter-chat backend, response cache, USD budget cap. A deepseek baseline run already sits in `results/`.
- `evals/typesafe-jev/thresholds.json` — pre-registered pass criteria (accuracy-oriented).
- What is missing: the **policy layer** — nothing turns answers into `execute / confirm / escalate` decisions. That is P0 of this ADR (`decide.py`, shipped with it).

## 4. Adaptations, in priority order

| # | Pattern (source) | Cerveau application | Phase |
|---|---|---|---|
| 1 | Confidence-gated routing | Three-state write gate: confident + low-stakes → execute; high-stakes or mid-confidence → conversational confirm; low-confidence or policy-hit → F-1 park. Replaces per-tool binary flips. | P1 |
| 2 | Intent routing | Cheap classifier in front of the turn (smalltalk / read / write / multi-step) so only the relevant context/handlers load; extends the existing smalltalk fast-path instead of another full-LLM hop. | P1 |
| 3 | LLM guardrails (`llm_guardrails`) | One narrow screen per inbound message with pass/review/block outcomes — gives the current WARN-only prompt guard real teeth. Informational injection signal stays non-blocking per the eval README. | P2 |
| 4 | Rerank + passage classification (`rerank_typesafe`, `classifying_rag_passages`) | Score-then-cut for memory recall candidates (feeds ADR-016 P2+); code decides what reaches the answering model. | P2 |
| 5 | Citation check (`citation_check`) | One judgment per risky claim (invoice figures, stock, amounts) against retrieved source before answering or PDF-ing. | P2 |
| 6 | Composite scoring (`composite-scoring`) | BANT/lead scoring as atomic per-dimension judgments combined with weights in code; re-weight without re-inference. | P3 |
| 7 | SDE cascade (`sde_cascade`) | Cheap extract → verify → reasoning-model-only-on-failure, for document/invoice parsing. | P3 |

Deferred: speculative fan-out, hierarchical classification, entity alignment (no live Cerveau problem needs them yet).

## 5. Plan

- **P0 — Policy layer (this change).** `evals/typesafe-jev/decide.py`: pure functions `decide_triage(answers)` / `decide_bant(answers)` mapping Jev-shaped answers (from *any* backend: fake, Jev, `--llm`) to `{action, reasons}` with per-stakes thresholds in code, plus offline unit tests. No network, no key, stdlib only. `run_eval.py report` prints a DECISIONS section from the same module (informational, never gates PASS/FAIL), and `services/cerveau/skills/judge/` stages the judge contract + `questions.json` for the next `./sync.sh deploy` (verified it would transfer; not deployed here — deploy restarts the daemon).
- **P1 — Shadow compare. DONE 2026-09-23** (`shadow_compare.py`, committed with P0). `decide.py` over stored backends:
  - deepseek (`--llm`, 97 cases triage+bant): agreement vs gold policy **89/92**; triage escalation recall **26/26**, zero over-escalation. The misses are confirm/handle splits on non-escalate cases, which the binary gold reference cannot adjudicate.
  - fake_jev (67 triage, ~1/7 answers corrupted by construction): 57/62 — the corrupted cases correctly sink to confirm/escalate on lowered confidence, which is the designed behaviour, not a policy failure.
  - Cross-backend decision agreement deepseek vs fake: 49/67; divergences are almost all deepseek=confirm vs fake=handle, i.e. the policy degrades gracefully to confirm under a less-confident backend and never jumps a level (no handle↔escalate flips except on corrupted cases).
  - Gate met: escalation recall 26/26 with no over-escalation. P2 may proceed after the rebase.
- **P2 — Cerveau `judge` tool (after the v0.8.5 rebase).** A narrow tool reading `questions.json`, calling the existing provider with a JSON schema, returning typed answers; the turn loop applies `decide.py`-equivalent policy in Rust. Shadow mode first (decisions logged, behaviour unchanged), same discipline as ADR-016 §20.
- **P3 — Recall/citation/scoring consumers** (§4 items 4–7), each gated on its own shadow numbers.

## 6. P2 tool spec (no deploy in this change — needs the v0.8.5 rebase window)

A narrow Cerveau tool, e.g. `judge_write` / `judge_triage`, with this contract:

- **Input:** `{state: <named JSON fields>, questions: <subset of questions.json by ID>}`. The tool reads question definitions from the same `questions.json` (synced to the VPS via `services/cerveau/sync.sh` alongside skills), never from prompt prose.
- **Judge call:** one bounded provider call (existing model route, temperature 0, JSON-schema response: `{choice|score|noul, confidence}` per question), with step-timeout + cost-budget accounting per the standing rebase rule. No retry loop beyond the single retry owner.
- **Policy:** `decide.py`-equivalent thresholds ported to Rust; outcomes map to existing surfaces only — `handle` (execute), `confirm` (conversational Ya/Batal), `escalate` (F-1 pending row). No new approval surface is created.
- **Shadow first:** decisions logged with `trace_id` alongside the live path; behaviour unchanged until the shadow numbers match P1 on real traffic. Converse of the smalltalk-speed lesson in STATUS 09-22: every new event carries `trace_id` from day one so its latency is joinable.
- **Out of scope for P2:** recall rerank, citation check, composite BANT (P3, each with its own shadow gate).

## 7. Non-goals

- No Jev/OpenRouter-vendor commitment; no tenant data leaves current paths (fixtures stay synthetic, same rule as ADR-016).
- No cookbook numbers adopted as targets (12.2× cheaper etc. are their-domain results; every threshold is calibrated on Cerveau data).
- No new retry or network hop inside the 180s turn budget; the judge is one bounded call with timeout + budget accounting, per the standing rebase rule.
- Injection judgment stays informational — never a security boundary, never the sole escalate trigger.
