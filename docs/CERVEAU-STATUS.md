# Aivory Cerveau — Build Status & Handoff

**Last updated:** 2026-07-21
**Purpose:** single source of truth to resume work safely in a fresh session. Pairs with the phased plan ([DEPLOYABLE_AGENT_RUNTIME_PLANNING.md](DEPLOYABLE_AGENT_RUNTIME_PLANNING.md)) and ADRs 001–004.

---

## 1. What Cerveau is (one paragraph)

Aivory Cerveau = Aivory's fork of [zeroclaw-labs/zeroclaw](https://github.com/zeroclaw-labs/zeroclaw) (Rust, Apache-2.0), the multi-tenant deployable-agent engine that will replace the bespoke `telegram-agent.js` behind the user dashboard's Telegram/Slack/WhatsApp/Office-Assistant agents. Fork repo: **[Aivory-hub88/AVRY-Cerveau](https://github.com/Aivory-hub88/AVRY-Cerveau)**, default branch `cerveau-main`, based on upstream **v0.8.3** + a rebase-friendly patch series. Local clone: `~/Documents/AVRY-Cerveau` (rustup override 1.96.1).

## 2. Current live state (VPS `tencent-vps`, 129.226.155.216)

| Thing | State |
|---|---|
| **Cerveau instance** | `zeroclaw-cerveau.service` (systemd), **127.0.0.1:3100**, side-by-side, self-built v0.8.3 binary at `/usr/local/bin/zeroclaw-cerveau`. **Deployed 2026-07-21:** patch 0011 is live (binary built by CI from commit `55112091`), sha256 `1f0a58fc…4b3ab8`, checksum-verified before cutover. `doctor` clean pre-deploy (78 ok/9 warnings/0 errors). Post-restart: 0 systemd restarts, no error/panic/fatal in logs after ~2 min observed, `/health` 200 throughout. Rollback chain: `zeroclaw-cerveau.bak-pre-0011` (patch 0007–0010 binary, sha256 `d86c78ec…be6fc5`) → `zeroclaw-cerveau.bak-pre-0007-0010` (patch 0006 binary, sha256 `4f233dc4…6838b`). Patches 0007–0010 were deployed 2026-07-20 the same way — see git history of this file for that cutover's detail. |
| **Memory backend** | `postgres` → **production `avry-postgres`**, schema **`cerveau`** (auto-created: agents/memories/schema_version), dims 768, `vector_enabled=false` — deliberately still false: patch 0008's code fix is now live, but `vector_enabled=true` has **not yet been verified live** (next action) and the pgvector extension is still not installed on the `avry-postgres` image either way (see §6) |
| **Config dir** | `~/.zeroclaw-cerveau/` (isolated copy of prod zeroclaw config, storage/mcp stripped, memory.backend=postgres) |
| **Env file** | `/etc/zeroclaw-cerveau.env` (mode 600): `CERVEAU_TENANT_DB_URL` (→ aivory DB) + `CERVEAU_WEBHOOK_SECRET` |
| **Tenant resolver** | reads real `product.agent_profiles` (read-only) in aivory DB |
| **Lifecycle driver** | `cerveau-lifecycle.timer` (daily 03:30 +15min jitter) → `/usr/local/bin/cerveau-lifecycle.sh` (interim psql; SQL byte-mirrors `run_lifecycle`) |
| **Prod vanilla zeroclaw** | `zeroclaw.service` :3010 (v0.8.1) — **untouched**, still serves Console/Assistant/Workflow-builder |
| **Deployable-agent prod** | still `telegram-agent.js` in `vps-bridge` — **untouched**, no migration yet (that's Phase 6) |
| **Skills** | All 4 Aivory skills **installed and live-verified 2026-07-21**: `cerveau-skills/*` copied to `~/.zeroclaw-cerveau/cerveau-skills/`, 4 `[skill_bundles.*]` + 4 `[agent_type_skill_bundles.*]` entries in `config.toml` (backup: `config.toml.bak-pre-skill-bundles-20260721`). Real tenant webhook calls confirm correct per-agent-type visibility and isolation (see §5 item 10) — the model can *see* each skill; none can yet *act* (no Composio toolkit wired in, see next action). |

Verified live E2E: two data-row-only tenants adopt distinct personas; cross-tenant memory/knowledge blindness; tenant-scoped `memory_store` writes a real row in `cerveau.memories`. Throwaway `cerveau_e2e` DB dropped. **2026-07-21:** 4 tenant agent-types each see exactly their own skill via a real `/webhook` call, a vanilla (no-tenant) turn sees none of them, and this is easy to independently re-verify — see the copy-pasteable commands in §5 item 10.

## 3. Phase progress

- **Phase 0** ✅ fork-scope decisions ([ADR-001](ADR-001-AIVORY-CERVEAU-PHASE0.md)): additive fork, Restate out (F-1/F-2 instead), rebase-friendly patch series.
- **Phase 1** ✅ fork bootstrap, CI, side-by-side deploy, vanilla-parity smoke test.
- **Phase 2** ✅ **exit gate PASSED, live-verified** — multi-tenant identity + isolation ([ADR-002](ADR-002-CERVEAU-TENANT-DESIGN.md)). Durability half partial: hold/resume durable (upstream), F-2 ledger primitive landed; **F-1 + F-2 hot-loop wiring deferred** ([ADR-003](ADR-003-CERVEAU-DURABILITY.md)).
- **Phase 3** ✅ memory + lifecycle ([ADR-004](ADR-004-CERVEAU-MEMORY-LIFECYCLE.md)) — dims locked 768; tenant-scoped Postgres retention+budget lifecycle (CI-green vs real Postgres) + daily timer; long-term memory (OR-recall + auto-consolidation, patch 0006); **P-consolidation cost knob landed (patch 0009)**; **pgvector-init-thread crash-loop fixed (patch 0008) — vectors are no longer code-blocked**, only the pgvector extension install on `avry-postgres` remains (§6). **Exit gate partial:** bounded-growth live, but the 90-day flat-disk sim still pending (see §6). **3.4 (10 MB doc gate) → moved to Phase 6.**
- **Phase 4** 🟡 started — **4.1 slice 1 landed (patch 0010):** tenant-entity-scoped MCP server resolution primitive (`McpServerConfig.tenant_entity_query_param` + `Config::mcp_servers_for_agent_and_tenant`), so a Composio-as-MCP server can be entity-scoped to the authenticated tenant's platform user id, never a shared/default account. Also: **four** Aivory-authored skills drafted in `~/Documents/AVRY-Cerveau/cerveau-skills/` (parse-verified via `SkillDocument::parse`; none installed to a running instance) — `finance-invoice-ops/invoice-processing/`, `office-assistant/meeting-outcomes/`, `customer-service/ticket-triage/`, `leads-qualifier/bant-qualification/` — one per Aivory deployable-agent type except `autonomous`. All four Composio tool schemas verified live against the API, not docs. **Found and fixed a live bug in the process:** `COMPOSIO_CURATED.slack` in `telegram-agent.js` pointed to Composio's deprecated `SLACK_CHAT_POST_MESSAGE` — fixed and deployed. **Found and resolved same day (patch 0011):** the `:3100` instance's `[agents.<alias>]` entries are still vanilla zeroclaw's 6 generic brain roles, not Aivory's 5 agent types, and webhook host-agent selection is independent of the `X-Agent-Type` tenant header — so skills couldn't be installed per Aivory agent type at all. Traced how the *current* bridge (`telegram-agent.js`) already solves this — `agent_type` is a per-request data value indexing prompts/tools in one process, never a provisioning axis — and ported that principle: `TenantContext::agent_type` + `[agent_type_skill_bundles.<agent_type>]` config, resolved fresh per turn via `Config::skill_bundle_aliases_for_tenant`, granting bundles on top of whatever the host alias already has. No new host aliases needed. **Also done 2026-07-21:** the 4 skills are installed on `:3100` and live-verified end to end via real tenant webhook calls (§2, §5 item 10) — each agent type sees exactly its own skill, cross-isolation and vanilla-turn absence both confirmed. **Not yet done:** wiring a real Composio toolkit connection (so a visible skill can actually *act*, not just be seen by the model), capability graph (4.2), approval tiering (4.3), concurrent tools. Includes the [Agents-page integrations UX note](DEPLOYABLE_AGENT_RUNTIME_PLANNING.md) (tabbed Identity|Connections|Tools; tool-scope backend ships with the toggle, never before).
- **Phase 5** ⬜ 500-tenant load test. **Phase 6** ⬜ channel migration (Telegram first) + 10 MB gate. **Phase 7** ⬜ voice. **Phase 8** ⬜ 10k load test + cutover.

## 4. Patch series on `cerveau-main` (all CI-green unless noted)

| # | Patch | Status |
|---|---|---|
| 0001 | CI bootstrap (`cerveau-build`, one workflow) | ✅ |
| 0002 | P-identity (tenant memory scope, persona resolver, inert-DATA injection, principal stamping) | ✅ |
| 0003 | Isolation CI gate (5 adversarial cross-tenant tests) | ✅ |
| 0004 | F-2 idempotency-ledger primitive (`control_plane/tool_idem.rs`) | ✅ |
| 0005 | Postgres memory lifecycle (retention + per-tenant budget + per-tier quota) + PG service in CI | ✅ |
| — | Build fix: append `memory-postgres` to the release feature set (dist selection omitted it) | ✅ |
| 0006 | Long-term memory: OR-recall + background auto-consolidation | ✅ CI-green + **live-verified** (commit `6c693a17`) |
| 0007 | Upstream bug fix: schema-scope the v3 memory migration's constraint checks (ADR-004 §5) | ✅ CI-green (commit `e6461bce`), **live on `:3100` since 2026-07-20** |
| 0008 | Upstream bug fix: pgvector-init-thread crash-loop — unblocks vectors | ✅ CI-green (commit `f3d11104`), **live on `:3100` since 2026-07-20** (code deployed; `vector_enabled=true` not yet exercised live — see §5) |
| 0009 | P-consolidation cost knob (`consolidation_enabled` + `consolidation_sample_rate`) | ✅ CI-green (commit `359d965b`), **live on `:3100` since 2026-07-20** |
| 0010 | Phase 4.1 slice 1: tenant-entity-scoped MCP servers (Composio-as-MCP groundwork) | ✅ CI-green (commit `a5967200`), **live on `:3100` since 2026-07-20** |
| 0011 | Phase 4.1 follow-on: tenant-agent-type-driven skill bundles (`TenantContext::agent_type`, `[agent_type_skill_bundles.*]`, `Config::skill_bundle_aliases_for_tenant`) | ✅ CI-green (commit `55112091`), **live on `:3100` since 2026-07-21** |
| — | `cerveau-skills/finance-invoice-ops/invoice-processing/` — jurisdiction-agnostic invoice skill + Composio toolkit checklist (content, not engine code) | ✅ pushed (commit `7d637607`), parse-verified, **not installed to any running instance** |
| — | `cerveau-skills/office-assistant/meeting-outcomes/` — meeting → decisions/action-items/risks skill, syncs to Notion/Slack/Sheets via toolkits already in `COMPOSIO_CURATED` (content, not engine code) | ✅ pushed (commit `815caf14`), parse-verified, **not installed to any running instance** |
| — | `cerveau-skills/customer-service/ticket-triage/` — triage/resolve/log/escalate skill; Zendesk/Freshdesk/Intercom toolkits verified enabled (content, not engine code) | ✅ pushed (commit `ee685555`), parse-verified, **not installed to any running instance** |
| — | `cerveau-skills/leads-qualifier/bant-qualification/` — inbound BANT qualification skill; HubSpot/Salesforce/Pipedrive lead-object actions verified (content, not engine code) | ✅ pushed (commit `ee685555`), parse-verified, **not installed to any running instance** |

## 5. Next actions (in order)

1. ~~Deploy 0006 + live E2E~~ ✅ **DONE 2026-07-18:** 0006 binary live on `:3100`; OR-recall verified (fact stored in session A, recalled in a fresh session B with a partial-term query); auto-consolidation verified (a plain conversation with no `memory_store` call produced tenant-scoped `core`+`daily` distilled rows). Test tenant rows cleaned from `cerveau.memories` (only `default` agent remains).
2. ~~P-consolidation follow-through~~ ✅ **DONE 2026-07-18/19:** cost knob landed as patch 0009 (config gate + sample rate, default unchanged behavior).
3. ~~Deploy 0007–0010 to `:3100`~~ ✅ **DONE 2026-07-20:** checksum-verified artifact from CI (commit `7d637607`), `doctor` clean pre-deploy (0 errors), backup taken, cutover executed, verified stable for 2+ min post-restart (0 restarts, all 9 components `ok`, no error/panic in logs). Rollback binary retained at `/usr/local/bin/zeroclaw-cerveau.bak-pre-0007-0010` if needed.
4. ~~Verify 0008 live~~ ✅ **DONE 2026-07-20:** ran a throwaway daemon (separate port, isolated config-dir, isolated `cerveau_vectest` schema — production `:3100` never touched, confirmed 0 restarts / same PID throughout) with `vector_enabled=true`. No crash. Confirmed via `pg_available_extensions` that `vector` is genuinely not installable on this Postgres server (0 rows) — the code correctly fell back to keyword-only: a `memory_store` + later `memory_recall` round-trip through the webhook both succeeded ("what is my favorite color" → "Your favorite color is blue"). Functional proof, not just absence-of-crash. Throwaway schema, config dir, and process all cleaned up afterward. **Production `vector_enabled` stays `false`** — the extension itself still isn't installed (§6); this only proved the code path is safe for when it is.
5. ~~Deploy the `telegram-agent.js` Slack-tool fix~~ ✅ **DONE 2026-07-20:** patched in place on the VPS (`/home/ubuntu/AVRY/vps-bridge/telegram-agent.js`, which had NOT diverged from the `fc7a765` fix at the relevant lines — verified before patching, per the local↔VPS divergence gotcha). Backup taken (`telegram-agent.js.bak-pre-slack-fix-20260720`), syntax-checked, PM2 process `vps-bridge` restarted (`server.js`, which requires this file), health check `200 ok` post-restart.
6. ~~Author `customer_service`/`leads_qualifier` skills~~ ✅ **DONE 2026-07-20:** `ticket-triage` and `bant-qualification`, same rigor as the other two (real Composio schemas verified live: Zendesk/Freshdesk/Intercom, HubSpot/Salesforce/Pipedrive). All four Aivory deployable-agent skills now exist except `autonomous` (which inherits from the others per its superset tool set).
7. ~~🔴 Resolve the host-agent-alias mapping~~ ✅ **DONE 2026-07-20 (patch 0011):** not a product decision after all — traced the current bridge's own design (per-request data value, not a provisioning axis) and ported it: `TenantContext::agent_type` + `[agent_type_skill_bundles.<agent_type>]`, resolved per turn, additive on top of the host alias's own bundles. 7 new tests, CI-green.
8. ~~Deploy patch 0011 to `:3100`~~ ✅ **DONE 2026-07-21:** checksum-verified artifact from CI (commit `55112091`), `doctor` clean pre-deploy (0 errors), backup taken (`zeroclaw-cerveau.bak-pre-0011`), cutover executed, verified stable 2+ min post-restart (0 restarts, `/health` 200, no error/panic in logs).
9. ~~Configure `[agent_type_skill_bundles.*]` + `[skill_bundles.*]` on `:3100` and install the 4 skills~~ ✅ **DONE 2026-07-21:** `cerveau-skills/{finance-invoice-ops,office-assistant,customer-service,leads-qualifier}/` copied to `/home/ubuntu/.zeroclaw-cerveau/cerveau-skills/`; 4 `[skill_bundles.*]` + 4 `[agent_type_skill_bundles.*]` entries added to `config.toml` (backed up first: `config.toml.bak-pre-skill-bundles-20260721`), `doctor` clean (0 errors), service restarted, stable (0 restarts).
10. ~~E2E-verify tenant-agent-type skill isolation~~ ✅ **DONE 2026-07-21, functional proof via real webhook turns** (not just config validation): asked each of the 4 agent types "what skills do you have" through a real tenant-scoped `/webhook` call —
    - `X-Agent-Type: finance_invoice_ops` → model named exactly `invoice-processing`.
    - `X-Agent-Type: customer_service` → model's list included `ticket-triage` (among the host alias's ~40 pre-existing open-skills; `invoice-processing` correctly absent).
    - `X-Agent-Type: office_assistant` → `meeting-outcomes: yes`, other 3 Aivory skills: no.
    - `X-Agent-Type: leads_qualifier` → `bant-qualification: yes`, other 3: no.
    - **No tenant headers at all (vanilla turn)** → all 4 Aivory skills: no — confirms "absent tenant context = vanilla behavior, bit-for-bit" holds for skills too, not just memory/MCP.
    Test tenant rows (`skilltest_user*`, 7 memory rows + 4 agent records) cleaned from `cerveau.memories`/`cerveau.agents` afterward; service confirmed stable (0 restarts) throughout.

    Reproduce with (needs `CERVEAU_WEBHOOK_SECRET` sourced from `/etc/zeroclaw-cerveau.env` on the VPS):
    ```bash
    curl -s -X POST http://127.0.0.1:3100/webhook \
      -H "Content-Type: application/json" \
      -H "X-Webhook-Secret: $CERVEAU_WEBHOOK_SECRET" \
      -H "X-Tenant-Id: <any-test-id>" \
      -H "X-Agent-Type: finance_invoice_ops" \
      -d '{"message": "List the exact names of any skills you have. Just the names."}'
    ```
    Swap `X-Agent-Type` for `customer_service`/`office_assistant`/`leads_qualifier`, or drop both `X-Tenant-Id`/`X-Agent-Type` for the vanilla case. Remember to delete the test tenant's rows from `cerveau.memories`/`cerveau.agents` afterward (`WHERE alias LIKE '%<your-test-id>%'`).
11. **Wire a real Composio toolkit connection** per agent type — start with `finance_invoice_ops` (Stripe or QuickBooks first, see `invoice-processing`'s reference doc) since it has the most groundwork already. This is the only remaining step before a skill can *act*, not just be visible to the model.
12. **Then choose:** continue Phase 4 (4.2 capability graph / 4.3 approval tiering) vs. finishing the deferred durability/memory items below (§6).

**Still needing a human, not further agent work this session:** the three secret rotations (§8) require GitHub/Composio web-console access this session doesn't have; the pgvector extension install needs an infra maintenance window; F-1/F-2 durability wiring and the 500-tenant load test are multi-day engineering efforts, not something to rush through in one pass.

## 6. Queued fork patches / known gaps (honest list)

- ~~**pgvector-init-thread fix**~~ ✅ fixed, patch 0008, live on `:3100` since 2026-07-20.
- **pgvector extension not installed:** the `avry-postgres` image has no `vector` extension; enabling real vector search needs an image swap to `pgvector/pgvector` (maintenance window) **and** an embedding API key (OpenAI — OpenRouter has no embeddings API; not present on the VPS yet). This is now the *only* remaining vector blocker — the code-level crash-loop (patch 0008) is fixed.
- **F-1 auto-resume** of crashed in-flight tasks (needs a goal-execution driver seam) — ADR-003.
- **F-2 hot-loop wiring** — thread the idempotency ledger into `execute_one_tool`, gated on a side-effect taxonomy — ADR-003.
- **halfvec** — `ALTER COLUMN embedding TYPE halfvec(768)` (non-re-embedding) once vectors are on.
- ~~**Upstream bug (upstreamable): v3 migration schema scope**~~ ✅ fixed, patch 0007, live on `:3100` since 2026-07-20.
- ~~**P-consolidation cost knob**~~ ✅ landed, patch 0009, live on `:3100` since 2026-07-20.
- **90-day flat-disk simulation** — the Phase 3 exit-gate demo, run once auto-consolidation + lifecycle have fed a synthetic tenant.
- **Phase 4.1 follow-through** — the tenant-entity-scoping *primitive* landed (patch 0010), but no Composio toolkit is actually wired in yet: action-subset curation per toolkit, then either a `tenant_entity_query_param`-gated `[[mcp.servers]]` entry or a REST integration path (mirroring `telegram-agent.js`'s `composioExecute`) still need building. See the `invoice-processing` skill's reference doc for the concrete checklist.
- ~~**Host-agent-alias mapping undecided**~~ ✅ resolved, patch 0011, live on `:3100` since 2026-07-21. See `cerveau-skills/README.md` for the `[agent_type_skill_bundles.*]` install instructions — configuring those entries + installing the 4 skills for real is the remaining step.

## 7. Operational notes & gotchas

- **Push auth:** VPS SSH key CANNOT push to AVRY-Cerveau; pushes use a PAT in the URL (one-shot, not stored on VPS).
- **CI artifact download** needs `Authorization: Bearer <PAT>` even on the public repo.
- **Debugging a silent :3100:** `[observability] backend="none"` swallows error records — reproduce with a foreground daemon (`--log-level debug` + temporarily set `[observability] backend="verbose"`) or a CLI subcommand like `zeroclaw-cerveau memory stats` that prints factory errors to stdout.
- **`memory_store`/`memory_recall` are approval-gated;** webhook is non-interactive, so they get auto-denied unless `auto_approve=["memory_store","memory_recall"]` is set on the agent's risk profile (memory ops are agent-internal state, safe to auto-approve; full approval tiering is Phase 4.3).
- **Postgres DSN:** use libpq **key=value** form (`host=… user=… password=… dbname=…`), NOT a `postgresql://` URL — the prod password contains `@`/`#` which breaks URL parsing.

## 8. 🔐 SECURITY — rotate, ideally before the next session

Still not rotated as of 2026-07-20. Growing more overdue, not less.

- **GitHub PAT** — the original (`ghp_XIpM…`) transited multiple sessions and was reused repeatedly (pushes, Actions API poll/cancel/rerun) since first flagged; it **turned out to already be dead/revoked by 2026-07-20** (pushes started failing with an auth error), and the user supplied a replacement (`ghp_R46k…`) directly in chat. That replacement is now itself chat-exposed and needs the same fine-grained, per-repo-scoped rotation the original was overdue for — this is not resolved, just handed off to a new token with the identical exposure.
- **`avry-postgres` password** (`aivory` user, contains `@#`) — additionally exposed again 2026-07-20 while building/running a throwaway vector-test config (visible in a `config.toml` cat and in shell commands). Rotating this is more involved than the other two: it requires updating every consumer's config simultaneously (Cerveau's `db_url` in `~/.zeroclaw-cerveau/config.toml`, whatever `vps-bridge`/other backend services also hold it) — coordinate the cutover, don't rotate the DB user's password without updating consumers in the same window.
- **Composio API key** `ak_I7jFXNZ…` — pasted directly in chat 2026-07-19 to check toolkit availability (`GET /api/v3/toolkits/<slug>`, read-only), reused again 2026-07-20 for the customer-service/leads-qualifier toolkit checks. Not stored in any file, but it transited the transcript repeatedly — rotate it too.

(The `:3100` webhook secret is freshly generated and internal-only-bound, lower priority.)
