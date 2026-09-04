# ADR-010 — Where Cerveau's context budget actually went

**Status:** ✅ Fixed and live-verified on both instances, 2026-09-04
**Date:** 2026-09-04

**Context:** Every Cerveau turn had been logging `system prompt and tool definitions (102219 tokens) alone meet or exceed the context budget (32000 tokens)`. The working assumption — carried in notes for weeks and stated again at the start of this investigation — was that the tool surface was to blame, specifically `obscura`'s 37 browser tools plus the other MCP servers wired into browsing-capable agent types. That assumption was wrong, and the measurements below say so plainly.

Related: [ADR-007](ADR-007-CERVEAU-COGNEE-INTEGRATION.md) §15 (an instruction-following failure this almost certainly caused), [ADR-009](ADR-009-CERVEAU-SCHEDULED-RUNS.md) (its Phase-1 tenant machinery was used to verify the fix).

---

## 1. What the number actually measured

`estimate_system_floor_tokens` (`agent/history.rs`) counts **only messages whose role is `system`**. It never looks at tool definitions at all — despite the warning text saying "system prompt and tool definitions". The number was the system prompt, alone.

Two measurements settled it:

- **`obscura`'s entire tool list is ~3,137 tokens on the wire** (37 tools, 12,551 bytes of compact JSON). That is 3% of 102,219 — the tool surface could not be the cause even in principle.
- Tool definitions never reach the system prompt as schemas anyway: `build_system_prompt_with_mode_and_autonomy` takes `tools: &[(&str, &str)]` — name and description only — and the MCP servers were being registered as *deferred stubs* (`MCP deferred: 49 tool stub(s) from 3 server(s)`), which is cheaper still.

## 2. The actual cause

```
Registered 0 skill tool(s) from 42 skill(s): crawl-websites-at-scale, file-tracker,
using-web-scraping, using-youtube-download, trading-indicators-from-price-data, …
torrent-search, … check-crypto-address-balance, … bulk-github-star, … using-nostr, …
```

Forty of those forty-two skills were the upstream **community open-skills collection** at `/home/ubuntu/open-skills/skills` — `torrent-search`, `bulk-github-star`, `get-crypto-price`, `using-nostr`, `using-youtube-download`, `city-tourism-website-builder`, `phone-specs-scraper` and friends. Nothing in that set serves any Aivory product function. Only two skills were Aivory's own (`ticket-triage`, `browser-tool-priority`), and those come from a different path entirely (`cerveau-skills/`, granted per tenant `agent_type`).

**408 KB of `SKILL.md` content ÷ 4 ≈ 102,000 tokens** — matching the reported 102,219 almost exactly.

Two config keys did it, both in `[skills]`:

| Key | Was | Why it mattered |
|---|---|---|
| `open_skills_enabled` | `true` | Opt-in upstream default is `false`. Someone turned it on; the 40 skills came with it. |
| `prompt_injection_mode` | `"full"` | Inlines every skill's **complete instructions** into the system prompt, rather than name/description metadata. |

## 3. The fix

`open_skills_enabled = false` on both instance configs (backed up first as `config.toml.bak-pre-openskills-20260904`), then a restart. `prompt_injection_mode` was deliberately left at `"full"`: with only Aivory's own two skills loading (~10 KB), full injection is no longer expensive, and switching it would change how those skills reach the model — a behavioral change with no remaining cost justification.

## 4. Measured result — live, both instances

Real `input_tokens` from `runtime-trace.jsonl`, same agents, before and after:

| Turn | Before | After | Change |
|---|---|---|---|
| Untenanted (`comms_brain`) | 118,488 | **3,631** | −97% |
| Tenant-scoped (`security_brain`, `agent_type=customer_service`, 3 MCP servers) | 118,349 | **9,678** | −92% |
| Cost per LLM call | ~$0.0077 | ~$0.00024 – $0.0006 | ~30× cheaper |

The `context budget exceeded` warning no longer appears on any turn.

**This was never a `comms_brain` problem.** The trace shows every agent paying it: `diagnostic_brain` 114,202 · `security_brain` 113,447–118,488 · `verifier_brain` 109,240 · `comms_brain` 118,337. Every LLM call Cerveau made was carrying ~110k tokens of irrelevant community skills.

**Nothing was lost.** A tenant-scoped verification turn after the change logged `Registered 0 skill tool(s) from 2 skill(s): ticket-triage, browser-tool-priority` — exactly Aivory's own skills, with its MCP bundles (`aivory-native-customer-service`, `obscura`, `pdf-oxide`) still granted. Test cron jobs and their rows were deleted afterwards.

## 5. Honest note on the obscura work that preceded this

Before measuring, this investigation forked `h4ckf0r0day/obscura` → [`Aivory-hub88/AVRY-obscura`](https://github.com/Aivory-hub88/AVRY-obscura) and consolidated its MCP surface from **37 tools to 23** (commit `d496137`), folding same-risk-tier siblings behind discriminated tools (`browser_history{action}`, `browser_tabs{action}`, `browser_elements{kind}`, `browser_read{format}`, `browser_input{mode}`, …). Merges deliberately never cross a risk tier, because Cerveau classifies approval risk per tool *name* — folding a read into a write's name would force the read to inherit the write's approval gate.

That work is real, tested (12/12), and worth keeping: a smaller, better-shaped surface under Aivory's own control. But measured honestly it saves **~120 tokens per turn (3.8% of obscura's own footprint, ~0.1% of the problem)**. It was not the fix, and it is not presented as one. The lesson worth keeping: the tool-count number was visible and intuitive, the skills number was neither — and the intuitive one was wrong by three orders of magnitude.

**Deployed 2026-09-04**, in lockstep across four surfaces, because Cerveau pins obscura tool names by string in three of them:

1. **Binary** — built by a new `aivory-cd.yml` workflow in the fork that compiles only the variant the VPS actually runs (Linux x86_64, `--features render,stealth`, confirmed against the deployed binary's impersonation symbols), smoke-tests the V8 snapshot and render path, **asserts the surface is exactly 23 tools**, and publishes to a rolling `aivory-cd` tag for token-free pull — the same CD shape AVRY-Cerveau already uses. Upstream's own `release.yml` builds 5 targets × 4 variants on tag pushes, which is right for a general release and wrong for one server.
2. **`tool_risk_tiers`** — 64 obscura references collapsed to the 23 new names, deduped (several old names map to one new one). Verified afterwards: 7 irreversible (`click`, `input`, `press_key`, `evaluate`, `fill_form`, `cookies_write`, `set_storage_state`) and 16 reversible, with an empty intersection — the tier split the consolidation was designed around, intact.
3. **`auto_approve` lists** — same rename, same dedupe.
4. **`browser-tool-priority/SKILL.md`** — 10 copies (5 bundles × 2 instances), rewritten so the lightpanda→obscura fallback table names the consolidated tools and their discriminator arguments (`browser_elements` with `kind`, `browser_wait` with `selector`/`text`, `browser_capture` with `format`, …), plus a new note that reading cookies is ungated while writing them is not.

Everything backed up first (`config.toml.bak-pre-obscura-rename-20260904`, `SKILL.md.bak-20260904`, `obscura-deploy/backup-20260904/*.upstream`). Both instances restarted, healthy, zero journal warnings.

**Live-verified:** a tenant-scoped turn logged `MCP server obscura connected — 23 tool(s) available` (was 37) and `MCP deferred: 32 tool stub(s) from 3 server(s)` (was 46), with `Registered 0 skill tool(s) from 2 skill(s): ticket-triage, browser-tool-priority` unchanged and the job completing `ok`. Test job deleted afterwards.

## 6. Follow-ups — all three closed, 2026-09-05

**The misleading warning text** (`AVRY-Cerveau@e9380741`). It read *"system prompt and tool definitions (N tokens) alone meet or exceed the context budget"* and advised reducing the tool surface — pointing at the one thing `estimate_system_floor_tokens` never measured. It now states what it counts, states what it does not, and names `[skills] open_skills_enabled` / `prompt_injection_mode` *before* the budget knob. Applied to all five locales, which all carried the same untranslated English string. `estimate_system_floor_tokens` gained a doc comment explaining why the distinction is load-bearing, and the existing regression test now asserts both that `"tool definitions"` is **absent** and that `"[skills]"` is **present** — the misleading wording cannot come back quietly.

**`/home/ubuntu/open-skills` removed** (956 KB on disk, not the 408 KB of `SKILL.md` alone). Checked first that `ensure_open_skills_repo` returns `None` before touching the directory when the flag is off, so nothing re-clones it and nothing errors on its absence; both instances restarted clean afterwards. It was a plain clone of `github.com/besoeasy/open-skills`, so re-enabling the feature would simply fetch it again.

**Fork version** now `0.2.1-aivory.1` (`AVRY-obscura@894570f`). Upstream tags releases without bumping `workspace.package.version` on `main`, so building from main reported `0.1.0`. That mattered more than cosmetics: `obscura --version` is the only thing distinguishing the binary Cerveau runs — with its 23-tool surface — from a stock upstream one. The suffix states the real relationship rather than borrowing a version this fork no longer matches.
