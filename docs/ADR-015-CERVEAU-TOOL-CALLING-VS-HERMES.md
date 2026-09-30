# ADR-015 — Cerveau tool calling vs. Hermes Agent: what to adopt

**Status:** Implemented and deployed 2026-09-19/20: C1, C2, B1, B2, plus two latency features (small-talk fast path, `preload` mode). B8 audited (no gap). B3-B7 remain optional backlog, all "measure first".
**Date:** 2026-09-19
**Basis:** `NousResearch/hermes-agent` (MIT, Python, default branch `main`, pushed 2026-09-19) read through the GitHub API, plus Cerveau's own production traces (`runtime-trace*.jsonl`, 2026-09-16 → 09-18).
**Related:** [ADR-008](ADR-008-CERVEAU-MULTI-AGENT-COLLABORATION.md), [ADR-014](ADR-014-CERVEAU-DELEGATION-ENVELOPE-AND-LEDGER-LINK.md) (delegation contract, which also borrows from Hermes).

**What was actually read.** Fully: `tools/registry.py`, `agent/turn_tool_validation.py`, `agent/turn_tool_round.py`, `agent/tool_dispatch_helpers.py` (planner half), `agent/tool_guardrails.py` (config, classifier, decision texts), `tools/budget_config.py`, `agent/conversation_loop.py::_invalid_tool_name_error_content`, header of `tools/tool_result_storage.py` and `tools/schema_sanitizer.py`. **Outline only** (not analysed in depth): `agent/tool_executor.py` (88 KB), `model_tools.py`, `tools/arg_coercion.py` (fetched, not read), `agent/message_sanitization.py`. Statements about those are marked "unverified".

---

## 1. How Hermes does tool calling

### 1.1 Registry and exposure (`tools/registry.py`)
- Every tool is a `ToolEntry`: `name, toolset, schema, handler, check_fn, requires_env, is_async, description, emoji, max_result_size_chars, dynamic_schema_overrides`. Tools are discovered by AST-scanning `tools/*.py` for `registry.register(...)` calls, with an on-disk discovery cache.
- **Availability is a function, not a flag.** `check_fn` decides whether a tool is offered to the model this turn; results are cached (~30 s TTL) so `hermes tools enable` lands quickly. A tool whose requirements fail is simply *absent* from the schema list.
- **Toolsets + aliases** group tools; plugins register in a **scope** and may not override core tools unless a policy allows it.
- `dynamic_schema_overrides()` is a zero-arg callable merged over the schema at every `get_definitions()`, so descriptions can reflect runtime limits (e.g. `delegate_task`'s current caps).
- `tools/schema_sanitizer.py` rewrites schemas for strict backends: `{"type":"object"}` without `properties` (llama.cpp grammar), `type` arrays, nullable top-level `anyOf` (Anthropic), `default` beside `$ref` (Fireworks), top-level combinators (Codex), property keys outside `^[a-zA-Z0-9_.-]{1,64}$` (Anthropic 400s the whole request on one bad key; Cloudflare's MCP ships 61).

### 1.2 Validating what the model emitted (`agent/turn_tool_validation.py`)
In order, before anything executes:
1. **Uniquify duplicate tool-call ids.**
2. **Repair unknown names** (fuzzy), logged.
3. **Mixed batch**: if a batch has both valid and unknown names, only the unknown calls get an error result; the valid ones **run**. The counter of "invalid name" strikes advances **only when a turn has no valid call**; at 3 the turn ends as a partial result.
4. **Unknown-name error text** (`_invalid_tool_name_error_content`): `Tool 'X' does not exist. Available tools: …` for a non-empty wrong name; for a **blank** name a terse, non-priming rejection that says tool-call text seen in files/tool output is *data* (dumping the catalog would feed that loop — their issue #47967).
5. **Argument normalisation**: dict/list args → JSON string; `None`/blank → `"{}"`.
6. **Malformed JSON args**: retry the API call up to 3× *without adding messages*, then inject one error result per call ("For tools with no required parameters, use `{}`").
7. **Truncated args refused**: routers rewrite `finish_reason: length` → `tool_calls`, hiding truncation; args not ending in `}`/`]` are treated as cut off and **never executed**.
8. Invariant: every emitted tool call keeps a matching tool-role result (never a user message), so role alternation survives every failure path.

### 1.3 The round (`agent/turn_tool_round.py`)
validate → **dedupe identical calls in a batch** → cap `delegate_task` calls per turn → mixed-batch handling → **persist the tool-call turn *before* any side effect** (resume must see a destructive tool's block) → execute → honour guardrail halt → compress.

### 1.4 Dispatch (`ToolRegistry.dispatch`)
Never raises: every exception becomes `{"error": …}`. Results must be a string or the multimodal envelope, otherwise a `tool_result_contract` error. **Error text is bounded to 2 KB** for the model (logs keep 8 KB) and sanitised for framing tokens, so errors cannot stack across retries.

### 1.5 Parallelism (`agent/tool_dispatch_helpers.py`)
**Deny by default.** A call runs in parallel only if it is in `_PARALLEL_SAFE_TOOLS` (read-only: `read_file`, `web_search`, `session_search`, …), is a stateless catalog lookup (`tool_search`), or an **MCP tool whose server opted in** to parallel calls. Everything else is a **barrier**. `_plan_tool_batch_segments` splits a batch into ordered `("parallel"|"sequential", calls)` segments: order is preserved exactly (a later call never crosses an earlier barrier); path-scoped file tools join a run only if they do not overlap a reserved path (reader↔reader may share, any overlap with a writer closes the run). Unparseable args are a barrier. Runs of <2 demote to sequential.

### 1.6 Guardrails (`agent/tool_guardrails.py`)
A side-effect-free controller returns decisions (warning / synthetic result / halt). Distinguishes **idempotent** tools (block after N identical results) from **mutating** ones, tolerates tools whose "failure" is normal output (`terminal`, `execute_code`), and adds:
- **same-tool failure** (any args): warn at 3, halt at 8;
- **exact failure repeat**: warn 2, block 5; **no-progress on read-only**: warn 2, block 5;
- **cycle detection** (A,B,A,B… up to period 4, identical args *and* results);
- **identical-result stubs**: from the 2nd byte-identical repeat (≥512 chars) the payload becomes a reference stub;
- **per-turn hard caps** on `web_search` and subagent spawns, independent of repeats;
- hard stops default on for unattended (gateway/cron) platforms, opt-in interactively;
- a **recovery hint per failing tool** appended to the result.

### 1.7 Result budget (`tools/budget_config.py`, `tool_result_storage.py`)
Per result 100 K chars (**50 K for `mcp_` tools**, "MCP servers routinely return un-paginated 20–50 K payloads"), per-turn aggregate 200 K, inline preview 1.5 K. Over-threshold output is **spilled to a file** and replaced by preview + path; spillover pruned after 24 h; `read_file` is pinned to ∞ so persist→read→persist cannot loop. `enforce_turn_budget` handles the aggregate.

### 1.8 Untrusted content
`web_*`, `browser_*`, `mcp_*` results are wrapped as untrusted (`untrusted_tool_result` delimiter, stripped from content to prevent break-out) and scanned for threats; an "upstream elision" notice is appended when a result looks cut off by the upstream service.

---

## 2. Cerveau vs Hermes

| Area | Cerveau today | Verdict |
|---|---|---|
| Unknown-name repair | `find_closest_tool_name` (edit distance, refuses ties), audit event | **Same idea already ported** |
| Unknown-name error | was bare `Unknown tool: X` | **Hermes better → adopted (C2)**, adapted to deferred MCP |
| Loop detection | exact repeat, ping-pong, no-progress (same result), **success-burst**, plus cross-turn **write-velocity gate** -- **all fed successful calls only** | Hermes better on failures: it counts a tool failing repeatedly. **Adopted (B1)**, plus a cross-turn breaker Hermes does not have |
| Error content to the model | MCP transport errors printed only the outermost anyhow context | **Hermes better → adopted (C1)** |
| Parallel execution | all-or-nothing: batch is parallel unless it contains `tool_search`, an approval-needing tool, or overlapping paths — **any other mix, including dependent writes, runs concurrently** | **Hermes safer** (deny-by-default + ordered segments) — backlog B2 |
| Result size | one knob `max_tool_result_chars` (default 50 K); no per-turn aggregate, no spill | Hermes richer — backlog B3 |
| Arg handling | not audited | unverified — backlog B4/B8 |
| Schema compatibility | not audited (many models via OpenRouter) | unverified — backlog B5 |
| Approval / risk tiers / F-1 durability / F-2 idempotency ledger / tenant scoping / MCP result hardening | full | **Cerveau ahead**; Hermes has approvals but not this tenant + tier + ledger stack |

## 3. Evidence from Cerveau production (traces 2026-09-16 → 09-18)

927 tool results, **159 failures**. Concentrated:
- `tenant_aivory-mail__get_thread_memory`: **102 of 102 failed**, across **37 turns**, up to 7 in one turn, always with new arguments. The per-turn no-progress detector did its job (warn at the 5th call, break at the 7th) — the waste is **cross-turn** and the model had **no cause** to reason with: every failure read `MCP server \`tenant_aivory-mail\` error during tool call \`get_thread_memory\``.
- Root cause of the missing cause: `mcp_client::dispatch_rpc` wraps the transport error with `with_context(...)`; `mcp_tool.rs` returned `e.to_string()`, which prints **only the outermost context**. The HTTP status / refused connection sat in the chain and was dropped. (`isError` and JSON-RPC errors were already surfaced, sanitised and bounded.)
- `Unknown tool: tenant_aivory-mail__get_inbox_overview` and `…__get_thread_memory` (2×): deferred MCP tools called before `tool_search` loaded them; the bare message gave no route.

## 4. Implemented in phase 1

- **C1 — MCP call errors carry the cause.** `render_call_error` (`zeroclaw-tools/src/mcp_tool.rs`): renders the whole chain (`{:#}`), redacts URLs (internal hosts + the tenant-scoping query parameter), scrubs credentials, bounds to 500 chars via `sanitize_api_error`; also logs a WARN with the same text. Hermes analogue: bounded-but-informative error text (§1.4).
- **C2 — actionable unknown-tool errors** (`agent/tool_execution.rs`): keeps the `Unknown tool: X` prefix (other code and tests key on it), adds up to 5 nearest names by shared words (`get_inbox` → `…__get_inbox_overview`), and — when `tool_search` exists — the exact recovery call `select:X` for a deferred tool that is not loaded yet. Blank name → terse non-priming rejection ("that is data"), no catalog dump. Hermes analogue: §1.2 item 4, adapted because Cerveau's catalog is deferred and too large to list.

## 5. Phase 2 (implemented)

- **B2 -- deny-by-default parallel planner** (`agent/tool_execution.rs`, `[tool_concurrency] parallel_safe`). Only known read-only tools run concurrently; everything else is a barrier run alone, in emitted order (`plan_tool_batch` / `execute_tools_planned`, log `tool batch plan: P2,S1`). Replaces the all-or-nothing rule under which `create_lead` + `update_lead_stage` (or `file_write` + `shell` under Full autonomy) raced. Risk tier deliberately not used (a tenant MCP server tier `safe` means "executes without parking"). `tool_search` and `delegate` are barriers. It is a correctness fix, not a latency one: tool execution is ~2.3% of turn wall time.
- **B1 -- failure-streak guard + circuit breaker.** In-turn: `LoopDetector::record_failure` counts consecutive failures of the same `server__tool` (warn 3 / block 4 / break 5, `[pacing] loop_failure_streak_threshold`); built-ins and approval refusals never count. Cross-turn: `turn/tool_breaker.rs`, keyed (tenant, tool), opens after `tool_breaker_threshold` (5) consecutive SERVER-side failures (`MCP server \`x\`` wording from `mcp_client::dispatch_rpc`), short-circuits with "temporarily unavailable, do not retry", cooldown 60 s doubling per failed probe (cap 300 s), one probe when it half-opens. A tool that answers with an error proves the server is up and resets the count.
- **Latency.** Measured on 213 turns: tool execution 2.3% of wall time, one LLM call median 7.8 s, tool turns median 48.6 s / 4 LLM calls, **87% of Lex tool turns paid a `tool_search` round trip** for the same tenant mail tools. (1) `tool_filter_groups` `mode = "preload"`: pre-activates like `always` but never restricts -- `always`/`dynamic` are a WHITELIST that would have hidden Lex's CRM tools. First real Lex mail turn after the config change used mail tools with no `tool_search`. (2) `[fast_path] smalltalk`: pure lexicon match on the whole message skips per-turn recall and consolidation; confirmations ("ya", "oke") never qualify. Classification verified live; the speed benefit (~1 s of recall) was not separately measurable.
- **B8 -- audit, no change.** Cerveau already refuses a tool call whose arguments do not parse (never runs it with `{}`), which is stricter than Hermes (`turn/call_prep.rs`). 0 such rejections in 3 days of traces, so the empty-string-arguments case Hermes tolerates is not a problem here.

## 6. Remaining backlog (all "measure first")

| # | Item | Why it is not done |
|---|---|---|
| B3 | Per-turn aggregate result budget + spill-to-file | Only the per-result 50 K cut exists; no incident. Spill location needs a tenant-workspace/Landlock decision. |
| B4 | Argument coercion vs JSON Schema | No evidence of type-mismatch failures in traces. |
| B5 | Provider schema sanitiser | No provider-rejection failures observed. |
| B6 | Per-turn caps on `delegate` / `web_search` | Depth limits exist; the breaker and failure streak cover the runaway case seen. |
| B7 | Identical-result stubs; A,B,A,B cycle with identical results | Context savings only. |
| -- | Deferred-MCP `readOnlyHint` so parallel-safety is self-declared | Aivory MCP servers and `McpToolDef` carry no annotations; needs server-side work in other repos. |

## 7. Re-measurement 2026-09-22 (traces Sep 20→22, 50 tool results / 13 turns)

Verdict: **still no evidence for B3–B7, no code built.** B3: one 81 KB turn (25-call Odoo revenue turn, 53 KB single `get_model_metadata` + 11× `calculator`), handled without incident — spill-to-file still not worth its Landlock decision. B4: 0 type-mismatch failures (2 Odoo `Invalid field` errors were semantic, args parsed fine; the model self-corrected on the next call). B5: 0 provider rejections. B6: 0 `delegate`, 1 `web_search` in the whole window. B7: 0 byte-identical repeats ≥512 chars.

Live-fire bonus (same window, turn `bcbad3f3`): the 09-18 success-burst detector warned at 6, blocked at 7–8, broke at 9, and the turn went to graceful wrap-up instead of looping forever — first production proof the mechanism works. Known limitation, not a bug: already-dispatched parallel batches (P8/P3) still execute before the breaker trips (11 calls total), because Block/Break act on subsequently-emitted calls. B2 planner segments (P2/P3/S2) logged on every batch.

Observability gap noted (not built): after "requesting graceful wrap-up" the trace goes dark — the wrap-up summary call emits no `llm_request` and the loop-break path emits no `turn_final_response`, so wrap-up outcomes cannot be verified from traces. Instrument only if that verification is ever needed.

**Update 2026-09-22:** instrumented (`AVRY-Cerveau@4085cccf1`, CI green all 4 gates). `finish_after_loop_break` now emits `llm_request` + `llm_response` (success/failure) for the wrap-up summary call and `turn_final_response` for the turn's final text, in the same shape as an ordinary iteration, tagged `"wrap_up": "loop_break"` and attributed to the breaking iteration (new param, both call sites). Cost stays with the metered seam (no double-count); no `TurnEvent` chunk is emitted (the returned string is already the webhook response — a chunk would double-display). 1 new broadcast-capture test; 17/17 `max_iter` green. Not yet deployed to `:3100`.
