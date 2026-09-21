# TypeSafe Jev evaluation fixture

Question this answers: **is Jev good enough, in Indonesian as well as English, to make the two classification
decisions Cerveau's `ticket-triage` and `bant-qualification` skills currently leave to the main LLM?**
It does not answer whether to adopt Jev; it produces the numbers that decision needs.

Nothing here is wired into Cerveau. No API key has been used; every number below is still to be measured.
Background and findings from the docs review: memory note `typesafe-jev-evaluation-for-cerveau`.

## Contents

| File | What it is |
|---|---|
| `triage.jsonl` | 67 synthetic support messages: 20 matched EN/ID pairs, plus Indonesian-native, code-mixed, near-miss and adversarial cases |
| `bant.jsonl` | 30 synthetic prospect conversations: 12 matched EN/ID pairs, plus informal, code-mixed, numeric and date cases |
| `questions.json` | The Jev question definitions under test (Choice, Score, Noul). Single source; a later Cerveau tool should read the same file |
| `thresholds.json` | Pass criteria, **fixed before any call was made** |
| `run_eval.py` | `validate`, `payload`, `run`, `report` (stdlib only) |
| `fake_jev.py` | Local stand-in API to test the harness itself. Its numbers say nothing about Jev |

All text is synthetic. No production or tenant data, so sending it to a third party is not a privacy question
(same rule as the ADR-016 recall fixture).

## What is measured

**Triage.** Per message, one request fans out seven questions: `intent` (Choice), `severity` (Score, 4 concrete
levels), and Noul for `wants_human`, `asks_refund`, `asks_deletion`, `legal_threat`, `injection_attempt`.
Code, not the model, applies the escalation policy from the skill: severity 3, or any of the four Nouls >= 0.5.

**BANT.** Per conversation, four Choice questions (`budget`, `authority`, `need`, `timeline`, each
positive / negative / unclear) plus `injection_attempt`. Code derives `qualified` / `unqualified` /
`needs_followup` with `bant_status()`. `validate` checks that the hand-written gold status agrees with that
policy over the gold dimensions, so a fixture mistake cannot be blamed on the model.

**Language.** The matched pairs are the point: same content in English and Indonesian, so any accuracy gap or
prediction flip between them is the language, not the case. The report prints the gap and the flip rate.

**Confidence.** Cases are bucketed by Jev's confidence (`<0.5`, `0.5-0.9`, `>=0.9`) to check that the
"act above 0.9, escalate below 0.5" gating from the docs actually holds on our data.

**Labels with slack.** Where two answers are defensible, the case lists `acceptable` alternatives and is tagged
`ambiguous` or similar; the report shows exact and lenient accuracy side by side. Cases with an undecidable
field list it under `unscored`.

## Running

```bash
python3 run_eval.py validate                       # offline
python3 run_eval.py payload tri-P01-id             # exact request body for one case
python3 run_eval.py probe                          # one ~$0.00001 request: auth, base URL, model name, key limit
python3 run_eval.py run --budget 0.25              # ~97 requests, about $0.004 for a full pass; hard USD cap
python3 run_eval.py report results/<file>.jsonl    # metrics and PASS/FAIL against thresholds.json
```

### Via OpenRouter (same price, $0.042 per million input tokens)

Jev is on OpenRouter as `typesafe/jev-1.13` and the alias `~typesafe/jev-latest`. It is hidden from the default model
list because its output modality is `decisions`; list it with `GET /api/v1/models?output_modalities=all`.
OpenRouter serves the same System One API, so only the base URL and key change:

```bash
export TYPESAFE_BASE_URL=https://openrouter.ai/api
export TYPESAFE_API_KEY_FILE=~/.config/aivory/openrouter-jev.key   # or OPENROUTER_API_KEY
python3 run_eval.py probe --model jev-1.13
python3 run_eval.py run --model jev-1.13 --budget 0.25
```

Use a dedicated OpenRouter key with a small credit limit rather than a production key. Responses carry
`usage.cost`, which `run` sums against `--budget` before each uncached request.

Responses are cached in `.cache/` (keyed by base URL, model and payload), so re-running `report` or repeating a
`run` costs nothing. A `run` also records per-request latency, which the docs do not state.

## Reading the result honestly

- **A FAIL means "not proven", not "unusable".** The thresholds are a starting bar, chosen up front so they are
  not tuned to the result. Change them only before the first real run.
- **Small sample.** The escalation Nouls have 4-6 positive cases each, 30 matched pairs in total. Treat the
  report as a smoke test with wide error bars. A pass justifies a bigger shadow test, not a rollout.
- **Gold labels were written by one author (an AI assistant) and need review by an Indonesian speaker**, both
  for naturalness of the Indonesian text and for the `ambiguous` calls. Do this before the first real run.
- **Not in scope.** The injection Noul is measured for information only. Jev does not treat input as hostile and
  TypeSafe's own docs say such a filter is not a security boundary, so it can add a signal but never replace the
  existing MCP tool-result hardening. There is also no comparison against Cerveau's current LLM decisions yet.

## Next steps (in order)

1. Indonesian-speaker review of `triage.jsonl` and `bant.jsonl`.
2. API key decision; ask `privacy@typesafe.ai` about subprocessors and hosting region before any tenant data.
3. `run` + `report`; record the numbers in a short ADR next to ADR-016.
4. If it clears the bar: shadow mode against real Cerveau traffic (Jev runs beside the agent, decisions are
   compared, behaviour unchanged), as ADR-016 §20 did for recall. Only then write the `typesafe_judge` tool, after
   the v0.8.5 rebase is pushed.
