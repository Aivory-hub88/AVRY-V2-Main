# Aira routing eval

Question this answers (ADR-025 Q1): **does adding the 10th agent (DeepResearcher), and re-scoping Geno from
generalist to task/follow-up keeper, make Aira route requests worse?** The 2026-11-09 nine-agent ceiling exists
because of routing accuracy; this is the regression net its lifting needs.

It does not prove the live system is accurate. It compares the same requests across three rosters.

## Conditions (same 50 cases in each)

| Condition | Delegable agents | Geno |
|---|---|---|
| `baseline` | 8 (Teo, Lex, Finn, Ofira, Ivo, Juno, Mira, Geno) | generalist (today) |
| `plus_dr` | 9 (+ DeepResearcher) | generalist |
| `plus_dr_geno` | 9 | task and follow-up keeper |

Aira itself is the root and is not delegable; the dashboard roster counts it, which is why the "nine agents"
ceiling and the 8 here are the same set plus Aira.

## Contents

| File | What it is |
|---|---|
| `cases.jsonl` | 50 synthetic requests, EN / ID / mixed. Groups: `regular` (28, one clear owner), `confusable` (6, research-flavoured but owned by someone else), `research` (8, should go to DeepResearcher), `geno_scope` (6, task/follow-up), `direct` (2, Aira answers itself) |
| `roster.json` | Aira's system prompt (from the redacted config) and a one-line scope per agent per condition. **Approximations** of what the live prompt shows. Replace with the real text before trusting absolute numbers |
| `thresholds.json` | Pass criteria, **fixed before any model call** (2026-11-21). Edit before the first real run, not after |
| `run_eval.py` | `validate`, `payload`, `run`, `report` (stdlib only) |
| `test_run_eval.py` | Offline self-test, no network or key. The stub router's numbers mean nothing |

All text is synthetic. No production or tenant data.

## Run

```bash
python3 run_eval.py validate
python3 test_run_eval.py                        # offline
python3 run_eval.py payload res-1 plus_dr --model <model>   # inspect one exact request
AIRA_EVAL_API_KEY=... python3 run_eval.py run --model <model> --k 3
python3 run_eval.py report results/<file>.jsonl
```

`AIRA_EVAL_BASE_URL` defaults to OpenRouter. Use the model Aira actually runs on (`model_provider` in its
agent config) or the numbers answer a different question. 450 calls at k=3.

## What is measured

- `baseline_domain_acc`: sanity check that the harness and model route clear cases at all.
- `domain_regression_*`: accuracy drop on regular + confusable cases versus baseline. This is the gate.
- `research_to_dr`: research cases that actually reach DeepResearcher.
- `dr_false_capture`: non-research cases wrongly sent to DeepResearcher.
- `geno_scope_acc` and `geno_false_capture`: after the re-scope, Geno gets task/follow-up work and no longer
  absorbs domain work.

## Limits

- Synthetic prompt, not Cerveau's assembled prompt, tools or `delegate` roster. Real-LLM evals are opt-in
  (Tier B in `CERVEAU-ERP-SCALING-PLAN.md` Phase 0), never the default CI path.
- About 34 domain cases: one flip is about 3 points. Read the per-case diff the report prints, not only rates.
- Three rosters changed at once in `plus_dr_geno`; `plus_dr` isolates the DeepResearcher effect.
- Labels are one author's judgement of the "narrowest capable specialist"; have a second person review them.
