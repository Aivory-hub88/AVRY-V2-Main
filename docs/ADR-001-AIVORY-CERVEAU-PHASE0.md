# ADR-001 — Aivory Cerveau Phase 0: Blocking Questions Resolved

**Date:** 2026-07-16 (amended 2026-07-17: fork base = v0.8.3)
**Status:** Accepted (0.1, 0.2 resolved by targeted code read of upstream `zeroclaw-labs/zeroclaw` @ HEAD, shallow clone; 0.3 confirmed: rebase-friendly patch series)

> **Version-boundary amendment (2026-07-17):** the `control_plane` and durability findings in §0.2 describe code that **landed in upstream v0.8.2** ("durable run/task control plane") and matured in v0.8.3 — it does **not exist in v0.8.1**, the version running as Aivory's production vanilla instance. Consequently the fork base was moved from v0.8.1 to **v0.8.3** (which also carries SSRF/secret-leak/RUSTSEC hardening). The prod vanilla instance stays on v0.8.1 untouched; the webhook contract is unchanged. Everything else in this ADR stands.
**Context:** Phase 0 of [DEPLOYABLE_AGENT_RUNTIME_PLANNING.md](DEPLOYABLE_AGENT_RUNTIME_PLANNING.md). Answers gate Phases 1–2.

---

## 0.1 — Identity: dynamic or static? → **DYNAMIC creation EXISTS; the wall is scale, not possibility. Fork is ADDITIVE.**

Evidence from upstream source:

- Agents are config entries `[agents.<alias>]` (`zeroclaw-config/src/multi_agent.rs`, `schema.rs`), each with a workspace dir `<install>/agents/<alias>/workspace/`.
- **A new agent CAN be created at runtime via API, no process restart:** `zeroclaw-gateway/src/api_sections.rs::handle_section_select` (Section::Agents) → `create_map_key_checked("agents", alias)` on the live config + scaffolds the workspace dir + `seed_default_personality()`. Config writes persist to disk and set a `pending_reload` flag; `/admin/reload` triggers an **in-process reload** (tokio watch channel, `daemon::run` re-entered — `daemon/mod.rs`), and the durable control-plane store + `boot_id` are **reused across reloads** (`boot.rs::start_with_boot_id`).
- **Correction to the plan's assumption:** `daemon/registry.rs` is NOT an agent registry — it is a startup-hook registry for subsystems (gateway/channels/RPC/MQTT). There is no in-RAM per-agent daemon pool to worry about; agents are config entries + workspace dirs resolved through `state.config` (RwLock).
- **Why this still doesn't serve 10k tenants as-is:** one TOML file with 10k `[agents.<alias>]` sections, 10k workspace dirs on disk, and a **global in-process reload on every signup** (reload re-enters the daemon loop and respawns channel/gateway subsystems). The mechanism is per-operator-scale (tens of agents), not per-tenant-scale.
- **Fork scope confirmed: moderate/additive** — add a DB-backed tenant-identity resolution path (persona/tone/language/voice/tool-scope from Postgres per authenticated request) alongside the existing config-alias machinery, exactly as Phase 2 assumed. No architectural rework of the daemon needed.
- **Bonus discovered:** `TaskRecord.principal_id` already exists ("EPIC D" attribution, currently unstamped `Option<String>`) — upstream is itself building a per-principal seam. This is a natural, upstream-aligned hook for stamping tenant identity onto tasks.
- **Isolation primitive discovered:** per-agent memory/filesystem access is **default-jailed** (`AgentWorkspaceConfig.access` empty = jailed; `read_memory_from` empty = own memories only). Upstream's isolation philosophy matches Requirement #6; our Postgres tenant scoping re-implements the same stance at row level rather than alias level.

## 0.2 — Durability: step-level durable execution or persistent status? → **BETWEEN THE TWO — and close enough that RESTATE STAYS OUT.**

What `control_plane` actually provides (from `task_registry.rs`, `goal_task.rs`, `boot.rs`, `reaper.rs`):

1. **First-class on-hold: YES, excellent.** `TaskStatus::Paused` is a canonical non-terminal state; `pause_goal_task`/`resume_goal_task` are **atomic** across the task row + goal extension; pauses carry machine-readable `GoalPauseReason` + `GoalBlocker[]` ("the durable machine-readable resume surface") — including waiting-for-operator and external-dependency reasons. Paused tasks survive restarts and are claimed by a new daemon boot via `claim_owner`.
2. **Resume granularity: conversation-turn, not tool-call journal.** Resume synthesizes a **trusted continuation turn** (`TaskContinuationContext`: persisted channel/reply-target/history scope) and re-hydrates conversation history. Completed turns are never re-run (they're history), but there is **no Restate-style step journal within a turn**.
3. **Crash behavior: prior-boot `Running` orphans are marked `Lost`** by the one-shot recovery sweep at boot — visible and reconciled, but **not auto-resumed**. Heartbeat/`max_runtime` violations → `TimedOut` (reaper).
4. **Side-effect safety: partial.** `delivered` + `idem_key` exist for completion/delivery idempotency. `tool_receipts.rs` is HMAC anti-hallucination proof, NOT a replay-dedup journal. A turn interrupted mid-execution could re-run its tool calls on retry.
5. **Single-writer constraint:** one daemon per `data_dir` (recovery assumes a different `boot_id` = dead owner). Side-by-side deploy needs its own data dir (fine); any future multi-process pool needs the Postgres-backed task store (already planned).

**Decision: Restate stays OUT.** Rationale: our multi-day tasks spend ~all their wall-clock time in `Paused`-with-blockers (waiting on approvals, external events) — which upstream handles atomically and durably. The gap vs. true durable execution is only the **mid-turn crash window** (seconds of active execution), whose blast radius is one conversation turn. Closing that with Restate would mean adopting a second orchestration engine for a seconds-wide window. Instead the fork adds two scoped extensions:

- **F-1: auto-resume policy** — for owned tasks with a persisted `TaskContinuationContext`, the boot recovery sweep enqueues a continuation instead of terminally marking `Lost` (make `Lost` the fallback, not the default).
- **F-2: idempotency keys on side-effectful tool executions** — extend the existing `idem_key` delivery pattern to tool calls (dedup key = task id + turn + tool + args hash), so a re-run turn cannot double-execute a side effect.

## 0.3 — Fork-maintenance strategy → **RECOMMENDED: rebase-friendly patch series, with upstreaming ambition** *(Irfan to confirm)*

Upstream is active and moving **toward** us (EPIC D principal attribution, default-jailed isolation) — hard-forking away from that would be paying to re-derive what upstream is building. Keep Cerveau's changes as a clean, minimal patch series over upstream releases; where a change is generic (e.g. F-2 tool idempotency, principal stamping), attempt to upstream it and shrink the patch series over time. Bus-factor mitigation: every Cerveau patch documented in-repo (`CERVEAU_PATCHES.md`) with why + what it touches.

---

**Phase 0 exit gate: PASSED** (pending 0.3 confirmation). Phase 1 (fork bootstrap) is unblocked; Phase 2's scope is confirmed additive: DB-backed identity resolution + row-level tenant scoping + F-1/F-2 durability extensions.
