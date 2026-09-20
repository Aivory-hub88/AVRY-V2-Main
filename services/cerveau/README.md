# Cerveau (ZeroClaw) skills

Version-controlled copy of the **ZeroClaw "Cerveau" daemon** skills + identity.
The daemon (`zeroclaw-cerveau.service`, port 3100) maps the dashboard's
`entrypoint` values to `SKILL.md` files **by directory name**:

```
/home/ubuntu/.zeroclaw-cerveau/skills/<entrypoint>/SKILL.md
```

These files were previously **only on the VPS** (not in any git repo), so a
re-provision would silently lose them. This directory + `sync.sh` makes them
reproducible.

## Entrypoints

| Entrypoint | Skill | Purpose |
|-----------|-------|---------|
| `workflow_generate` | `skills/workflow_generate/SKILL.md` | LLM generates a workflow from a request |
| `workflow_clarify` | `skills/workflow_clarify/SKILL.md` | Ask clarifying questions |
| `workflow_edit` | `skills/workflow_edit/SKILL.md` | Edit an existing workflow |
| `workflow_repair` | `skills/workflow_repair/SKILL.md` | Repair failed steps |
| `workflow_semantic_review` | `skills/workflow_semantic_review/SKILL.md` | **Blueprint semantic review** — strict JSON findings |

`identity.md` / `soul.md` are the daemon's business identity / tone.

## Agent Team

Product agents are mirrored under `agents/<type>/workspace/IDENTITY.md`:

| Agent | Type | Responsibility |
|---|---|---|
| Aira | `chief_of_staff` | Plan, delegate, track, and synthesize |
| Geno | `autonomous` | Generalist execution and cross-domain support |
| Teo | `customer_service` | Support and ticket operations |
| Lex | `leads_qualifier` | Sales and Lead: BANT qualification + outbound plays |
| Finn | `finance_invoice_ops` | Invoice and finance operations |
| Ofira | `office_assistant` | Meetings, tasks, and office operations |

Aira is coordination-only. It can use delegation, research, memory, graph,
and internal task tools, but it does not receive specialist business tools
directly. External writes remain owned and approval-gated by the specialist.

## Outbound sales skills (Lex)

Tier 1 knowledge-only skills vendored byte-identical from
`growthenginenowoslawski/coldoutboundskills` (MIT) live on the VPS at
`cerveau-skills/leads-qualifier/` and are mirrored under
`aivory/skills/leads-qualifier/` in AVRY-Cerveau: ICP onboarding,
copywriting, spam-word checks, list-quality scorecards, lead magnets,
campaign strategy, experiment design, kickoff, weekly rhythm, ICP prompt
builder, personalization pattern. Anything spending money or sending
externally (Tier 2: Smartlead, Prospeo, domains, inboxes) is intentionally
excluded until tenant keys exist.

## Sync

```bash
cd services/cerveau
./sync.sh status     # diff local vs VPS
./sync.sh capture    # pull VPS → repo (backup before changes)
./sync.sh deploy     # push repo → VPS + restart daemon
```

## Deploying the Cerveau binary (checklist)

The daemon is the Rust binary built from `AVRY-Cerveau` `cerveau-main` (CI publishes the rolling
`cerveau-cd` release). Deploys are done by a person or session running a guarded script on the VPS;
`./sync.sh deploy` above is for prompts and skills, not the binary. Keep this list current: add a
line whenever a build changes the schema or leaves a deliberate, not-yet-adopted behaviour on `cerveau-main`.

1. **Deploy the commit you mean to.** `cerveau-main` may contain work from other sessions. Read
   `git log <live-commit>..origin/cerveau-main` first; everything in it ships. The script must check
   that the release body names the expected commit, verify the tarball sha256, and refuse unless the
   live binary hash is a known predecessor.
2. **`doctor` before the swap** (0 errors), keep a dated backup, check health after, roll back
   automatically if unhealthy.
3. **Schema changes run at first start and are idempotent.** Today's list, all additive and safe to
   roll back over (the previous binary ignores the columns):
   - ADR-014 A2: six columns and a partial index on `cerveau.agent_tasks`.
   - ADR-016 P1: `importance`, `superseded_by`, `access_count`, `last_accessed_at` on
     `cerveau.memories`.
4. **Known behaviour that ships with `cerveau-main`, decided on purpose.** ADR-016 P1 stays on
   `cerveau-main` (owner decision, 2026-09-20) although it was rolled back once in production. A
   build that contains it stores `importance` on every new memory, counts recall hits in
   `access_count`, hides superseded rows from recall (nothing marks rows superseded yet), and lets
   `memory_store` take an optional `importance`. It changes nothing a user sees while
   `memory.rerank_enabled = false`. If you deploy a build that contains it, say so in the deploy note.
5. **Memory tuning is configuration, not part of a binary deploy.** `memory.rerank_enabled` and
   `memory.min_relevance_score` in `~/.zeroclaw-cerveau/config.toml` are currently `false` and `0.4`.
   They were changed and reverted by the owner on 2026-09-20; do not change them as a side effect of
   a deploy, and only with the owner's explicit go-ahead (see ADR-016 §14 and §18).
6. **Probe after the swap** with a synthetic tenant through `/webhook` (`X-Tenant-Id`,
   `X-Agent-Type`, `X-Session-Id`), and delete the probe rows afterwards.

## How a new entrypoint is added

1. Create `skills/<entrypoint>/SKILL.md` here.
2. `./sync.sh deploy`.
3. In the dashboard, route the bridge operation with
   `entrypoint: '<entrypoint>'` (see `lib/workflows/bridgeCopilot.ts`).

## Caveat

`services/avry-zeroclaw/` (git submodule) contains **stale Python code** that
does not match the running daemon — the live Cerveau is a Rust binary
(`/usr/local/bin/zeroclaw-cerveau`) whose config/skills live under
`/home/ubuntu/.zeroclaw-cerveau/`. Treat this directory as the source of truth
for the daemon's prompts, not the submodule.
