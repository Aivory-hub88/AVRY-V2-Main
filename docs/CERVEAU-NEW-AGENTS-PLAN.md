# Cerveau — three new agents: Marketing, Operations, Analyst

Status: PLAN (2026-10-26), all owner decisions made 2026-11-09. Nothing built yet.
Owner decision: add Marketing & Content, Operations & Inventory, and Data &
Reporting Analyst to the current six (Geno, Teo, Lex, Finn, Ofira, Aira).

## 1. Why these three

The current team covers sales (Lex), support (Teo), money (Finn), admin
(Ofira), general work (Geno) and coordination (Aira). Three business functions
have no owner:

| Gap | Today | New owner |
|---|---|---|
| Demand generation: content, campaigns, broadcasts | Nobody. Lex only works leads that already exist. | Marketing |
| Stock, purchasing, deliveries | Partly Geno (ERPNext stock balance, Odoo read) | Operations |
| Cross-functional numbers: weekly report, KPIs, forecast | Geno + Lex (`sales_funnel_forecast`) | Analyst |

Together they close the chain: content → lead (Lex) → order → stock (Ops) →
invoice (Finn) → report (Analyst) → owner briefing (Aira).

Cap: 9 agents total. More hurts Aira's routing and makes it harder for users to
pick the right agent. Legal/tax stays a skill under Finn, HR is next in line.

## 2. Proposed identities (names are a proposal, owner to confirm)

| agent_type | Name | Title | Ship order |
|---|---|---|---|
| `data_analyst` | Ivo | Data & Reporting Analyst | 1st, read-only, lowest risk |
| `operations_inventory` | Juno | Operations & Inventory Agent | 2nd, ERP writes, approval-gated |
| `marketing_content` | Mira | Marketing & Content Agent | 3rd, new toolkits |

Naming follows the existing pattern (short first name + title, see
`backend/avry-backend/app/routes/agent_roster.py`).

## 3. Agent specs

### 3.1 Ivo — Data & Reporting Analyst (`data_analyst`)

Jobs
- Weekly/monthly business report across sales pipeline, revenue and
  receivables, tickets, and stock: posted to the room and saved as a Google
  Sheet/Doc or PDF.
- Answer KPI questions ("what was our close rate last quarter?") with the
  query and source named.
- Forecasts: becomes the home of `sales_funnel_forecast`
  (`services/aivory-native-bridge/forecast.mjs`). Lex keeps it for his own
  pipeline; Geno drops it to shrink his prompt.
- Anomaly flags: sudden revenue drop, ticket spike, receivables ageing.

Tools (read-only on business systems)
- Od-MCP Odoo read (search_read, read_group), with **no** `odoo_execute_method`
  methods (empty list in `_ODOO_METHODS_BY_AGENT`).
- ERPNext/SAP read actions, HubSpot read, Zendesk read.
- Google Sheets/Docs/Drive write (its own report files only), `pdf-oxide`.
- `calculator`, forecast tools, new native `kpi_snapshot` (see §5.2).
- Memory/graph/task tools and `team_*` tools.
- No mail send, no ERP writes, no browser automation beyond read.

Hand-offs
- Report → Aira (`team_handoff`) for the owner briefing.
- Receivables anomaly → Finn; stock anomaly → Juno; ticket spike → Teo.

Guardrails
- Every number cites its source (system + filter + period). No number without a
  query behind it; say "not available" instead of estimating.
- Refuse unavailable what-ifs at once (lesson from the hold-rate retest,
  2026-10-11: do not loop `tool_search` looking for data that is not there).

### 3.2 Juno — Operations & Inventory (`operations_inventory`)

Jobs
- Daily stock check (scheduled run): low-stock and stock-out list per product /
  warehouse.
- Reorder suggestion: reorder point = average daily demand × supplier lead time
  + safety stock, with the inputs shown.
- Draft purchase orders to suppliers (draft only; confirming is approval-gated).
- Track incoming receipts and outgoing deliveries; flag late ones; draft
  follow-up emails to suppliers.

Tools
- Od-MCP Odoo read on `product.product`, `stock.quant`, `stock.picking`,
  `purchase.order`, `res.partner` (suppliers).
- New `_OPS_ODOO_METHODS` in `tenant_mcp_servers.py`:
  `purchase.order.button_confirm`, `purchase.order.button_cancel`,
  `stock.picking.button_validate` — all parked as F-1 approvals in Cerveau
  (not in `auto_approve`). Creating a draft PO is a normal create, also gated.
- ERPNext: `GET_STOCK_BALANCE`, `MAKE_PURCHASE_ORDER`, `MAKE_STOCK_ENTRY`
  (writes gated). SAP read + preview/validate write.
- Gmail/Outlook drafts (send gated), Google Sheets.
- New native tools `reorder_suggestion` and `record_ops_alert` (§5.2).

Hand-offs
- Confirmed PO → Finn (expect vendor bill, payment terms).
- Stock-out that blocks open sales orders → Lex (tell the customer) and Teo.
- Weekly stock summary → Ivo.

Guardrails
- Never confirm a PO, validate a transfer, or email a supplier without approval.
- Never change product prices.

### 3.3 Mira — Marketing & Content (`marketing_content`)

Jobs
- Monthly content calendar from a short brief (goals, products, promos).
- Drafts per channel: Instagram/TikTok caption + script, LinkedIn post,
  WhatsApp broadcast, email campaign, ad copy, landing copy.
- Campaign brief → tracked campaign record with UTM links, so Lex and Ivo can
  attribute leads to it.
- Research: trends, competitor content gaps (web search/browse).

Tools
- Web search / `web_fetch` / lightpanda (read).
- Google Docs/Sheets/Drive (calendar + drafts), Gmail/Outlook drafts.
- Odoo read: products (`product.template`), `crm.lead` source/medium for
  attribution; optional `utm.campaign` create (gated).
- New native tools `content_calendar_*` and `record_campaign` (§5.2).
- v1: **drafts only, no direct publishing**. Social publishing (Meta/Instagram,
  LinkedIn via Composio) is phase 2 and every post is F-1 gated.

Hand-offs
- Campaign launched → Lex (expect leads with this UTM; how to qualify them).
- "How did last month's campaign do?" → `team_ask` Ivo.

Guardrails
- Follow the tenant's persona/brand config for tone; never invent performance
  claims, testimonials, or numbers; never disparage competitors.
- Nothing leaves the building (post, broadcast, email) without approval.

## 4. Where an agent type lives today (touchpoints)

Most backend sets derive from `AGENT_ROSTER`, but several places still hardcode
the list. Each new agent touches all of these:

Backend (`backend/avry-backend`)
- `app/routes/agent_roster.py` — add 3 entries (drives `AGENT_TYPES` in
  `teams.py`, `active_agents.py`, `agent_profiles.py`, `telegram_service.py`).
- `app/database/pg_service.py` — `agent_catalog` seed rows (ON CONFLICT DO
  NOTHING, so prod needs a one-off insert too).
- `app/routes/agent_tool_scope.py` — `TOGGLEABLE_TOOLKITS` per new type.
- `app/routes/tenant_mcp_servers.py` — `_ODOO_METHODS_BY_AGENT`.
- `app/routes/agent_actions.py` — new action kinds (`report`, `stock_alert`,
  `purchase_draft`, `content_draft`, `campaign`).
- `app/services/telegram_service.py` — `AGENT_MIN_TIER` (decision §7).
- Tests: `tests/test_active_agents.py`, `test_tool_scope_*`,
  `test_tenant_mcp_servers.py`.

Cerveau (prod `/home/ubuntu/.zeroclaw-cerveau/config.toml`, not in git;
redacted mirror in `ops/cerveau-config/config.redacted.toml`)
- `[agents.<type>]` with `skill_bundles`, `mcp_bundles`, `system_prompt`.
- `[risk_profiles.agent_<type>]` — `allowed_tools` + `auto_approve`, including
  `delegate` and all `team_*` tools (product profiles are allowlists; a tool not
  listed is silently filtered — see ADR-021 rollout).
- `[runtime_profiles.agent_<type>]` — `max_delegation_depth = 1`,
  `prompt_injection_mode = "compact"` from day one (Geno's 60k-token prompt
  lesson), `max_tool_iterations = 10`.
- `[skill_bundles.*]`, `[agent_type_skill_bundles.*]`, `[mcp_bundles.*]`,
  `[agent_type_mcp_bundles.*]`. Keep each agent to ≤ 6 MCP servers.
- `[[agents.chief_of_staff.delegates]]` × 3 and
  `[peer_groups.room_team].agents` += 3.
- Workspace identity: `services/cerveau/agents/<type>/workspace/IDENTITY.md`
  (new ×3) and the teammate list in §6 of all six existing IDENTITY.md files.
- Skills: `AVRY-Cerveau` `cerveau-skills/<bundle>/` (new ×3), synced by
  `services/cerveau/sync.sh`.

Native bridge (`services/aivory-native-bridge`)
- `agents/data-analyst.mjs`, `agents/operations-inventory.mjs`,
  `agents/marketing-content.mjs` + routes `/mcp/<slug>` + `[[mcp.servers]]`
  entries in Cerveau config.

Bridge (`backend/vps-bridge`)
- `telegram-agent.js` — persona prompt map, tool map, `COMPOSIO_AGENTS`,
  workflow `agents:` lists.
- `server.js` — display-name map.

Collab (`services/collab/src/main.rs`)
- `is_known_agent` match arm (must match dashboard `KNOWN_AGENT_TYPES`).

Dashboard (`frontend/avry-user-dashboard`)
- `npm run generate:agent-roster` after the backend deploy.
- `lib/agentRoster.ts` (`ENTERPRISE_AGENT_TYPES` if gated),
  `lib/workspaceAccess.ts` `KNOWN_AGENT_TYPES`, `lib/officeRows.ts` colours,
  `components/office/AgentAvatar.tsx` + `public/agents/<type>.svg`,
  `app/agents/page.tsx` cards + i18n strings, ACL migration comment.

Odoo addon (`services/aivory-cerveau-odoo/.../models/aivory_agent.py`) —
selection list.

Marketing site (Frntend-nxt) — `WorkspaceSection.tsx`, `CervoSection.tsx`
("six agents" copy → nine) only after all three are live.

## 5. Build plan

### Phase 0 — decisions (owner, ½ day)
See §7. Nothing else starts before names and tier gating are fixed, because
they are baked into roster, identity files and UI.

### Phase 1 — cheaper agent plumbing (1–2 days) — DONE 2026-11-09 (uncommitted)
- `scripts/check-agent-type.sh <type>|--all`: 0 FAIL on all six current agents.
- `docs/CERVEAU-HANDOFF-PACKET.md`: packet schema.
- Collab: known agents now overridable with `COLLAB_KNOWN_AGENTS` (no rebuild);
  default list unchanged (chief_of_staff stays on legacy service access until
  her ACL rows are verified). 3 unit tests pass.
- Mirror `ops/cerveau-config/config.redacted.toml` refreshed from prod
  (was 2026-09-12, no `team_*`). Remaining warns: no `compact` prompt mode on
  five existing agents (Phase 2+ sets it on the new ones).
- Odoo `ROSTER` stays a static list on purpose: it feeds a DB Selection column
  evaluated at module load, so a network fetch there would break installs. The
  checker guards it instead.
Pay the debt once instead of three times:
- Collab `is_known_agent` and dashboard `KNOWN_AGENT_TYPES` read the roster
  (or a generated list) instead of hardcoding.
- Odoo addon reads `GET /api/v1/agent-roster` (already the documented intent).
- A checklist script `scripts/check-agent-type.sh <type>` that greps every
  touchpoint in §4 and fails if one is missing. Used in each later phase.

### Phase 2 — Ivo (≈ 4–5 days) — BUILT 2026-11-09, not deployed
Branches (all local, uncommitted): AVRY-V2-Main `feat/agent-ivo-data-analyst`
(worktree `~/Documents/Aivory-wt/ivo`, with the avry-backend and user-dashboard
submodules on the same branch name) and AVRY-Cerveau `feat/skills-data-analyst`
(worktree `~/Documents/Aivory-wt/cerveau-ivo`).

Done
1. Backend: roster entry, `TOGGLEABLE_TOOLKITS` (hubspot, erpnext, googledrive,
   googlesheets), catalog seed + one-off migration, no Od-MCP execute methods,
   no tier gate. `tests/test_agent_ivo.py` (7 tests); suite otherwise unchanged
   (2 failures that already exist on main).
2. Native bridge `agents/data-analyst.mjs`: `kpi_snapshot` + the existing
   `sales_funnel_forecast`. 45 tests (10 pure, 10 handler, 5 against a real
   throwaway Postgres with hand-computed expectations, rest existing). Smoke-tested
   through the real MCP route. `server.mjs` no longer demands a webhook env var for
   modules whose tools all run locally.
3. Skill bundle `data-analyst` (`analyst-rules` always inline, `weekly-report`).
4. Cerveau config (mirror): server, bundles, `agents.data_analyst`, risk profile
   (team_* + read_skill, reads auto-approved, writes parked), `compact` runtime,
   Aira delegate, `room_team`. `ops/deploy/apply_ivo_config.py` applies it to the live
   file idempotently; result is byte-identical to the mirror. IDENTITY.md for Ivo and
   the teammate line in the five others.
5. Dashboard: roster, glow colour, avatar map, card, i18n (en/id). `tsc` clean,
   1154 tests pass. Telegram persona/tools; collab default list.
6. `ops/deploy/deploy-ivo.sh` (user-run; backups, health checks, rollback).

Deviation from the original plan: `kpi_snapshot` reads Aivory's own tables
(`aivory_ops.leads/invoices/invoice_lines/tickets`), not Odoo. Odoo/ERPNext/HubSpot
figures come through the read tools, and the report must name which system each
number came from. An Odoo-backed KPI call can be added later once Od-MCP access from
a native tool is designed.

Not done / open
- Portrait `public/agents/data_analyst.svg` is a placeholder; needs the illustrated bust.
- Odoo reads for Ivo go through the dynamic `tenant_odoo__*` tools. They are not in the
  static config, so approval for them is whatever the live Od-MCP path does today.
  Verify on the canary before calling the acceptance test passed.
- Reports saved to Sheets/Docs/PDF park as approvals (not in `auto_approve`).
- Not yet run on prod: acceptance tests below (Brazos Ridge Roofing demo).
- Staging daemon `:3101` canary was not used; the deploy script goes straight to the
  live daemon with rollback. Say if you want the canary first.

Original steps:
1. Roster + catalog + tool scope + empty Odoo methods (backend PR).
2. Native `data-analyst.mjs`: `kpi_snapshot` (pulls the standard KPI set for a
   period from Odoo in one call) and re-exports forecast tools. Tests.
3. Skill bundle `data-analyst`: weekly-report recipe, source-citation rule,
   fast refusal rule.
4. Cerveau config block + IDENTITY.md; staging daemon `:3101` canary.
5. Dashboard card + avatar; bridge maps; collab.
6. Prod deploy via one user-run script (pattern of `deploy-followup5.sh`).

Acceptance (Odoo demo, Brazos Ridge Roofing)
- "Weekly report for last week" → numbers match Odoo, each with its source,
  < 120 s, ≤ 4 model steps.
- 12-week forecast reproduces the known answer (7.2 closes / USD 111,935 /
  17 leads per week needed (currently 3)).
- Room: Aira `team_delegate`s the weekly report to Ivo and gets it back.

### Phase 3 — Juno (≈ 5–6 days)
Same steps as Phase 2, plus:
- `_OPS_ODOO_METHODS` in Od-MCP connect + Od-MCP side allowlist.
- Native `reorder_suggestion` (pure math, unit-tested) and `record_ops_alert`.
- Daily stock check as a tenant scheduled run (`tenant_scheduled_runs.py`).
- Seed low-stock products in the Odoo demo (`ops/odoo-demo/seed_roofer_ops.py`).

Acceptance
- Low-stock list matches `stock.quant`; reorder quantity shows its inputs.
- Draft PO created in Odoo only after approval; confirm parks as F-1.
- Room: Juno hands a confirmed PO to Finn; Finn acknowledges.

### Phase 4 — Mira (≈ 5–6 days)
Same steps, plus:
- Native `content_calendar_create/list/update` and `record_campaign` (stored in
  the bridge DB like Lex's records; campaign rows carry UTM tags).
- Skill bundle with channel formats and brand-voice rules.
- Social publishing stays out of scope (phase 2 of Mira, separate plan).

Acceptance
- From a 3-line brief: a 4-week calendar in Google Sheets + drafts for 3
  channels, in the tenant's language and tone.
- Campaign record → Lex receives a hand-off with the UTM.
- No send/post happens without an approval.

### Phase 5 — team integration (≈ 2 days)
- Aira identity: routing table for 9 agents (which request goes to whom).
- Room E2E chain in "Test feature": Mira campaign → Lex lead → Juno stock check
  → Finn invoice → Ivo weekly report → Aira briefing.
- Marketing site copy + promo film follow-up (separate task).

Total: roughly 3½–4 weeks of build, shippable per agent.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Prompt budget / 180 s turn cap (Geno hit 60k tokens with 13 MCP servers) | `compact` skills, ≤ 6 MCP servers per agent, measure tokens on staging before prod |
| Prod Cerveau config not in git → drift | Update `ops/cerveau-config/config.redacted.toml` in the same PR; deploy script asserts the blocks |
| New tools missing from allowlists (`team_*` silently filtered) | Checklist script (Phase 1) checks `allowed_tools` for every `team_*` tool |
| Aira mis-routes between 9 agents | Explicit routing table + room E2E in Phase 5 |
| ERP writes by Juno | All execute methods gated; Od-MCP enforces per-agent method list |
| Marketing claims | Guardrail + no auto-publish in v1 |
| Model cost | Ivo/Juno on the analyst model; Mira can use a cheaper writing model |

## 7. Decisions for the owner

All decided. Phase 1 can start.

1. Names: DECIDED 2026-10-26 — Ivo (analyst), Juno (operations), Mira (marketing).
2. Tier gating: DECIDED 2026-11-09 — all paid tiers (no `AGENT_MIN_TIER`
   entry). Cost is already capped by credit metering, so a tier gate adds no
   protection. Revisit only if Ofira-style Enterprise gating is wanted for sales
   reasons.
3. Mira v1: DECIDED 2026-11-09 — drafts only. Social publishing is Mira phase 2.
4. Forecast: DECIDED 2026-11-09 — move from Geno to Ivo; Lex keeps it for his
   own pipeline.
5. Order: DECIDED 2026-11-09 — Ivo → Juno → Mira.

## 8. Borrowed from GojiberryAI Sales OS (research 2026-11-09)

Source: `github.com/romangojiberryAI/gojiberryai-sales-os` (MIT, ~1,400 lines
of markdown, no code). One orchestrator skill + 13 sales "agents" (really
role prompts) on top of the GojiberryAI MCP, which is a paid LinkedIn outbound
service. Worth borrowing the patterns, not the product.

### Do not copy
- **13 agents.** Their agents are role prompts inside one skill, not runtime
  agents. For us, 13 sales roles would break the 9-agent cap and Aira's
  routing. Those roles become skill modules inside Lex (below), not new
  agent types.
- **The GojiberryAI MCP / LinkedIn automation.** A paid third-party dependency,
  and automated LinkedIn sending risks account restrictions under LinkedIn's
  terms. Not a v1 toolkit.
- **Autonomous send mode.** For now everything stays F-1 gated (decision 3).

### Copy (with where it lands)

| Pattern | What it is | Lands in |
|---|---|---|
| Progressive disclosure | One small router `SKILL.md` + `references/*.md` loaded only for the task at hand | All three new skill bundles; matches `prompt_injection_mode = "compact"` and the prompt-budget risk in §6 |
| Handoff packet | Fixed field list every hand-off carries; unknown fields are `[NEED: x]`, never guessed | `team_handoff` payload schema: Mira→Lex (campaign + UTM), Juno→Finn (PO), Ivo→Aira (report) |
| Report skeleton | `The one thing` / Findings / `Do these first` / What's working / `What I couldn't determine` | Ivo weekly report and Aira briefing |
| Sample honesty | n < 30 = "directional only", no winner on tiny samples, separate old vs new campaigns, say when attribution can't be known | Ivo guardrails; Mira campaign reviews |
| Visible scoring | 0–100 score always shown as its parts (ICP 30 / title 20 / signal 35 / angle 15) with a cut line; below the cut = named nurture list, not deleted | Lex lead scoring (replaces bare BANT labels); same idea as Juno's reorder inputs |
| Slop catalogue | Instant-fail and soft-fail phrase list; two hits = rewrite | Mira skill bundle, merged with the banned words in `SOUL.md`; also Lex copy |
| Business context template | Product, proof (named and real), ICP, disqualifiers ("never contact"), voice, words we never use, send policy | Extend tenant persona config; Mira and Lex both read it. "Proof" and "never contact" are new fields |
| Reply labels | interested / question / warm / objection / ooo / negative / noise, each with a next owner | Lex inbox triage; negative = log and never message again |
| Follow-up cadence | Bump after 5 days, breakup note after 7 more, then stop; one purpose per note | Lex follow-ups as tenant scheduled runs |
| Status board | Count per pipeline stage + what each stage is blocked on | Aira briefing section, fed by Ivo |

### Effect on the build plan
- Phase 1: define the handoff packet schema once, so all three agents use it.
- Phase 2 (Ivo): skill bundle uses the report skeleton + sample-honesty rules.
- Phase 4 (Mira): skill bundle ships the slop catalogue and reads the extended
  business context; campaign hand-off uses the handoff packet.
- New small item, any time after Phase 1: Lex skill modules for scoring, reply
  labels and follow-up cadence (≈ 2 days, no new agent type).
