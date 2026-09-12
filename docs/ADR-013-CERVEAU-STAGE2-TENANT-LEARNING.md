# ADR-013 — Cerveau Stage-2 learning: letting self-evolution run on real tenant turns

**Status:** Proposed. Nothing in this ADR is implemented — Fase 1 (§5) is the recommended next PR, pending go-ahead.
**Date:** 2026-09-12
**Context:** The ask was "self-evolution is host-only today — what if it could evolve from handling real users?" This ADR answers that, plus two design constraints added during the discussion: (1) take inspiration from Edge0-AI/edge0's MoE technique — stream only the active experts instead of loading everything — applied to cost control on a per-tenant learning loop; (2) label shipped skills by tier (A/B/C/D) and surface them as a browsable library.

Related: [ADR-007](ADR-007-CERVEAU-COGNEE-INTEGRATION.md) (graph memory — same tenant-isolation discipline applies here), [ADR-008](ADR-008-CERVEAU-MULTI-AGENT-COLLABORATION.md) (the cheap-guardrail/expensive-judge pattern this ADR reuses), [ADR-010](ADR-010-CERVEAU-CONTEXT-BUDGET.md) (why tool/skill surface bloat is a recurring failure class to design around), `CERVEAU-STATUS.md` (names this exact gap "Stage-2 tenant-facing learning").

---

## 0. The headline finding

**This isn't a new feature request — it's a named, deliberately-deferred gap, and the deferral reason is architectural, not policy timidity.**

Cerveau's skill self-improvement loop (`crates/zeroclaw-runtime/src/tools/skill_manage.rs`, `crates/zeroclaw-runtime/src/skills/review.rs`) already has a real audit+rollback+cooldown safety net and is deployed — but gated to `current_tenant().is_none()` (`loop_.rs:2032-2044` for skill creation, `:2119-2125` for skill review). `CERVEAU-STATUS.md` names the reason explicitly: *"upstream's `[skills.skill_creation]`/`[skills.skill_improvement]` write to the host workspace that tenant turns also load, so both blocks are now guarded... (learning = host/internal-turn-only until per-tenant skill stores exist)"* and lists *"Stage-2 tenant-facing learning blocked on per-tenant skill stores"* as an open item.

Concretely: `SkillManageTool::patch()` resolves its write target as `safe_skill_dir(workspace_dir, slug)` (`skill_manage.rs:438-441`), and `workspace_dir` is `config.agent_workspace_dir(agent_alias)` (`loop_.rs:2126`, `schema.rs:4369-4379`) — **one directory per host agent alias, shared by every tenant routed onto that alias.** Opening the gate as-is would let one tenant's bad interaction silently degrade a skill every other tenant of that agent_type also loads (`loop_.rs:2034-2041`'s own comment says the workspace-skills directory loads first for every tenant on that alias).

The trap to avoid: reflexively copying `AgentScopedMemory`'s `t_<tenant_id>` alias pattern as a **directory-per-tenant** scheme. That pattern is explicitly rejected for memory — `zeroclaw-memory/src/lib.rs:1086-1088`'s own doc comment: *"Markdown/None host backends are rejected: tenants require the shared SQL/Qdrant path (per-tenant markdown dirs would reintroduce the filesystem-per-identity scaling wall)."* Skills would hit the identical wall at Aivory's target scale (thousands of tenants × mkdir + audit-scan-on-every-load, and skill loading already runs **every turn**, not once at boot — confirmed live at `loop_.rs:1334-1340`/`:3011-3017`). The correct analog to memory's fix is a **DB-backed overlay**, not a folder.

---

## 1. Skill loading is already per-turn, per-tenant — that's not the bottleneck

`load_skills_for_agent_and_tenant_from_config()` → `load_skills_for_agent_and_tenant_audited()` → `load_skills_for_agent_audited()` (`crates/zeroclaw-runtime/src/skills/mod.rs:547-789`) walks the host workspace, layers `[agents.<alias>].skill_bundles`, then layers tenant-agent-type bundles via `Config::skill_bundle_aliases_for_tenant` (`zeroclaw-config/src/schema.rs:4535-4543`, tested at `:24858-24902`) — resolved **fresh on every turn**, reading `current_tenant()` (`agent/tenant.rs:253`, a tokio task-local) each time. There is already a shipped precedent for "tenant gets extra skills layered on top of the host bundle" — today keyed by `agent_type`, not individual `tenant_id`.

This means the actual lift is narrower than "rebuild skill loading to be tenant-aware" — it's already tenant-aware. The lift is: (a) a place to store a genuinely *per-tenant* (not per-agent-type) overlay, and (b) a second write path in `skill_manage.rs` that targets that overlay instead of the shared workspace tree when a tenant context is present.

---

## 2. Applying Edge0's principle: don't process everything, stream only what's active

Edge0-AI/edge0 (checked directly — README + `docs/architecture.md`) is an on-device MoE inference engine: it never loads all of a 35B-parameter model into memory, only the experts a small "prerouter" predicts are needed for the next token, streamed from disk on demand. **The repo has no pipeline, kanban, or "edging" concept of its own** — the useful transfer here is the *mechanism* (sparse activation bounded by a cheap prediction step), not any named stage from that project.

Cerveau already has the identical philosophy stated for a different subsystem — ADR-008 §1.4: *"production 2026 shape is layered, not uniform: cheap distilled evaluators on 100% of traffic as guardrails, expensive agent-as-judge/debate-grade verification only on sampled or anomaly-flagged cases."* This ADR applies the same shape to tenant-facing learning, which matters here specifically because the naive version — run an LLM review-fork on every tenant turn to look for improvement opportunities — is the "load every expert" failure mode: real cost, at real scale, for a mostly-wasted pass, and review-fork spend was already flagged as something to watch in ADR-007 §11 (*"monitor `/api/cost` for reflection/review-fork spend"*).

**The cheap gate ("prerouter" equivalent) doesn't need to be invented — it's dormant in the codebase already:**

`TrustScore::check_regression()` (`crates/zeroclaw-runtime/src/trust/types.rs:117-129`) does one arithmetic comparison (`score.score < config.regression_threshold`) and returns `Option<RegressionAlert>`. **It has zero call sites outside its own unit tests** — built, tested, never wired in, exactly the pattern the delegation engine was found in before ADR-008 (`crates/zeroclaw-runtime/src/tools/delegate.rs`, 8,193 lines, fully built and switched off). Combined with two other already-computed, zero-marginal-cost signals — a tool call failing, and `escalate_to_human` firing — this is enough to gate which turns are worth the expensive step, without writing a new classifier or spending an LLM call on 100% of traffic.

---

## 3. The pipeline

Five stages, each deliberately reusing an existing Cerveau pattern instead of inventing one:

**Stage 0 — Cheap gate (runs on every tenant turn, ~zero cost).** When `check_regression()` fires, a tool call fails, or `escalate_to_human` triggers, write one row (`status = 'new'`) to a new ledger (§4). Nothing else happens synchronously — this is a write, not an analysis.

**Stage 1 — Insight synthesis (expensive, but only on what Stage 0 flagged).** A periodic cron job (Cerveau's scheduler is already production-grade — `cron_add`/`schedule` tools, `[pacing]` config) batches `status = 'new'` rows per `tenant_id` + `agent_type`, and makes one LLM call per batch to synthesize a structured finding (title, description, a complexity score, a draft skill delta). Row moves to `status = 'triaged'`.

**Stage 2 — Kanban.** A new ledger, deliberately mirroring the **design principles** of the existing Agent Task Ledger (`crates/zeroclaw-memory/src/task_ledger.rs` + `crates/zeroclaw-tools/src/task_ledger.rs`) rather than sharing its table — the two have different lifecycles and consumers, and folding skill-insight rows into `agent_tasks` would conflate a tenant-support signal with the existing `avry-backend` task-notification consumer (`notify_agent_action`, `task_ledger.rs:196-240`) that only expects operational tasks. What *is* reused, line for line:
  - `TEXT` status/priority columns + Rust-side `as_str()`/`parse()` (`task_ledger.rs:37-94`) — new states (`triaged`, `distilled`) are just new strings, zero schema migration.
  - One lookup index, `(tenant_id, agent_type, status)`, matching `idx_agent_tasks_lookup` — no speculative extra indexes before real volume data justifies them.
  - Single `Arc<Mutex<postgres::Client>>` + `run_on_os_thread` (`task_ledger.rs:111-132`/`180-217`) — not a new connection pool.
  - Tenant isolation via `WHERE tenant_id = $n`, not RLS or schema-per-tenant (`task_ledger.rs:285-287`/`314-316`/`360`).
  - Rows are never deleted, only moved forward — the ledger doubles as an audit trail (`task_ledger.rs:33-36`).
  - Three tool wrappers (`skill_insight_create`/`skill_insight_update_status`/`skill_insight_list`) structured like `task_ledger.rs`'s three tools (`:48-139`/`158-347`/`353-470`) so the pattern needs no new mental model.

**Stage 3 — Distillation → new skill.** When a finding reaches a threshold status, trigger the *existing* `skills/review.rs` mechanism (already audited, rollback-tested, cooldown-limited) — but sourced from a `skill_insights` row instead of mid-conversation drift, and writing to the **per-tenant DB overlay** from §4 instead of the shared host workspace tree. Row moves to `status = 'distilled'`.

**Stage 4 — Tiering + library.** A `tier` column (`A`/`B`/`C`/`D`) on the overlay table, computed from cheap, already-observable facts — not a new LLM judgment layered on top of the one that already ran in Stage 1:
- **A** — independently adopted by ≥3 distinct tenants, clean audit history, zero rollbacks.
- **B** — adopted by ≥2 tenants, or one tenant with a strong post-ship signal (trust score recovering).
- **C** — one tenant, no long-run evidence yet.
- **D** — experimental/low-confidence; a pruning candidate if it never progresses.

A sustained Tier-A skill becomes a *candidate* for promotion into a shared `skill_bundle` — human-reviewed, not automatic, matching the same caution already applied to host-side self-improvement.

---

## 4. What needs to actually be built

- **New table + ledger** (`skill_insights` + an `AgentSkillInsightLedger` in `zeroclaw-memory`, following §3 Stage 2's conventions exactly) and **three new tools** in `zeroclaw-tools`.
- **A genuinely per-tenant skill overlay** — a DB table (tenant_id + agent_type + slug + content + version + tier), not a filesystem tree. This is new: nothing in Cerveau today stores skill *content* anywhere but the filesystem, so `skill_manage.rs`'s write path needs a second branch (DB write when `current_tenant().is_some()`, current filesystem write otherwise), and the filesystem-native safety net (`safe_skill_dir`, `post_mutation_audit`, mtime-based cooldown in `improver.rs:26-59`) needs a DB-row equivalent (versioned rows, an audit check before the row is considered live, a timestamp-column cooldown).
- **Two dormant gates removed, deliberately** (`loop_.rs:2042-2044`, `:2123-2125`) — but only once the DB overlay exists to remove them *safely into*, not before.
- **A skill-loading change**: after `load_skills_for_agent_and_tenant_audited` produces the effective set, splice in the tenant's overlay row(s) in-memory, per turn — no new directories, no new scan.
- **New isolation tests** mirroring `crates/zeroclaw-memory/tests/tenant_isolation.rs`, proving a tenant-A patch never appears in tenant B's effective skill set and never touches the shared workspace tree.
- **A read-only library endpoint** (skill + tier + `category`/`tags` — both fields already exist on `SkillFrontmatter`, `crates/zeroclaw-runtime/src/skills/frontmatter.rs:12-27`, just never populated with a tier concept). The dashboard side is confirmed greenfield — no "skill library/marketplace/catalog" UI exists in either `avry-admin-dashboard` or `avry-user-dashboard` today (checked directly, zero matches). Recommended surface: `avry-admin-dashboard` first — this is operational visibility into what the fleet learned across tenants, not a tenant-facing feature by default.

---

## 5. Phasing

Comparable in scope to ADR-008's 5-phase build — not a single PR.

- **Phase 1 (recommended next PR): observe before building.** The `skill_insights` table + Stage 0 wiring only (including turning on the dormant `check_regression()`). No LLM synthesis yet — every row lands and stays at `status = 'new'`. Purpose: get real data on how often these signals fire and whether they're actually correlated with something worth turning into a skill, before writing a single line of synthesis code.
- **Phase 2:** Stage 1 (synthesis) + the three kanban tools. Strictly propose-only — findings and draft skill deltas land for human review; nothing auto-ships.
- **Phase 3:** Stage 3 (real per-tenant overlay + distillation) + Stage 4 (tiering). This is the phase where Stage-2 learning is actually live, with a human-reviewed gate at the promotion step.
- **Phase 4:** Library/showcase UI.

Each phase is a legitimate stopping point — Phase 1 alone is shippable as pure observability with no behavior change and no new risk surface.

## 6. What this ADR does not solve

- Does not decide the LLM cost budget for Stage 1 batches — needs Phase 1's real signal-frequency data first.
- Does not design the DB-overlay's conflict resolution if a tenant's overlay and a later host-workspace skill update disagree — deferred to Phase 3 design.
- Does not address promotion governance (who approves a Tier-A skill going into a shared bundle, and what happens if two agent_types converge on conflicting versions of "the same" learned behavior) — Phase 3/4 territory.
- Does not change anything about host/internal-turn self-improvement, which stays exactly as it is today.
