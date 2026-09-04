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

**It is not yet deployed.** The fork's consolidated binary is built but not swapped in on the VPS — the live `obscura` is still upstream's 37-tool build. Deploying it requires updating, in lockstep: `tool_risk_tiers.irreversible`/`reversible`, the `auto_approve` lists that pin obscura tool names, and the five copies of `browser-tool-priority/SKILL.md` whose lightpanda→obscura fallback table names the old tools. Tracked as follow-up, not urgent.

## 6. Follow-ups

- Deploy the consolidated obscura fork (needs the lockstep config/skill rename above).
- The warning text in `agent/turn/mod.rs` says "system prompt and tool definitions" but measures only system messages. Misleading in exactly the way that cost this investigation its first hour — worth correcting upstream in the fork.
- `/home/ubuntu/open-skills` is still on disk (408 KB, now unread). Harmless, but it can go.
