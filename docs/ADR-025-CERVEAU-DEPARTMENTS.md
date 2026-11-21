# ADR-025 — Departments: an organisation layer over the delegation engine, with Aira at the top and shared services beside the leaders

**Status:** Draft 2026-11-21, not yet reviewed. Nothing built. Every "today" claim below was read on 2026-11-21 from `ops/cerveau-config/config.redacted.toml` (a redacted mirror, **not** live `config.toml`), `ADR-020`, and the `avry-user-dashboard` repo. Anything not read is in §8.
**Related:** ADR-008 (delegation engine, depth, bounded mode), ADR-014 (envelope and ledger), ADR-020 (active agents, Teams, `X-Active-Agents`), ADR-021 (agent-to-agent tools), ADR-009 (scheduled runs). Source analysis: `docs/ORKAS-ADOPTION-PLAN-2026-11.md` in `avry-user-dashboard` (workstream D, decisions D1 to D6).

## 1. Decision

Add **departments** as a data-driven organisation layer on top of the existing delegation engine. Departments answer who reports to whom, who may delegate to whom, and what ceilings apply. They do **not** replace Teams (ADR-020): a Team still decides who sees whom in a room or channel; a department decides authority.

1. **Aira is always the root.** Every request enters through Aira, who routes to a **leader** or a **shared service**, never directly to a department's staff.
2. **Leader** = the incumbent agent of a domain (Lex for Sales, Teo for Support, Finn for Finance, Mira for Marketing, Juno for Operations, Ivo for Data and Reporting, Ofira for Admin/Office). A leader delegates to its own staff and to shared services.
3. **Staff** = worker agents inside a department (none today; custom workers later, workstream E of the plan). Staff delegate to nobody; cross-department asks go up to the leader or Aira and are recorded as handoff packets (ADR-014 ledger).
4. **Shared service** = an agent that reports to Aira and can be called by Aira or any leader. Two at the start:
   - **DeepResearcher**, named Nara (new agent, read-only evidence-based research, available from the Business tier up).
   - **Geno**, re-scoped from generalist to **task and follow-up keeper** for cross-department work (§4.3).
5. **Shared services are executors.** A shared service cannot delegate further. This is enforced by its risk profile (`delegation_policy` not permitting delegation, no `[[delegates]]` entries) plus a runtime profile `max_delegation_depth = 1`. It is **not** expressed as `max_delegation_depth = 0`: in `delegate.rs` a value of `0` is filtered out and resolves to the default of 3 (§2).
6. **Humans stay the approvers.** Leaders are LLMs and never approve anything; the F-1 gate and the Approvals page are unchanged.
7. Agent identity in all departmental tables is an `agent_ref`, not an `agent_type` enum, so custom workers can join later without another refactor.

## 2. Today (verified)

| Fact | Where |
|---|---|
| Aira's runtime profile has `max_delegation_depth = 2`; its allowed tools include `delegate` and the `team_*` set; delegation policy mode is `allow`. | `config.redacted.toml` `[runtime_profiles.agent_chief_of_staff]`, `[risk_profiles.agent_chief_of_staff]` |
| Aira delegates to its agents in `independent` mode (ADR-020 §2 says five agents). | ADR-020 §2; `[[agents.chief_of_staff.delegates]]` |
| Most other agent profiles have `max_delegation_depth = 1`; one profile has `0` (it reads like `verifier_brain`, not confirmed). | `config.redacted.toml` |
| **Depth mechanics (read from code 2026-11-21, tests not executed).** The root `DelegateTool` has depth 0. A delegation is refused when `self.depth >= max_depth`. Each hop builds a sub-delegate tool at `depth + 1` whose carried ceiling is `min(parent's ceiling, target's own profile cap)`, so a chain can only tighten. A target can sub-delegate at all only if its risk profile's `delegation_policy.permits()`. A test named `bounded_sub_delegation_depth_limit_enforced_through_chain` documents that with cap 2 caller to middle to leaf succeeds on tool depths 0 and 1 and the leaf's own attempt (depth 2) fails. | `zeroclaw-runtime/src/tools/delegate.rs` (`effective_max_depth_from_config`, `tightened_max_depth_from_config`, sub-delegate construction near line 6400, depth check near line 3776) |
| **A profile cap of `0` is not "none".** `resolve_max_depth*` filters `d > 0` and falls back to **3**. Any profile written as `0` (including the one noted above) resolves to 3 for depth purposes. | `delegate.rs` `resolve_max_depth`, `resolve_max_depth_from_config` |
| **Consequence for the leader hop.** Aira (cap 2) to a leader whose runtime profile cap is 1 carries ceiling `min(2, 1) = 1`; the leader's tool then sits at depth 1 and its own delegation is refused. With today's depth-1 specialists, Aira to leader to staff or shared service would not work. | derived from the two rows above |
| **Geno (`autonomous`) is a hub, not a leaf.** It delegates in `bounded` mode to `customer_service`, `leads_qualifier`, `finance_invoice_ops` and `office_assistant`. `finance_invoice_ops` and `office_assistant` delegate back to it, and a "Geno<->Teo room canary" exists for `customer_service`. | `[[agents.autonomous.delegates]]`, `[[agents.finance_invoice_ops.delegates]]`, `[[agents.office_assistant.delegates]]` |
| Geno's `skill_bundles` span `finance-invoice-ops`, `office-assistant`, `customer-service`, `leads-qualifier`, `tool-gate`, with matching MCP bundles (CRM, Slack and others). Its prompt is "general-purpose business assistant". | `[agents.autonomous]` |
| ADR-008 originally capped depth at one and shipped a full mesh at depth 1; Aira's depth 2 is a later change. | ADR-008 §§ on depth and "what shipped" |
| Active agents reach Cerveau as `X-Active-Agents` (allow-list, capped length) and the delegate roster becomes an intersection with them. | ADR-020 §3.2 |
| Dashboard roster has 9 agents. Tier gating is a boolean `enterprise` flag (`ENTERPRISE_AGENT_TYPES`, only `office_assistant`), shown as a lock icon; there is no minimum-tier concept. | `lib/agentRoster.ts`, `lib/agentRoster.generated.ts` |
| A 9-agent ceiling was decided on 2026-11-09 because of Aira routing accuracy (quoted from the adoption plan; `CERVEAU-NEW-AGENTS-PLAN.md` itself was not re-read here). | adoption plan §2 |
| No Aira routing eval harness was found. `evals/` contains only `typesafe-jev`; `CERVEAU-ERP-SCALING-PLAN.md` Phase 0 is a plan. | `evals/`, ERP-SCALING-PLAN |

## 3. Delegation rules

| From | To | Allowed |
|---|---|---|
| Aira | leader | yes |
| Aira | shared service | yes |
| Aira | staff | **no** (must go through the leader) |
| Leader | own staff | yes |
| Leader | another department's staff | **no** (escalate via Aira, handoff packet) |
| Leader | shared service | yes |
| Leader | another leader | no (via Aira) |
| Staff | anyone | **no** |
| Shared service | anyone | **no** (depth exhausted, executor by design) |

- Maximum depth stays two hops: Aira to leader to staff or shared service. Given the mechanics in §2, this needs these profile values:
  - **Aira:** runtime profile `max_delegation_depth = 2` (already so).
  - **Leaders:** runtime profile `max_delegation_depth = 2` (today 1). Without this the second hop is refused by the leader's tighter cap.
  - **Staff and shared services:** runtime profile `max_delegation_depth = 1`, and a risk profile whose `delegation_policy` does not permit delegation. Either alone stops a third hop; together they leave no path.
  - A leader called directly (depth 0, cap 2) can still delegate once to staff, and the staff's cap of 1 stops anything further.
  - Never use `0` to mean "cannot delegate" (it resolves to 3).
- Existing guardrails are reused, not rebuilt: `max_delegation_depth`, hourly and daily budgets per agent, `context_turn_cap`, loop detector, `velocity_gate`, and framing peer output as untrusted (ADR-008, ADR-014).
- **Permissions:** the existing containment invariant (`policy.rs`) already rejects a child broader than its parent. A department adds a **ceiling**: staff tool scope is a subset of the department ceiling, which is a subset of the leader's.
- **Budget:** one total budget per request at Aira, plus a new aggregate budget per department, so one request cannot fan out into dozens of LLM calls.

## 4. Design

### 4.1 Data model

```
departments(id, tenant_id NULL, key, name, leader_ref, created_at)       -- tenant_id NULL = system department, read-only
department_members(department_id, agent_ref, role)                       -- role: leader | staff | shared_service
-- agent_ref: agent_type for built-in agents, an id for custom workers (later); never an enum
```

Every tenant gets the system departments from the built-in roster with no setup. Tenant-defined departments and staff arrive only with custom workers.

### 4.2 Where enforcement lives

- **D1, static mapping:** the edges for system departments are static facts, so they are expressed in Cerveau config (`delegates`, `IDENTITY.md` peer list) and in the dashboard roster. No new header is needed for system departments.
- **D2, enforcement at the edge:** admission, not just prompt filtering. The delegate roster becomes the intersection of `reachable_delegate_targets`, `active_agents` (ADR-020) and the department edges, applied both in the tool schema and at admission. Tests: leader cannot delegate outside its edges; staff cannot delegate at all; shared service cannot delegate; absent or empty inputs behave as specified in §6.
- A per-tenant header (the plan's `X-Department-*` idea, modelled on ADR-020 §3.2) is only needed once tenants can define their own departments. This is a deliberate simplification of the plan's §7.6; see Q4.

### 4.3 Geno, re-scoped

Geno stops being a generalist hub and becomes the shared service that **owns cross-department tasks and their follow-through**. Aira decides and routes; Geno executes and chases.

- **Tools:** the existing task and reminder tools (`task_*`, `team_remind`, `team_delegate` only to create and track a task, not to hand work to other agents), memory and graph recall, and run results from the ledger. No new write tool to business systems.
- **Depth:** runtime profile `max_delegation_depth = 1`, and its risk profile no longer permits delegation (outbound `delegates` removed, see below). Not `0` (§2).
- **Unchanged:** `agent_type = autonomous` (hardcoded in many places), the name Geno, and the Aivory roster entry.
- **Removed from Geno:** the four toolkit skill bundles and their MCP bundles, and its outbound `delegates` to `customer_service`, `leads_qualifier`, `finance_invoice_ops`, `office_assistant`. Requests that fit no department stay with Aira as Chief of Staff.
- **Edges that remain valid:** Aira to Geno and leader to Geno are now "to a shared service". The existing back-edges from `finance_invoice_ops` and `office_assistant` to Geno are leader-to-shared-service and stay legal. The Geno-to-leader edges go away.
- **Behaviour change for current Geno users.** Today Geno answers invoice, ticket, lead and office questions by itself or via its four delegates. After the change those go to the domain leader through Aira. This needs an announcement and a before/after comparison (§7, Q2).

### 4.4 DeepResearcher

New agent (the 10th), read-only: web search and fetch, page readers, memory and graph recall, `team_*`, and `feed_read`. Reports with citations, confidence, and flagged contradictions; no outbound messages, no writes, no login-gated scraping. Prerequisites live outside this ADR and are tracked in the adoption plan: fix web search (Tavily config), verify untrusted wrapping of fetch and search output, run large research as a background delegate or schedule (180 s per-turn limit), and `feed_read`. Tier: Business and above (§5).

### 4.5 Memory

A `department` memory scope (shared department facts) above per-agent memory is wanted, but ADR-004, ADR-016 and ADR-024 may already cover part of it and were **not read** for this draft. Decide after cross-checking them; do not start D3 before.

### 4.6 Dashboard

- The Agents page groups agents under their department leader (read-only grouping in v1; editing structure waits for custom workers).
- Tier gating gains a **minimum-tier** attribute (for example `minTier: 'business'`) beside the current boolean, with server-side enforcement, because the lock icon alone does not stop a lower-tier tenant from reaching the agent by another path.

## 5. Tiers

DeepResearcher is available from **Business ($99) up** (Business and Enterprise); Operational has no access. Enterprise research needs are the driver. Because the delegate roster is already an intersection with the tenant's active agents (ADR-020), Aira only sees DeepResearcher for tenants that may use it, which also limits the routing-accuracy risk of the 10th agent to those tenants (to be confirmed, §8). Revisit access for lower tiers after one month of per-run cost data from the ledger.

## 6. Failure and transition behaviour

- If the department inputs to admission are absent, behaviour falls back to today's wiring (fail-open) during D1 and D2 rollout. This is a **transition state with an end date**: before D2 is declared done, a tenant-visible switch or release flips admission to fail-closed, and the test matrix covers absent header, empty set, and unknown agent.
- Roster inconsistencies (an agent in a department but not active for the tenant) resolve to "not delegatable", never to widening.

## 7. Phasing

| Phase | Content | Size |
|---|---|---|
| D0 | This ADR reviewed; owner decisions D1 to D6 recorded | S |
| D1 | Static mapping (config `delegates`, `IDENTITY.md` peers, roster, grouping on the Agents page); Geno re-scope (prompt, title, tool scope, remove outbound delegates, delegation not permitted); raise leaders' runtime profile `max_delegation_depth` from 1 to 2 and keep staff and shared services at 1 (§3) | M |
| D2 | Admission enforcement and the test matrix in §3 and §6; Business-tier enforcement for DeepResearcher | M |
| D3 | Department memory scope and aggregate budget (after reading ADR-004, 016, 024) | M |
| D4 | Org-chart UI and per-chain cost indicator from the ledger | M |

D0 and D1 can start in parallel with the DeepResearcher build; D2 needs DeepResearcher's edge to exist. **Prerequisite for D1's Aira-routing claims:** an eval harness for Aira routing (Q1).

## 8. Open questions and not verified

**Open questions**
- **Q1 (blocking for the 10th agent).** No routing eval harness was found. The "routing does not regress" gate cannot be met until one exists. Build the minimal replay harness first (ERP-SCALING-PLAN Phase 0 is the design), or restate the gate.
- **Q2.** Geno's current hub role (four outbound delegates, three back-edges) is removed. Confirm that is acceptable, and decide how users who rely on Geno-as-generalist are told and measured before and after.
- **Q3 (resolved from code 2026-11-21, tests not run).** Hops are counted by tool depth with a ceiling that only tightens down the chain (§2). Aira to leader to staff or shared service works only if leaders' cap is raised to 2; raising it is part of D1. Still to do: run `bounded_sub_delegation_depth_limit_enforced_through_chain` and add a leader-through-Aira case to the D2 test matrix. Raising leaders from 1 to 2 also changes what a directly-called leader may do; D2 tests must show it still stops at staff.
- **Q4.** Static config for system departments (no header) vs the plan's per-tenant header from day one. This ADR prefers static for D1 and D2.
- **Q5 (decided 2026-11-21).** DeepResearcher is named **Nara**, `agent_type` `deep_researcher`. Known risk: the "-ra" ending is close to Aira and Mira, and names drive `@mention` and routing. The routing eval includes two name-addressed cases; revisit the name if it shows name-driven misroutes.
- **Q6.** Should a shared service ever delegate? Allowing it means raising the depth limit, which contradicts ADR-008's cost containment; if wanted, it needs its own ADR.

**Not verified**
- `config.toml` live on the VPS (only the redacted mirror was read); whether the profile with depth `0` is `verifier_brain`; the full contents of Aira's `delegates` list (only the head of it was read; ADR-020 says five).
- The exact admission path in `delegate.rs` (depth counting itself was read, §2). Whether the profile written as `max_delegation_depth = 0` is in fact `verifier_brain`, and whether the fallback to 3 matters there (it may be moot if its delegation policy forbids delegation).
- That the roster intersection actually hides an agent from Aira for tenants without access (ADR-020 describes this design; its rollout status was not checked).
- `CERVEAU-NEW-AGENTS-PLAN.md` details of the 9-agent decision; ADR-004, 016, 024; the end of ADR-008 and ADR-014.
- Production state of Ivo, Juno and Mira (listed as leaders here); all "live" statements date from September 2026 documents.
