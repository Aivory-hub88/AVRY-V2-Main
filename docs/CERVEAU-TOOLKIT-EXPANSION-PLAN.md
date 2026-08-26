# Cerveau Toolkit Expansion Plan — Gmail, Google Calendar, Trello/Linear

**Status:** ✅ executed and verified 2026-08-23 — all 6 phases live in production, both instances
**Created:** 2026-08-23
**Related:** `CERVEAU-ERP-INTEGRATION-PLAN.md` (the exact wiring pattern this plan reuses), `ADR-007-INTEGRATION-OAUTH-DIRECTORY.md` (Option A precedent, and the still-open "Product tracking" decision this plan closes), `CERVEAU-STATUS.md` (2026-08-23 unified Integrations tab entry — the 5-toolkit list this plan extends)

## Goal

The unified Integrations tab (shipped 2026-08-23) correctly trims the toolkit list to the 5 platforms Cerveau's config actually wires (Zendesk, HubSpot, Slack, Asana, ERPNext) — confirmed live against both running instances. That trim surfaced two real, pre-existing gaps worth closing next, not new problems it created:

1. **Two `blueprintPlanner.ts` category defaults resolve to platforms Cerveau can't act on at all.** `DEFAULT_INTEGRATION_BY_CATEGORY` (`frontend/avry-user-dashboard/lib/workflows/blueprintPlanner.ts:162-174`) defaults the "Email" category to **Gmail** and "Calendar/scheduling" to **Google Calendar** — neither has ever had a Cerveau MCP server. Every generated blueprint that declares one of those categories names a platform the deployed agent literally cannot use.
2. **ADR-007's "Product tracking" decision is still open.** A real generated blueprint (`blueprintPlanner.graphDeterminism2.test.ts`) declared `'Product tracking system'` and correctly fell through to `needsClarification` — no default exists between **Trello** and **Linear**, both otherwise ready. **Decided 2026-08-23: wire both**, not one — see Phase 2.

## Key finding that shrinks this scope well below the ERPNext project

Gmail, Google Calendar (`googlecalendar`), Trello, and Linear are **already fully defined, real, OAuth-connectable entries** in `lib/integrations/store.ts`'s `APP_CATALOG` — icons, `oauthProvider`, `oauthScopes`, everything. The old 40-app Connections tab already let users connect all four; they were simply never wired to grant the agent any tools (the same "dead-end" pattern true of the other ~35 apps that got trimmed).

Confirmed by reading `CustomizeAgentModal.tsx`'s Integrations-tab render loop: the toolkit rows shown are driven entirely by `agent_tool_scope.py`'s `TOGGLEABLE_TOOLKITS` dict (`Object.entries(toolScope?.tools ?? {})`), and the connect button path is fully generic — `isApiKey = slug === 'erpnext'` is the *only* special case in the whole component; every other slug already uses the existing OAuth `startOAuthConnect()`/`getConnectedApps()`/`revokeConnectedApp()` path live since Zendesk.

**Consequence:** unlike ERPNext, this expansion needs **zero new frontend code, zero new API routes, zero new encryption path**. It is purely: Composio catalog curation + Cerveau config wiring + two small dict additions (`TOGGLEABLE_TOOLKITS`, `TOOLKIT_LABELS`) + risk tiers. The composio-connection-sync poller fix shipped today already covers every agent type these could land on — no further poller work needed, only a verification check in Phase 5.

---

## Phase 0 — Composio catalog curation ✅ **executed 2026-08-23**

Execution record:

- **Catalog**: live query returned Gmail 23 tools, Google Calendar 28, Trello **150** (not 100 — first pull was page-limited, re-queried), Linear 21.
- **Real safety finding, not anticipated in the draft plan**: Linear's catalog includes `LINEAR_RUN_QUERY_OR_MUTATION`, a wildcard tool that executes arbitrary GraphQL against the account — **excluded outright**, same class of decision as ERPNext's `CREATE_WEBHOOK` exclusion (a single opaque tool call that bypasses risk-tiering entirely, since the config can't classify what an arbitrary mutation does).
- **Curation**: Gmail 23→14 (7 read / 1 draft-write `CREATE_EMAIL_DRAFT` / 6 hard-floor send+delete actions), Google Calendar 28→13 (6 read / 4 draft-write / 3 hard-floor), Trello 150→10 (4 read / 5 draft-write / 1 hard-floor), Linear 21→12 (7 read / 4 draft-write / 1 hard-floor).
- **Membership trial — real rejections this round, unlike ERPNext's clean first pass**: Google Calendar's `FREE_BUSY_QUERY` and Linear's `GET_ALL_LINEAR_TEAMS` rejected (redundant with kept tools, dropped without loss). Trello rejected 4: `CARD_UPDATE_BY_ID_CARD`, `ADD_BOARDS_LISTS_BY_ID_BOARD`, `ADD_CARDS_ID_MEMBERS_BY_ID_CARD`, `ADD_CARDS_LABELS_BY_ID_CARD` — all four exist in the public catalog listing but are rejected by the stricter MCP-server-creation endpoint (the exact "HubSpot-style" quirk this plan anticipated). List-creation and one label variant had working alternates (`ADD_LISTS`, `ADD_CARDS_ID_LABELS_BY_ID_CARD`); **card-update and member-assignment have no accepted alternate — genuinely unavailable for v1**, disclosed here rather than silently dropped.
- **Production MCP servers live** (Composio-hosted, zero new VPS processes): `aivory-gmail-mail` (14 tools), `aivory-googlecalendar` (13 tools), `aivory-trello-tasks` (10 tools), `aivory-linear-tasks` (12 tools). All four created as trials then renamed in place (`aivory-googlecalendar-scheduling` first attempt hit Composio's 30-char name limit, corrected). Account verified to hold exactly 10 servers total (6 pre-existing + 4 new), no orphans.
- **Auth configs**: all four toolkits already had a Composio-managed auth config from the old 40-app Connections tab's prior use (`gmail-aiv0ry`, `googlecalendar-aiv0ry`, `trello-aiv0ry` — OAuth1, `linear-aiv0ry`) — no new auth config provisioning needed.

Original phase steps (for reference):

1. `GET /api/v3/tools?toolkit_slug={gmail|googlecalendar|trello|linear}`, trial the curated set against `POST /api/v3/mcp/servers` the same way every prior round did.
2. **Reuse, don't re-derive**: `backend/vps-bridge/telegram-agent.js`'s `COMPOSIO_CURATED` already has a live-verified Gmail slug — start from that, not from scratch.

## Phase 1 — Risk tiering (reuse the dual-mode design, no new design work)

Same `[risk_profiles.*]` supervised-mode pattern as ERPNext (`erp-semi`/`erp-auto` shape, `level = "full"` never used). Per-toolkit classification, flagged where it's a real judgment call rather than a mechanical copy:

- **Gmail — `SEND_EMAIL` classified `irreversible`.** An email, once sent, cannot be unsent — arguably a harder floor than ERPNext's `SUBMIT_DOCUMENT` (which at least has a cancel path). Read-type actions (list/search) `reversible`/`auto_approve`, same shape as ERPNext's reads.
- **Google Calendar — decided 2026-08-23: `reversible`, dual-mode gated, not a hard floor.** `CREATE_EVENT` goes in the same bucket as ERPNext's draft-level writes and Asana's task creation — `erp-semi`: prompt every time; `erp-auto`: standing-grant auto-approve. Explicitly **not** treated like Gmail's hard floor. This was the user's own call, made with the "confirm-before-execute" rule already standing from the ERP plan front of mind — restated here since it's the operative safety net regardless of tier: **the agent always states what it's about to create (title, time, attendees) before calling the tool, in both modes** — auto-approval in `erp-auto` means no *human sign-off wait*, it never means no confirmation message. Same rule already governs every ERPNext write; nothing new is being introduced, just applied to Calendar explicitly since it was called out.
- **Trello/Linear — `CREATE_TASK`/`CREATE_ISSUE` as draft-level writes.** Directly matches Asana's already-wired tiering (`ASANA_CREATE_A_TASK` etc. sit in `reversible`, gated `erp-semi`-style) — use Asana's live config as the literal template, not a fresh design.

## Phase 2 — Agent-type assignment (approved 2026-08-23, as drafted — mirrors ERP plan Phase 2)

| Toolkit | Agent types | Rationale |
|---|---|---|
| Gmail | `office_assistant`, `leads_qualifier`, `finance_invoice_ops` | Broadest reach of any candidate here — correspondence, outreach, and sending invoices/receipts are all real email use cases already implied by each persona's existing scope. |
| Google Calendar | `office_assistant` | Scheduling is core to this persona already (it has OfficeCLI + native meeting-summary tools). |
| **Trello AND Linear** (decided 2026-08-23: wire both, not one) | `office_assistant` | **Both run alongside Asana, not replacing it.** `office_assistant` keeps Asana and gains two more task-tracking surfaces. The connection gate already scopes tools to what a tenant actually has connected (`apply_toolkit_connection_gate` — a tenant who never connects a given toolkit sees no change at all), so the real cost is only the edge case where one tenant connects more than one task tracker at once — handled in §2.1, not by removing choice from everyone else. Three simultaneous task-tracker connections for one tenant is a real possibility now, not just two — §2.1's disambiguation approach (platform name in tool description + one clarifying question) already generalizes to N tools, no redesign needed. |
| `autonomous` | union of whichever ships | Same standing convention as every prior toolkit. |

### 2.1 Multi-task-tracker disambiguation — natural language only, never a command

**Binding design constraint (user's explicit instruction, 2026-08-23):** the agent must be operable entirely through plain-language prompts. The target user base is majority non-technical operators — a slash-command or explicit tool-selector UI to disambiguate "which task tracker did you mean" is not an acceptable design, even as a fallback.

**Grounding check, not assumed:** Cerveau's fork *does* have a real `slash_commands` mechanism (`zeroclaw-config/src/schema.rs:14610`, `SlashCommandScope`) — but it's a **Discord-channel-specific, opt-in feature, `false` by default** (`zeroclaw-channels/src/discord/mod.rs`), unrelated to Aivory's actual channels (Telegram/webhook/dashboard chat). It must not be reached for or extended to solve this — doing so would be solving a non-coder UX problem with a coder-shaped mechanism that doesn't even exist on the channels these agents actually run on.

**The only edge case that needs handling**: a tenant who has connected *both* Asana and Trello/Linear, where a single "create a task" style message is genuinely ambiguous between two live tools. Two natural-language-only mechanisms, not mutually exclusive:
- **Tool descriptions carry the platform name explicitly** ("Create a card in Trello" vs. "Create a task in Asana") — this is what the LLM's own tool-selection already reads, so a message that names a platform ("add this to Trello") already disambiguates for free, zero new code.
- **When the user's message names no platform and two tools could satisfy it, the agent asks one short clarifying question in the conversation** ("Trello or Asana for this one?") **rather than guessing silently or refusing** — ordinary conversational behavior, not a UI affordance. This is prompt/system-instruction work (a line added to the relevant skill/persona prompt), not a runtime feature — no new tool, no new config schema, no new approval-gate interaction.

**Explicitly out of scope for this plan**: a settings toggle for "default task tracker," a `/trello` or `/asana` prefix, or any UI requiring the user to pre-select a platform before chatting. If real usage later shows the clarifying-question approach is annoying at scale, that's a future refinement — not a reason to introduce command syntax now.

## Phase 3 — Composio-side provisioning + Cerveau config wiring ✅ **executed 2026-08-23**

Execution record:

- Patch script (`patch_toolkits.py`) built and dry-run validated against copies of both live configs first (`tomllib` parse + full diff review) before touching production, mirroring the "assert every marker string exists verbatim" discipline.
- Applied symmetrically to both instances: 4× `[[mcp.servers]]` (`composio-gmail-mail`, `composio-googlecalendar-scheduling`, `composio-trello-tasks`, `composio-linear-tasks`, each `requires_composio_toolkit` + `tenant_entity_query_param = "user_id"`), 4× `[mcp_bundles.*]` (`mail-gmail`, `scheduling-calendar`, `tasks-trello`, `tasks-linear`), `agent_type_mcp_bundles` additions exactly per Phase 2's table, `[tool_risk_tiers]`: 11 hard-floor `irreversible` entries (Gmail send/delete/trash ×6, Calendar delete ×3, Trello delete-card, Linear delete-issue) + 38 `reversible` entries (24 reads + 14 draft-writes), 24 read-tool entries added to `risk_profiles.agent_analyst_brain.auto_approve`. Draft-writes deliberately **not** added to auto_approve — matches ERPNext's stricter-than-HubSpot launch posture, satisfying the "Agent harus konfirmasi dulu ke user" instruction: default Prompt-per-call until a future config-only flip, exactly the same story as ERPNext's own documented "future autonomous mode."
- Backups: `config.toml.bak-pre-toolkit-expansion-20260823` on both instances. `doctor` identical before/after on both (78 ok, 11 warnings, 0 errors).
- Staged restart: `:3100` → 8s + 90s stability window (active, health 200, `NRestarts=0`) → `-b` → joint 90s window. Final state: both active, health 200/200, `NRestarts=0` both, `aivory.uk` 200.

## Phase 4 — Backend/frontend labels ✅ **executed 2026-08-23**

- `agent_tool_scope.py`: `gmail`/`googlecalendar`/`trello`/`linear` added to `TOGGLEABLE_TOOLKITS` exactly per the approved Phase 2 table. Committed alone (clean diff, zero unrelated drift in this file) as `5af3de7`, pushed directly to `aivory-hub/main` (confirmed clean fast-forward, no rebase needed). `py_compile` clean.
- `CustomizeAgentModal.tsx`: 4 new `TOOLKIT_LABELS` entries. Committed alone as `e5383b9`, pushed to `aivory-hub/main` (clean fast-forward). `npx tsc --noEmit` shows only the same two pre-existing errors documented in the ERP plan's Phase 5 (Composio SDK typing, `next.config.ts` eslint key) — none from this change.
- **Deployed, not just committed** (the gap flagged before starting this phase): VPS checkouts at `/home/ubuntu/AVRY-V2-Main/{backend/avry-backend,frontend/avry-user-dashboard}` were clean fast-forward pulls (zero tracked-file drift — only harmless pre-existing `.bak-*` untracked artifacts from prior rounds), `docker compose build` + `up -d` for both services, both containers healthy post-restart. Verified for real, not assumed: backend startup log shows `[OK] Agent tool scope routes registered`; `docker exec` confirms all 4 new toolkit slugs present in the running container's actual file; dashboard's built JS bundle (`docker exec ... grep`) contains "Google Calendar" in a real served chunk — same verification bar the 2026-08-22 ERPNext deploy used ("erpnext present in container code and JS bundles").

## Phase 5 — Sync poller check (verification only, not new work)

The `composio-connection-sync.py` fix shipped 2026-08-23 already enumerates all 5 agent types (`finance_invoice_ops`, `customer_service`, `office_assistant`, `leads_qualifier`, `autonomous`). Whatever Phase 2 lands on, it's already covered — this phase is just a live confirmation step (query `product.agent_toolkit_connections` after a real test connection), not a script change.

## Phase 6 — Verification ✅ **executed 2026-08-23**

All four proofs passed against the live `:3100` instance via the real `/webhook` path (throwaway tenants `toolkit-verify-tmp-001`/`-002`/`-003`, engine `cerveau`, no SQL tier bypass):

1. **Fail-closed gate (PASS)** — as `office_assistant`, asked by name for Gmail/Calendar/Trello/Linear access with zero connected accounts: *"I can't access any of those accounts from here... I have no connected Gmail, Google Calendar, Trello, or Linear integrations in this environment."*
2. **Full-chain proof (PASS)** — after inserting synthetic `ACTIVE` rows into `product.agent_toolkit_connections` for a fresh tenant (a first attempt on the *same* tenant as the fail-closed test hit the resolver's 60s `TTL_MISS` negative-cache window and needed a fresh tenant id to get a clean read): the model made real MCP tool calls and, when explicitly asked to relay the raw error verbatim rather than paraphrase, returned Composio's own API errors exactly — `"No connected account found for user ID toolkit-verify-tmp-002 for toolkit gmail"` and the same pattern for `TRELLO_GET_BOARDS_BY_ID_BOARD`/toolkit `trello` — proving registration → bundle grant → connection gate → auto_approve → HTTP routing with correct `entity_id`, spot-checked on 2 of the 4 toolkits (same code path as the other two, ERPNext precedent's own bar for "enough").
3. **Isolation (PASS)** — same tenant, same `ACTIVE` connection rows, under `customer_service` (not assigned any of the 4 per Phase 2): *"No."* — zero tools visible despite live connections.
4. **Cleanup verified** — all synthetic rows deleted, zero-count confirmed (`DELETE 4` × 2 tenants), Composio account re-confirmed at exactly 10 servers (unchanged from Phase 0, no orphans from this phase's testing).

**Incidental finding, out of scope for this plan, flagged separately**: journal logs surfaced a pre-existing, currently-live issue — `officecli`/`lightpanda`/`pdf-oxide` (the native Landlock-sandboxed stdio tools, unrelated to any Composio toolkit) fail to exec on **both** `:3100` and `-b` with `Permission denied (os error 13)` on every `office_assistant`-agent-type turn, confirmed via a control test unrelated to Gmail/Calendar/Trello/Linear. File permissions/timestamps on the affected binaries are unremarkable and weeks-old, so this isn't something this session's changes caused — it was simply never exercised by real traffic recently enough to surface. Does not affect this plan's toolkits (all HTTP-transport, no local spawn) or its Phase 6 conclusions, but is a real, currently-broken production capability worth its own fix.

Happy path (a real tenant connecting a real Gmail/Calendar/Trello/Linear account) remains unverified until real usage exists — same disclosed-gap stance as every prior toolkit round.

---

## All open decisions closed (2026-08-23)

1. **Trello vs. Linear → both.** Not a pick-one call; Phase 0/2 curate and wire both.
2. **Google Calendar's risk tier → `reversible`, dual-mode gated** (not the Gmail-style hard floor) — §Phase 1, with the confirm-before-execute rule explicitly restated for it.
3. **Phase 2 agent-type draft → approved as drafted.**
4. **Sequencing → this plan runs first**, ahead of `CERVEAU-ERP-SCALING-PLAN.md` (SAP/eval-harness) — smaller scope, ships faster, delivers value before the bigger enterprise push starts.
5. **Trello/Linear runs alongside Asana on `office_assistant`, not replacing it** — §2.1.
6. **Tool disambiguation is natural-language-only** — no slash commands, no platform-selector UI, ever, for this or any future multi-toolkit-of-the-same-category situation — §2.1.

## Success criteria

All chosen toolkits pass the same fail-closed/full-chain/isolation proof already proven for ERPNext; `blueprintPlanner`'s Gmail and Google Calendar defaults stop resolving to dead-end platforms; ADR-007's Product-tracking open decision is closed for real, not deferred again; zero new frontend code shipped (confirms the "generic toolkit row" architecture actually holds); zero new VPS processes; a tenant with both Asana and Trello/Linear connected never sees the agent guess silently or expose a command-syntax workaround — only a plain-language clarifying question when genuinely ambiguous.
