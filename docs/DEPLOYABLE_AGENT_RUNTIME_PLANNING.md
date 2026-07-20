# Aivory Cerveau — Forking zeroclaw-labs/zeroclaw for Multi-Tenant Deployable Agents

**Date:** July 16, 2026 (updated same day after deciding to fork; upgraded to execution plan same day)
**Status:** **Execution plan (v2)** — decision made to fork; phased implementation plan below; implementation not yet started
**Scope:** the deployable-Agent engine behind the user dashboard (Telegram/Slack/WhatsApp/Office Assistant agents), to be rebuilt as a fork of zeroclaw-labs/zeroclaw, product name **"Aivory Cerveau"**

---

## Table of Contents

- [Goal](#goal)
- [Decision](#decision)
- [Current State](#current-state)
- [Requirements](#requirements)
- [Reference Architectures Evaluated](#reference-architectures-evaluated)
  - [zeroclaw-labs/zeroclaw](#1-zeroclaw-labszeroclaw)
  - [WeaveMindAI/weft](#2-weavemindaiweft)
  - [Restate (standalone)](#3-restate-standalone--lower-priority-now)
- [Proposed Building Blocks](#proposed-building-blocks)
- [Durable Execution — Why Weft Was Considered in the First Place](#durable-execution--why-weft-was-considered-in-the-first-place)
- [Tenant Isolation](#tenant-isolation)
- [Capability Graph — the "Obsidian-Style Brain" over Tools & Integrations](#capability-graph--the-obsidian-style-brain-over-tools--integrations)
- [Staying Lightweight — the Architecture Law That Preserves the 6.6 MB Class](#staying-lightweight--the-architecture-law-that-preserves-the-66-mb-class)
- [Memory Storage Budget — Long-Term Memory inside 180 GB of SSD](#memory-storage-budget--long-term-memory-inside-180-gb-of-ssd)
- [Target Topology & Migration Strategy](#target-topology--migration-strategy)
- [Tool Use Smoothness & OAuth App Integration](#tool-use-smoothness--oauth-app-integration)
- [Voice Agent (Custom Per User)](#voice-agent-custom-per-user)
- [Open Questions / Risks](#open-questions--risks)
- [Non-Goals](#non-goals)
- [Implementation Plan](#implementation-plan)

---

## Goal

Upgrade the deployable-Agent engine behind the user dashboard's Telegram/Slack/WhatsApp/Office Assistant agents so it can:

1. Recall relevant context across a long-running conversation/relationship with a user, without stuffing everything into the LLM context window ("long context memory").
2. Run a single task across multiple days, including being explicitly paused ("on hold") and resumed later, surviving process restarts.
3. Run many of these tasks concurrently without one long-running task blocking others or degrading API responsiveness — **target scale: 10,000+ concurrent users, each with their own distinct, custom agent identity.**
4. Run tools smoothly and intelligently, actually using the third-party apps a user has connected via OAuth in the user dashboard.
5. Support a voice agent, customizable per user.

## Decision

**Fork [zeroclaw-labs/zeroclaw](https://github.com/zeroclaw-labs/zeroclaw) (Rust, Apache-2.0) and rebrand it as "Aivory Cerveau."** *(Branding decided 2026-07-16: **Aivory Cerveau** — French for "brain" — supersedes the earlier working name "Aivory Brain"; internal codename remains zeroclaw.)*

This reverses the initial recommendation in this document (see the superseded reasoning kept below for context). The reconsideration, in order:

1. zeroclaw-labs' engine is **already running in Aivory's own production infrastructure** (see Current State) — it is not a new, unproven dependency. It costs **6.6 MB of RAM** per instance in real measured usage, which is the concrete evidence behind "Rust is ringan" — introducing Rust is not a hypothetical cost, it's already paid and already working.
2. The one real blocker — **its identity model is not built for serving many distinct, dynamically-created identities from one running daemon** (see Reference Architectures → zeroclaw-labs, and Open Questions) — is a scoped, specific gap, not a reason to reject the whole engine. It is the reason to fork it, not the reason to avoid it.
3. At the target scale (10,000+ concurrent distinct identities), running one lightweight process *per identity* does not work on realistic hardware (10,000 × even a few hundred MB peak would exceed the VPS's 7.5 GB RAM many times over) — a single shared daemon capable of resolving identity dynamically per request is the only approach that scales, and that requires code changes to zeroclaw itself, i.e. a fork.
4. The person who has run zeroclaw operationally for months (Irfan) judges the fork to be the right call given first-hand familiarity with its internals — that judgment supersedes further remote code-reading from this session, which is why the deep-dive into `zeroclaw-runtime/src/agent/` and `daemon/registry.rs` was stopped rather than completed. The open question about whether new agent identities can already be created dynamically at runtime (vs. requiring a config/restart) is left for Irfan to resolve from direct knowledge rather than further investigation here.

## Current State

- **zeroclaw-labs/zeroclaw v0.8.1 is already deployed in production** as `zeroclaw.service` (systemd) on the Tencent VPS, listening on port 3010 (`/usr/local/bin/zeroclaw daemon --host 0.0.0.0 --port 3010`). It is the vanilla release binary (`zeroclaw-x86_64-unknown-linux-gnu.tar.gz`), not a custom build. Measured: **6.6 MB resident memory** (peak 79.5 MB) after a week+ of uptime.
  - It currently serves **Console / Assistant / Workflow-builder** (per [[aivory-feature-service-map]]), called from `/opt/workflows-store/vps-bridge/zeroclawClient.js` via a minimal webhook (`POST /webhook {message, language, context}`).
  - Its `~/.zeroclaw/config.toml` already configures per-role brains (`agent_analyst_brain`, `agent_builder_brain`, `agent_comms_brain`, `agent_diagnostic_brain`, `agent_security_brain`, `agent_workflow_brain`) via OpenRouter, each with its own `risk_profiles.*.allowed_tools`, `runtime_profiles.*` (`max_delegation_depth`, `max_tool_iterations`, `agentic` on/off), and a `trust` scoring section (`decay_half_life_days`, `regression_threshold`, etc.).
  - It already has a `storage.postgres.default` backend (`vector_dimensions = 1536`, currently `vector_enabled = false`) and a `storage.qdrant.default` backend (`collection = "zeroclaw_memories"`) — both present in config but not confirmed fully wired/populated yet.
  - It already has a `providers.transcription.groq.default` entry (Whisper `large-v3-turbo`) for speech-to-text, and the `zeroclaw-gateway` crate includes a `voice_duplex.rs` module — real-time voice plumbing may already exist in some form (not yet confirmed how complete).
  - It already supports MCP tool servers (`[[mcp.servers]]`, e.g. `n8n-mcp` at `http://127.0.0.1:3020/mcp`) — a plausible integration point for OAuth-connected apps (Composio exposes an MCP-compatible endpoint) instead of custom REST calls.
- **The deployable-Agent stack this document is actually about (Telegram/Slack/WhatsApp/Office Assistant) does NOT use this zeroclaw instance at all.** It runs as a separate, bespoke system:
  - `backend/vps-bridge/telegram-agent.js` (Node.js) implements its own OpenAI-style tool-calling loop (`runAgentLoop`), calling OpenRouter directly, with its own Composio integration (`composioConnectedToolkits`/`composioToolDef`/`composioExecute`).
  - The `avry-zeroclaw` Python/FastAPI submodule (`ClementHansel/avry-zeroclaw`) — despite the name — **is not deployed anywhere** (no running container/process found on the VPS). It appears to be unused scaffolding.
  - `telegram-agent.js` already solves per-user identity dynamically today: a `tone`/`language_pref`/business-knowledge config is injected as inert "plain DATA" into the system prompt per request (explicitly designed so it can't override security rules) — this is the pattern that doesn't exist natively in zeroclaw's config-file-per-brain identity model, and is exactly what the fork needs to add.
  - Known gaps in this current system (to be superseded by the fork, not fixed in place): tool calls execute **sequentially** within a round, not concurrently; **no approval/confirmation gate** before a tool executes a real side effect; the whole loop is capped at a **hard 80-second wall-clock deadline** plus a round limit; Composio's schema/account caches are **in-process** (`Map`), incompatible with multiple workers.
- **Redis is already provisioned in production but unused** (see [[aivory-capacity-optimizations]]).
- **Postgres (`avry-postgres`) is the platform's single shared DB** — zeroclaw already has a Postgres storage backend of its own (see above), so the fork can very plausibly reuse `avry-postgres` directly rather than standing up a second database.

## Requirements

| # | Requirement | Why it's hard |
|---|---|---|
| 1 | Long-context memory | Naively growing the prompt doesn't scale (cost, latency, model context limits); needs retrieval instead of raw recall |
| 2 | Durable long-running tasks (hours → days, nonstop, with explicit on-hold) | **This is the requirement that motivated looking at Weft in the first place.** A task must be able to run for hours or days continuously, be explicitly paused ("on hold") and resumed later, and survive process restarts *mid-task* — not just have its status record survive. See [Durable Execution](#durable-execution--why-weft-was-considered-in-the-first-place) for the persistent-state vs. durable-execution distinction that decides whether zeroclaw's `control_plane` is enough |
| 3 | Smooth concurrency at 10,000+ users | Many thousands of users' agents running at once, each with their own distinct custom identity, must not block each other, degrade API responsiveness, or require one OS process per user |
| 4 | Smooth, smart tool use over OAuth-connected apps | OAuth + the tool API itself already work (Composio); the gap is orchestration quality — sequential-only execution, no approval gate, and a hard time limit on the loop |
| 5 | Voice agent, customizable per user | Needs an STT/TTS pipeline and a per-user voice choice |
| 6 | Hard tenant isolation (memory, credentials, task state) | Once 10k users share one daemon and one vector store, user A's memories/credentials/tasks must be *structurally* unable to leak into user B's context — enforced at the storage/query layer, not by prompt discipline. A single bug here is a cross-customer data leak. See [Tenant Isolation](#tenant-isolation) |

## Reference Architectures Evaluated

### 1. [zeroclaw-labs/zeroclaw](https://github.com/zeroclaw-labs/zeroclaw)

- Rust, **Apache-2.0** (permissive — forking is legally clean), 32k+ stars, actively maintained, not archived.
- **Already running in Aivory's production** — see Current State. This is the single most important fact discovered during this planning process: what started as "should we evaluate this" turned out to be "we already depend on this for other features, successfully, at negligible resource cost."
- Organized as a Cargo workspace of ~19 crates, no single "brain"/"engine" crate. Directly relevant crates for this fork:
  - `crates/zeroclaw-memory/src/` — chunking → embeddings → vector store (`qdrant.rs`, `postgres.rs`, `sqlite.rs`) + `knowledge_graph_pg.rs`, plus lifecycle management (`decay.rs`, `consolidation.rs`, `dedup.rs`, `importance.rs`, `hygiene.rs`, `budget.rs`) and even a markdown-file backend (`markdown.rs`, `agent_scoped_markdown.rs`). Solves Requirement #1 largely out of the box.
  - `crates/zeroclaw-runtime/src/control_plane/` — `task_registry.rs`, `task_store_sqlite.rs`, `goal_task.rs`, `reaper.rs`. A persisted, resumable task-state system. Solves Requirement #2 largely out of the box.
  - `crates/zeroclaw-runtime/src/cron/`, `.../heartbeat/`, `.../daemon/registry.rs` — persisted scheduling, liveness tracking, and a registry for running many agent daemons concurrently.
  - `crates/zeroclaw-runtime/src/approval/`, `trust/`, `verifiable_intent/` — reference design for a risk-tiered approval gate, directly relevant to Requirement #4.
  - `crates/zeroclaw-gateway/src/api_personality.rs` — reveals zeroclaw already has a **multi-agent layout**: each named agent has its own `<install>/agents/<alias>/workspace/` with its own personality files (`SOUL.md`, `IDENTITY.md`, `USER.md`, `TOOLS.md`, `MEMORY.md`, etc.), editable live via an API. This is more multi-agent infrastructure than initially assumed.
  - **The actual gap, precisely scoped:** the webhook API used today (`{message, language, context}`) carries no per-request identity override, and it's unconfirmed whether a brand-new agent alias/workspace can be created dynamically at runtime (via API) or must be provisioned via `config.toml` + restart. **This is the crux of the fork** — see Open Questions.
- **Tradeoff, reconsidered:** Rust is a new language for the team, but the binary is already running, already lightweight, and already partially does what's needed. The cost is a scoped feature addition (dynamic, DB-backed multi-tenant identity resolution) to an unfamiliar codebase — not standing up a new runtime from zero.

### 2. [WeaveMindAI/weft](https://github.com/WeaveMindAI/weft)

- Rust, 1,640 stars, created **2026-04-15** (~3 months old). Described by its own README as a "POC" and "young."
- Conceptually close (durable, human-in-the-loop pause/resume via [Restate](https://restate.dev)), but:
  1. **License is not standard open source** — a custom "O'Saasy License" bars using it to offer a competing hosted/SaaS product where the software's functionality is the primary value. Plausibly covers our use case; needs real legal review before reconsidering — a business/legal decision, not engineering.
  2. **Not production-ready** — README: *"Main branch is inactive because Weft is being actively rebuilt in the mvp branch, plan release August 2026,"* and *"treat it as a foundation to build on, not a finished product."*
- **Verdict: still not adopted.** Nothing about the fork decision changes this.

### 3. Restate (standalone) — lower priority now

Previously flagged as worth evaluating standalone for Requirement #2. **Lower priority now** that the fork gives direct access to zeroclaw's own `control_plane` (task registry + reaper) for the same requirement — but with one explicit condition: Restate **comes back on the table** if `control_plane` turns out to provide only persistent task *status* rather than true step-level durable execution (see [Durable Execution](#durable-execution--why-weft-was-considered-in-the-first-place)). Pairing the fork with Restate for orchestration is a legitimate fallback architecture, unlike adopting Weft wholesale.

## Proposed Building Blocks

| Requirement | Building block | Notes |
|---|---|---|
| Long-context memory | zeroclaw's own `zeroclaw-memory` crate (vector store + knowledge graph + decay/consolidation), backed by `avry-postgres` via its existing Postgres backend (`vector_enabled = true`) | Reuse in place, don't rebuild in Python. Disk footprint governed by the lifecycle pipeline — see [Memory Storage Budget](#memory-storage-budget--long-term-memory-inside-180-gb-of-ssd) |
| Durable long-running / on-hold tasks | zeroclaw's own `control_plane` (`task_registry` + `reaper`), backed by Postgres (decided — see Open Questions) | **Conditional on verifying `control_plane`'s checkpoint granularity** — if it only persists task status (not step-level progress), add Restate as the orchestration layer instead of accepting restart-from-scratch |
| Smooth concurrency at 10,000+ users | **The core fork work:** replace/augment zeroclaw's file-based, config-provisioned agent-identity model with a database-backed, dynamically-resolved multi-tenant identity system — one shared daemon (or a small pool, not one process per user) resolves identity/persona/tools/voice per request from Postgres | This is the one piece with no existing reference implementation inside zeroclaw itself; see Open Questions |
| Smooth, smart tool use over OAuth-connected apps | zeroclaw's existing MCP server support (`[[mcp.servers]]`), adding Composio as another MCP server instead of the current bespoke REST calls in `telegram-agent.js` | Also inherits zeroclaw's `approval`/`trust` modules for a risk-tiered confirmation gate |
| Voice agent | zeroclaw's existing `providers.transcription.groq` (Whisper) for Tier 1 STT, investigate `zeroclaw-gateway/src/voice_duplex.rs` for how much Tier 2 (real-time) plumbing already exists | Not yet confirmed how complete `voice_duplex.rs` is |
| Hard tenant isolation | Tenant-scoped storage design on top of `zeroclaw-memory` + `control_plane`: every memory/task/credential row carries a tenant id enforced at the query layer, Composio entity per user | No reference implementation in zeroclaw (single-operator assumption baked in); part of the core fork work alongside identity resolution — see [Tenant Isolation](#tenant-isolation) |
| Smart tool awareness ("Obsidian-style brain") | Per-tenant **capability graph** on zeroclaw's own `knowledge_graph_pg.rs` (+ optionally the `markdown.rs` wikilink backend): nodes = connected apps/tools/workflows/entities, edges = structural + learned-usage relationships; drives tool *selection* (graph narrows → embeddings rank → only relevant schemas enter the prompt) | Not a new engine — a knowledge graph, which zeroclaw already ships; the fork work is the ingestion pipeline (Composio catalog + tenant connections + n8n workflows + completed-run chains) — see [Capability Graph](#capability-graph--the-obsidian-style-brain-over-tools--integrations) |

## Durable Execution — Why Weft Was Considered in the First Place

The original motivation for evaluating Weft was **Requirement #2**: tasks that run for hours or days nonstop, can be explicitly put on hold, and pick back up later. Weft's answer to this is [Restate](https://restate.dev)-style **durable execution**: every step of a workflow is journaled, so after a crash/restart/resume the workflow replays its journal and continues *from the exact step it was on* — completed LLM calls and tool calls are not re-executed.

That is a materially different guarantee from **persistent task state**, where a task's *record* (status, metadata, maybe a coarse checkpoint) survives a restart but the in-flight work does not — the task either restarts from the beginning or from whatever coarse checkpoint was last written, potentially re-running side-effectful tool calls.

**It is not yet confirmed which of these zeroclaw's `control_plane` provides.** `task_registry.rs` + `task_store_sqlite.rs` + `reaper.rs` clearly persist task lifecycle state; whether execution progress is checkpointed at step granularity (and whether tool side effects are made idempotent/deduplicated on replay) is unknown. This matters most for exactly the tasks this requirement is about — a 3-day task that loses 2 days of progress on every daemon restart does not satisfy the requirement, and a replayed task that re-sends emails or re-creates calendar events is worse than one that fails.

**What to verify in `control_plane` (blocking for Requirement #2):**

1. Granularity: is progress checkpointed per step/tool-call, or only per task status transition?
2. Restart behavior: after `systemctl restart zeroclaw`, does an in-flight task resume mid-plan or restart from the top?
3. Side-effect safety on resume: is there any idempotency/dedup mechanism for tool calls that already executed before the crash?
4. Explicit hold: is there a first-class paused/on-hold state (survives restarts, excluded from the reaper), or does "pause" have to be emulated?
5. Long-wait ergonomics: can a task block for days awaiting an external event (e.g. a human approval) without holding a thread/slot?

**Decision rule:** if `control_plane` gives (or can cheaply be extended to give) step-level checkpointing with a real on-hold state, Requirement #2 stays inside the fork. If it is status-tracking only, do **not** rebuild durable execution by hand in the fork — put Restate back on the table as the orchestration layer around the forked engine (Restate standalone, without Weft's DSL/license problems).

## Tenant Isolation

Elevated to a first-class requirement (#6). The identity-resolution work (Requirement #3) answers "whose persona does this request use?" — tenant isolation answers the harsher question: "what structurally prevents tenant A's data from reaching tenant B?" In a single shared daemon serving 10k users, prompt-level discipline is not an acceptable enforcement mechanism.

Concretely, isolation must be enforced at the storage/query layer in each subsystem:

- **Memory (`zeroclaw-memory`):** every chunk/embedding/knowledge-graph row carries a tenant id, and every retrieval query filters on it *inside* the storage backend (Postgres `WHERE tenant_id = $1` / Qdrant payload filter — or collection-per-tenant if filter performance at 10k tenants disappoints). Retrieval code paths that can be called without a tenant id should not exist.
- **Task state (`control_plane`):** task records are tenant-scoped; the reaper, task listing, and resume paths must be unable to touch another tenant's tasks.
- **Tool credentials:** Composio connections are already per-user entities — the fork must resolve the Composio entity from the authenticated tenant, never from anything the LLM or message content can influence.
- **Cross-tenant prompt injection:** one tenant's stored memories/business-knowledge must be treated as untrusted data when injected (the existing "inert plain DATA" pattern from `telegram-agent.js`), so a malicious payload stored by tenant A can never redirect an agent belonging to tenant B — this matters if any shared/global memory tier is ever added.
- **Verification:** isolation gets its own tests — adversarial retrieval tests proving cross-tenant queries return nothing, run in CI, before any real user data goes in.

zeroclaw was built with a single-operator assumption (one install, one owner, per-alias workspaces on disk), so none of this exists as reusable reference code — like dynamic identity resolution, it is core fork work, and the two should be designed together in the same Postgres schema (Next Steps #3).

## Capability Graph — the "Obsidian-Style Brain" over Tools & Integrations

Irfan's framing: the agent should have a "smart brain" that can *see the network* of tools, app integrations, workflows — the way Obsidian's graph view makes relationships between notes visible and traversable.

**Reframed technically:** Obsidian's "engine" is not a neural network — it is markdown files + `[[wikilinks]]` rendered as a **knowledge graph**. The neural half of the wish already exists in this stack (embeddings in the vector store for fuzzy retrieval, the LLM for reasoning); the missing half is the **structured relational layer**: explicit, traversable nodes and edges over the agent's capabilities. No new engine needs to be invented or adopted.

**zeroclaw already ships both halves** inside `crates/zeroclaw-memory`: `knowledge_graph_pg.rs` (a Postgres-backed knowledge graph) and `markdown.rs` / `agent_scoped_markdown.rs` (an Obsidian-format markdown+wikilinks backend). This is a building block already inside the fork, applied to a new domain — not a new dependency.

**The concrete artifact: a per-tenant capability graph.**

- **Nodes:** connected apps (Composio toolkits the tenant has authorized), individual tools within them, n8n workflows, and durable entities the tenant's business cares about (customers, projects, recurring documents).
- **Edges:** "belongs to" (tool → app), "requires connection" (tool → OAuth account), "commonly chained with" (learned from actual usage: Gmail → Sheets → Slack), "feeds into" (workflow → workflow), "about" (memory → entity).

**Why this earns its place (it's not just a nice visualization):** the practical problem it solves is **tool selection at scale**. A tenant with many connected apps has hundreds of Composio tool schemas — far too many to put in the context window per request. The selection pipeline becomes: capability graph narrows to the tenant's actually-connected apps and their relationships → embeddings rank the plausible tools for this specific request → only that subset's schemas enter the prompt. And because cross-app relationships are explicit and persistent, the agent can *plan* multi-app chains ("invoice arrives in Gmail → log to Sheets → notify Slack") from known structure instead of rediscovering the topology every conversation. The "commonly chained with" edges also compound over time — the graph gets smarter per tenant with usage, which is exactly the "relationship memory" Requirement #1 wants, applied to capabilities instead of conversation.

**Constraints:**

- Tenant-scoped like everything else (Requirement #6): a tenant's capability graph contains only *their* connected apps and learned patterns — usage-pattern edges are per-tenant data and must never inform another tenant's tool selection.
- **Open:** `knowledge_graph_pg.rs`'s actual shape is unverified — schema, traversal API, and (critically) *who populates edges and when*. If it's a general triple store with no population pipeline, the fork work is the ingestion side: seed nodes from the Composio catalog + the tenant's connections + their n8n workflows, and append "commonly chained with" edges from completed agent runs.

## Staying Lightweight — the Architecture Law That Preserves the 6.6 MB Class

The question this section answers: how does the fork stay Rust-class lightweight even as we bolt on memory, knowledge graph, durable tasks, capability graph, approval gates, and voice?

**The premise to correct first:** the 6.6 MB is not a magic property of Rust — it is the property of an architecture where **the daemon is a thin async orchestrator and everything heavy lives somewhere else**. Rust contributes the floor (no VM, no GC, no runtime; code that isn't executing costs disk, not RAM; an idle daemon holds only sockets, config, and connection pools), but the ceiling is decided by architectural discipline. Lose the discipline and a Rust daemon bloats like anything else.

### The governing law

> **Daemon RAM must scale with *active work* — never with features shipped, never with tenants registered.**

- A **feature** = a code path → costs binary size on disk, ~zero RAM until invoked.
- A **registered tenant** = rows in Postgres → costs DB disk, **zero daemon RAM while idle**. 10,000 sleeping tenants = 0 bytes.
- **Active work** = an in-flight request or an executing task step → the *only* thing permitted to consume daemon memory, and it must release it the moment the step completes or parks.

Every design decision in this plan gets checked against this law.

### Where each added engine's weight actually lives

| Engine being added | Where the weight lives | Daemon's share |
|---|---|---|
| Long-context memory (vectors, embeddings) | Postgres+pgvector / Qdrant (separate processes, already provisioned); embedding **generation via API** — never a local model in the daemon | Query + a bounded result set per request |
| Knowledge graph / capability graph | Postgres (`knowledge_graph_pg.rs` backend) | Traversal query per request |
| Durable tasks / on-hold state | Postgres checkpoints — **durable execution doubles as memory relief: an on-hold or between-steps task costs 0 daemon RAM** | Only the currently-executing step |
| LLM inference | OpenRouter (someone else's GPU) | An awaiting future + response buffer |
| Tool execution | Composio / n8n via MCP (external services) | An awaiting future |
| STT / TTS | Groq / ElevenLabs APIs | Streamed audio passthrough |
| Tenant identity/persona | Postgres row + a **bounded** LRU cache | A few KB per *active* tenant |

Nothing on this list embeds a heavy runtime into the daemon. That is not an accident — it is the selection criterion.

### Why 10k concurrent fits in the async model

10,000 active conversations are, at any instant, almost entirely **waiting** on external I/O (LLM responses, tool calls, DB queries). In tokio's async model a parked conversation is a future measured in kilobytes — not an OS thread with a megabyte-plus stack. Rough budget: 10k in-flight × ~100 KB working state ≈ **~1 GB**, comfortably inside the 7.5 GB VPS. The same load on a thread-per-request or process-per-tenant model does not fit at all. The corollary discipline: **never hold a thread, a large buffer, or an open transaction while awaiting an external call** — stream instead of buffering where possible.

### The discipline list — what would silently break the law

1. **No unbounded in-process caches keyed by tenant.** This is exactly the `telegram-agent.js` `Map` mistake being left behind. Every cache is a bounded LRU; anything shared across workers goes to **Redis (already provisioned and sitting unused** — see [[aivory-capacity-optimizations]]).
2. **No heavy runtimes embedded in the daemon.** No local embedding/inference models, no headless browsers, no per-tenant interpreters or Node sidecars. If a capability needs one, it becomes a separate service the daemon calls.
3. **Anything big and stateful becomes its own process.** This is also crash isolation: the core daemon stays small enough to restart in milliseconds without losing anything (state is in Postgres anyway, per Requirement #2).
4. **Prompt assembly is retrieval, not accumulation.** Context is built per request from bounded retrieval (memory top-k, capability-graph-narrowed tool subset) — never from an ever-growing resident conversation object.
5. **Idle must cost nothing.** Any per-tenant resident structure proposed in a design review gets challenged with: "what does this cost for 9,900 tenants who are asleep?"

### Make it enforceable, not aspirational

The load tests (Next Steps #7 and #10) track **RSS per 1,000 active conversations** as a first-class metric with an explicit budget (working target: daemon under ~1.5 GB at 10k in-flight; refine after the 500-tenant test). A memory regression is a failed load test, same as a latency regression. Honest caveat: the 6.6 MB is an *idle* number (measured peak already 79.5 MB) — under real load the daemon will sit in the hundreds of MB, and that's correct. The goal is not the idle number; it is the **scaling law**: memory tracks concurrent work, and flatlines as features and registered tenants grow.

## Memory Storage Budget — Long-Term Memory inside 180 GB of SSD

The RAM law above has a disk-side twin. The question: how does per-tenant long-term memory not eat the VPS's 180 GB SSD — and is an auto-compress mechanism needed? **Answer: yes, but the right shape is a memory *lifecycle pipeline* (distill → consolidate → decay → quota), not a gzip pass — and zeroclaw-memory already ships every stage of it** (`decay.rs`, `consolidation.rs`, `dedup.rs`, `importance.rs`, `hygiene.rs`, `budget.rs` — listed in Reference Architectures above). The fork work is tenant-scoping and tuning that machinery, not inventing it.

### The math that frames everything: vectors dominate, not text

A memory chunk's text is ~0.5 KB. Its embedding at the currently-configured **1536 dims × float32 = 6 KB** — twelve times the text — plus roughly 1.5–2× HNSW index overhead. So the storage problem is an *embedding-count and embedding-width* problem.

- **Naive design (embed every raw message):** an active tenant at ~20 messages/day ≈ 7,300/year × ~9 KB (vector + index + text) ≈ **65 MB/year/tenant** → ×10,000 tenants ≈ **650 GB/year. Dead on arrival.**
- **Budget reality:** the 180 GB also holds the OS, Docker images, the main `avry-postgres` data, n8n, and logs — the memory system realistically gets **60–80 GB**, total, across all tenants.
- **Disciplined design (the pipeline below):** steady-state ~2,000 distilled memories/tenant × ~3 KB (see width reduction) ≈ **~6 MB/tenant** → ×10,000 ≈ **60 GB. Fits** — and most tenants will sit far below the heavy-tenant figure.

### The four layers

**1. Distill before you embed — never embed raw transcripts.** Raw conversation is *episodic* buffer, kept only as a short rolling window. What gets embedded into long-term memory is the *distilled* output (facts, preferences, decisions, entity updates — a few items per day, not per message). This alone cuts embedding count ~10×. It's the same distinction this very planning process uses: the session transcript is not the memory; the written-down conclusions are.

**2. Consolidate and decay — memory that approaches a steady state instead of growing linearly.** This is the "auto-compress" mechanism, and it's semantic, not zip: `consolidation.rs` periodically merges clusters of related old memories into one denser summary (deleting the originals), `dedup.rs` removes near-duplicates, and `importance.rs` + `decay.rs` score memories so that low-importance ones fall below threshold and get pruned by `hygiene.rs`. Old memories don't accumulate — they *compact into fewer, denser rows*, exactly like the trust section's `decay_half_life_days` already works in prod config. Result: per-tenant memory asymptotes instead of growing forever.

**3. Shrink the vectors themselves.** Two independent multipliers, both nearly free: (a) **fewer dims** — 1536 is not sacred; 512–768-dim embeddings (or Matryoshka truncation) lose little retrieval quality at this scale and halve-to-third the size; (b) **narrower scalars** — pgvector `halfvec` (2 bytes/dim) or Qdrant int8/binary quantization with rescoring gives another 2–4×. Combined: 6 KB/vector → **~1–1.5 KB/vector** before any semantic compaction.

**4. Hard per-tenant quotas (`budget.rs`) — and they're a product feature, not just a safety valve.** Each tier gets a memory budget (e.g. foundation < pro < enterprise — same tiering that already gates Office Assistant). Hitting the cap triggers forced consolidation first, then lowest-importance pruning — never a hard failure. This bounds the worst case *by construction*: total disk ≤ Σ(tenant quotas), so the system cannot be surprised by disk exhaustion. A bigger memory quota is also a natural, honest upsell.

### Document upload limits — enforce at the gate, not after

Decision (Irfan, 2026-07-16): **hard cap of 10 MB per document upload** (business-knowledge files, documents sent to the agent via Telegram/WhatsApp/dashboard). Rationale: every uploaded document fans out into cached/derived artifacts — extracted text, chunks, embeddings, index entries — so an unbounded upload is an unbounded multiplier on the whole pipeline. Rejecting at the gate is free; cleaning up after ingestion is not.

- **Enforce at both edges:** the bridge/dashboard rejects >10 MB before the file ever reaches the engine (with a clear user-facing message), *and* the engine enforces it independently — never trust only the outer layer. Telegram/WhatsApp channel handlers check the file size from the channel API metadata before downloading.
- **Per-file cap is necessary but not sufficient:** 100 files × 9.9 MB is still ~1 GB. The binding constraint is the **per-tier total document quota**, counted inside the same `budget.rs` tenant budget as memories — a tenant's knowledge base competes with (and is bounded by) their overall memory quota.
- **The raw file is not the durable record.** Ingestion = extract text (streamed, bounded) → distill/chunk → embed; the original binary goes to cold storage (zstd → Tencent COS) or is discarded per retention policy, same rule as raw transcripts. What the agent "knows" is the distilled, embedded content — a 10 MB PDF should end up costing a few hundred KB of hot storage, not 10 MB.
- **Ingestion is active work** (per the [RAM law](#staying-lightweight--the-architecture-law-that-preserves-the-66-mb-class)): extraction/chunking streams through bounded buffers — never load the whole document into daemon memory, and cap concurrent ingestions per tenant (a bulk upload is a background task in `control_plane`, not 50 parallel in-flight parses).

### Supporting hygiene

- **Cold archive:** raw transcripts past the rolling window are zstd-compressed (text compresses 5–10×) and moved to cheap object storage (Tencent COS) or simply deleted per retention policy — the *distilled* memories are the durable record, transcripts are not.
- **Postgres ops:** WAL size caps, autovacuum tuned for the churn that consolidation/pruning creates (dead tuples), and disk-usage-per-tenant as a tracked metric with alerting — same enforceability principle as the RAM budget.
- **Open item:** the lifecycle parameters (decay half-life, consolidation cadence, importance thresholds, per-tier quota sizes) have no right answer on paper — set initial values, then tune against the 500-tenant load test (Next Steps #7), which should also measure **disk-per-tenant-per-month** alongside RSS and cost.

## Target Topology & Migration Strategy

Two decisions the original draft left implicit, now made explicit:

1. **`vps-bridge` stays as the front layer.** Channel webhooks (Telegram/Slack/WhatsApp), auth, the credit gate, tier gating (Office Assistant = Enterprise-only), and superadmin bypass all currently live in the bridge and are business logic, not agent-engine logic. The fork replaces `runAgentLoop` and everything behind it — it does not absorb billing/entitlement. The bridge calls Aivory Cerveau over an internal API the way it calls zeroclaw's webhook today, passing the resolved tenant id.
2. **Side-by-side, not in-place.** Because the engine's footprint is ~6.6 MB, the fork runs as a *second* instance on its own port next to the existing production zeroclaw. Deployable-agent traffic migrates to the fork; Console/Assistant/Workflow-builder keep using the untouched vanilla instance until the fork is proven, and migrate later (or never — running two instances indefinitely is nearly free). This removes almost all of the "must not break existing usage" migration risk at the cost of one extra systemd unit.

## Tool Use Smoothness & OAuth App Integration

The current gaps described in Current State (sequential tool execution, no approval gate, 80-second deadline, in-process caches) are properties of the **soon-to-be-superseded** `telegram-agent.js` system, not of the fork. Once the deployable-agent traffic moves onto Aivory Cerveau:

1. Tool-call concurrency, approval gating, and unbounded/resumable task duration become properties of the shared engine (`control_plane` + `approval`/`trust`) rather than something to hand-build in Node.
2. OAuth app access moves from bespoke Composio REST calls to Composio-as-an-MCP-server, using the same `[[mcp.servers]]` mechanism already proven with `n8n-mcp`.
3. `telegram-agent.js`'s existing per-user identity injection pattern (tone/language/business-knowledge as inert "plain DATA") is the reference for what the fork's dynamic identity system needs to reproduce, generalized and stored in Postgres instead of hardcoded per request.

## Voice Agent (Custom Per User)

- **Tier 1:** STT (Groq Whisper, already configured in zeroclaw) converts a voice note to text, into the same agent loop; TTS converts the reply back. Telegram/WhatsApp already carry voice notes natively.
- **Tier 2:** real-time duplex voice — `zeroclaw-gateway/src/voice_duplex.rs` suggests zeroclaw may already have real plumbing for this, not yet confirmed how far it goes. Worth checking before assuming Tier 2 needs a separate OpenAI-Realtime/WebRTC project, as previously assumed.
- **Customizable per user:** extends the same per-agent identity system being built for Requirement #3 (multi-tenant identity) — voice choice is just another per-tenant identity field.
- **Candidate providers:** ElevenLabs (TTS + voice cloning, complements Groq's STT), Deepgram (alternative STT) — not evaluated yet.

## Open Questions / Risks

- ~~**The two central open questions:**~~ **BOTH RESOLVED 2026-07-16 — see [ADR-001](ADR-001-AIVORY-CERVEAU-PHASE0.md).** Summary: (1a) dynamic agent creation at runtime **already exists** (`api_sections.rs` create + workspace scaffold + in-process `/admin/reload`, control-plane store reused across reloads) — the wall is per-signup global reloads + one TOML at 10k scale, so the fork is confirmed **additive** (DB-backed identity path alongside config aliases); note `daemon/registry.rs` turned out to be a subsystem-starter registry, not an agent pool, and upstream already ships an unstamped `TaskRecord.principal_id` seam plus default-jailed per-agent memory/filesystem isolation. (1b) `control_plane` = first-class **atomic pause/resume with durable blockers + continuation-turn resume** (conversation-turn granularity), but prior-boot `Running` orphans go `Lost` (not auto-resumed) and there is no per-tool replay journal — **Restate stays OUT**; the fork adds F-1 (auto-resume from persisted continuation context) and F-2 (idempotency keys on side-effectful tool calls) instead.
- **The real bottlenecks at 10k concurrent are not RAM.** The doc establishes RAM is a non-issue for the shared-daemon design, but at 10,000 concurrent users the first walls will be: **OpenRouter rate limits and LLM inference cost** (thousands of parallel completions; no per-active-user cost model exists yet — at this scale inference cost is a product-viability question, not just an engineering one), **Postgres connection pool** (currently 200 — see [[aivory-capacity-optimizations]]), and **Composio API rate limits**. Also missing: **per-tenant rate limiting/quotas**, so one runaway agent cannot starve the shared LLM budget. All four need numbers before the load-test milestone means anything.
- **Fork maintenance strategy — undecided.** Upstream zeroclaw is 32k-star and actively maintained; every upstream security fix and feature will need rebasing over the multi-tenant changes. Options: (a) hard fork, accept divergence; (b) periodic rebase, keep the multi-tenant work as a clean patch series; (c) attempt to upstream dynamic identity resolution (Apache-2.0; if the maintainers take it, the maintenance burden disappears permanently). Related risk: **bus factor = 1** — Irfan is currently the only person with both zeroclaw-internals and Rust familiarity.
- **Legal:** Weft's O'Saasy license — unchanged open item, only relevant if Weft is ever reconsidered (Restate itself is separately licensed and not affected).
- **Scale validation:** 10,000+ concurrent users is the stated target; no load testing has been done against either the current system or a forked prototype yet. A small-scale synthetic test (~500 tenants) should happen as soon as identity resolution prototypes, not just before cutover.
- **`voice_duplex.rs` completeness** — unconfirmed how much real-time voice support already exists versus is stubbed.
- **`knowledge_graph_pg.rs` shape** — unverified: schema, traversal API, and who populates edges. Determines how much of the [capability graph](#capability-graph--the-obsidian-style-brain-over-tools--integrations) is reuse vs. ingestion work to build. Non-blocking (unlike 1a/1b) — the capability graph is an enhancement to tool selection, not a prerequisite for the fork.
- ~~**Migration path:**~~ **Resolved by the side-by-side decision** (see [Target Topology](#target-topology--migration-strategy)): the fork runs as a second instance; Console/Assistant/Workflow-builder stay on untouched vanilla zeroclaw until the fork is proven.
- ~~**Postgres vs. SQLite:**~~ **Decided: Postgres.** SQLite's single-writer model is a non-starter for `control_plane`/`zeroclaw-memory` shared across 10k tenants, and the platform already standardizes on `avry-postgres`. The only open sub-question is whether zeroclaw's Postgres backends need work to be tenant-scoped (they almost certainly do — see [Tenant Isolation](#tenant-isolation)).
- **Housekeeping:** the unused `avry-zeroclaw` Python submodule (`ClementHansel/avry-zeroclaw`) should be archived or renamed — its name already caused confusion during this planning and will get worse once a real fork named "Aivory Cerveau"/zeroclaw exists.

## Non-Goals

- Adopting Weft's DSL/dashboard/Restate stack.
- Building Tier 2 (real-time streaming) voice as a from-scratch project, until `voice_duplex.rs`'s actual completeness is checked — don't assume it needs OpenAI Realtime/WebRTC without looking first.
- Rebuilding Requirements #1/#2 in Python — superseded by reusing the fork's own `zeroclaw-memory`/`control_plane` crates.

## Implementation Plan

Phased execution plan. Each phase has **deliverables** and an **exit gate** — the gate must pass before dependent phases start. Durations are indicative for a solo-developer + AI-assisted pace and should be recalibrated after Phase 0 resolves the scope question. Where phases are independent they are marked parallelizable.

### Dependency map

```
Phase 0 (blocking questions)
  └─► Phase 1 (fork bootstrap)
        └─► Phase 2 (multi-tenant core: identity + isolation)   ◄── the critical path
              ├─► Phase 3 (memory + lifecycle + ingestion)
              ├─► Phase 4 (tools: Composio-MCP, capability graph, approval gate)
              └─► Phase 5 (500-tenant load test — needs 2, benefits from 3+4)
                    └─► Phase 6 (channel migration, Telegram first)
                          └─► Phase 8 (10k load test → cutover decision)
Phase 7 (voice)  — parallel track, needs Phase 2 only; Tier 2 scoping can start anytime
```

### Phase 0 — Resolve the blocking questions *(gate for everything; ~days, not weeks)*

| Task | Detail |
|---|---|
| 0.1 Identity question (1a) | Dynamic vs. static agent-identity provisioning — from Irfan's operational knowledge, else a targeted read of `zeroclaw-runtime/src/agent/` + `daemon/registry.rs` |
| 0.2 Durability question (1b) | Run the 5-point checklist in [Durable Execution](#durable-execution--why-weft-was-considered-in-the-first-place) against `task_registry.rs`/`task_store_sqlite.rs`/`goal_task.rs`/`reaper.rs` |
| 0.3 Fork-maintenance decision | Hard fork vs. rebase-friendly patch series vs. upstream-the-feature (see Open Questions) |

**Exit gate:** a short written architecture decision record answering: (a) is the fork additive or architectural? (b) is Restate in or out? (c) which fork-maintenance strategy? Everything downstream is scoped by these three answers.

> **STATUS 2026-07-16: PASSED** — [ADR-001](ADR-001-AIVORY-CERVEAU-PHASE0.md): (a) additive; (b) Restate OUT, replaced by scoped extensions F-1 (auto-resume) + F-2 (tool idempotency keys); (c) recommended rebase-friendly patch series with upstreaming ambition — pending Irfan's confirmation. Phase 2 additionally inherits two upstream gifts: `TaskRecord.principal_id` (tenant-stamping seam) and default-jailed per-agent isolation semantics to mirror at row level.

### Phase 1 — Fork bootstrap *(~1 week)*

| Task | Detail |
|---|---|
| 1.1 Repo | Fork under the Aivory-hub88 org (canonical org per [[aivory-dashboards-vps-deploy]]), internal codename stays zeroclaw, product name "Aivory Cerveau" |
| 1.2 Build pipeline | Rust toolchain + CI producing the same `x86_64-unknown-linux-gnu` artifact as the release binary currently in prod |
| 1.3 Vanilla parity deploy | Deploy the self-built (unmodified) fork **side-by-side** on the VPS: second systemd unit, own port, own `~/.zeroclaw`-style config dir — prod zeroclaw:3010 untouched per [Target Topology](#target-topology--migration-strategy) |

**Exit gate:** self-built binary passes the same webhook smoke test as prod vanilla (`POST /webhook {message, language, context}` round-trip), running side-by-side without touching port 3010.

> **STATUS 2026-07-17:** 1.1 **DONE** — fork live at [Aivory-hub88/AVRY-Cerveau](https://github.com/Aivory-hub88/AVRY-Cerveau), default branch `cerveau-main` = upstream **v0.8.3** + patch 0001 (`CERVEAU_PATCHES.md` patch-series log + single `cerveau-build` CI workflow replacing upstream's 25; upstream mirrored via remote at rebase time, not in-repo). **Base moved v0.8.1 → v0.8.3** after checking the new releases: the durable run/task control plane (Requirement #2's foundation) only exists from v0.8.2, and v0.8.3 adds SSRF/secret-leak/RUSTSEC hardening — see the version-boundary amendment in [ADR-001](ADR-001-AIVORY-CERVEAU-PHASE0.md). A first v0.8.1-based build already passed CI (proving the pipeline); v0.8.3 build recipe differs (toolchain 1.96.1, xtask-resolved `dist` feature set). 1.2 **DONE** — CI green in 24 min, artifact sha256-verified. 1.3 **DONE — PHASE 1 EXIT GATE PASSED 2026-07-17**: `zeroclaw-cerveau.service` active on **127.0.0.1:3100**, own `--config-dir /home/ubuntu/.zeroclaw-cerveau` (prod config copy stripped of `storage.postgres/qdrant` + `mcp.servers`; data inside the config dir = full isolation), binary `/usr/local/bin/zeroclaw-cerveau` (self-built v0.8.3, 52 MB). Smoke tests: `/health` ok — **including a `control-plane` component that prod v0.8.1 doesn't have** (v0.8.2+ feature, live confirmation of the ADR's version-boundary note); `POST /webhook` LLM round-trip identical contract to prod (`{"model":"deepseek/deepseek-v4-flash","response":"CERVEAU-OK"}`); identity correct ("I am Aivory, the model trained by Aivory"); RSS 27 MB at fresh boot. Prod zeroclaw:3010 (v0.8.1) untouched throughout. **Phase 2 (multi-tenant core) is unblocked.**

### Phase 2 — Multi-tenant core: identity + isolation *(the critical path; ~2–4 weeks depending on Phase 0's answer)*

| Task | Detail |
|---|---|
| 2.1 Schema | Postgres multi-tenant schema in `avry-postgres`: tenant → persona/tone/language/voice/connected-tools scope (superset of what `telegram-agent.js` injects today), designed **together with** isolation — tenant id on every memory/task/credential row per [Tenant Isolation](#tenant-isolation) |
| 2.2 Identity resolution | Per-request dynamic identity resolution in the daemon (webhook payload gains an authenticated tenant id; persona loaded from Postgres through a bounded LRU), replacing/augmenting the file-based per-alias workspace model |
| 2.3 Inert-DATA injection | Port `telegram-agent.js`'s anti-injection pattern: persona/business-knowledge enters the prompt as inert data that cannot override security rules |
| 2.4 Isolation tests | Adversarial cross-tenant retrieval tests in CI from the first commit (memory, tasks, credentials) |
| 2.5 Durability wiring | Apply Phase 0.2's outcome: either validate `control_plane` step-level resume + on-hold, or integrate Restate as the orchestration layer |

**Exit gate:** two synthetic tenants, created **via API at runtime with no restart**, hold provably isolated memories/tasks/credentials (CI adversarial suite green); a multi-hour task survives a daemon restart and an explicit hold/resume cycle without re-executing completed side effects.

> **STATUS 2026-07-17 — identity + isolation half PASSED and live-verified; durability half partial (tracked, non-blocking).** Patches on `cerveau-main`: 0002 (P-identity — tenant memory scope, persona resolver, inert-DATA injection, principal stamping), 0003 (5 adversarial isolation tests as a CI gate), 0004 (F-2 idempotency-ledger primitive). Live E2E on the side-by-side `:3100` instance against a throwaway `cerveau_e2e` Postgres DB (prod `avry-postgres` untouched): two data-row-only tenants each adopted their own persona (Sari/Toko Baju Melati vs Budi/Bengkel Jaya Motor), and tenant B could not see tenant A's private knowledge — cross-tenant isolation confirmed end-to-end on top of the green CI isolation suite. Durability: hold/resume durable (upstream v0.8.3); F-2 ledger landed; **F-2 hot-loop wiring + F-1 auto-resume deferred to dedicated patches** (need a side-effect taxonomy and a goal-execution driver seam respectively — see [ADR-003](ADR-003-CERVEAU-DURABILITY.md)). These do not block the identity/isolation cutover Phase 6 depends on. Design in [ADR-002](ADR-002-CERVEAU-TENANT-DESIGN.md).

### Phase 3 — Memory engine + lifecycle + ingestion *(~2 weeks; parallel with Phase 4)*

| Task | Detail |
|---|---|
| 3.1 Vector config — **decide before first ingestion** | Embedding width (512–768) + scalar type (`halfvec`/quantized) per [Memory Storage Budget](#memory-storage-budget--long-term-memory-inside-180-gb-of-ssd); changing later = re-embed everything |
| 3.2 Enable vectors | `vector_enabled = true` on the Postgres backend against `avry-postgres`, tenant-scoped per Phase 2.1 |
| 3.3 Lifecycle pipeline | Distill-before-embed; wire `consolidation`/`dedup`/`decay`/`importance`/`hygiene` per-tenant; per-tier quotas via `budget.rs` (foundation < pro < enterprise) |
| 3.4 Document ingestion | 10 MB/file gate at bridge **and** engine (channel handlers check size from API metadata before download); streamed extraction as a `control_plane` background task; raw binary → cold storage/discard. **DECIDED 2026-07-18: deferred to Phase 6** — documents today flow only through prod `avry-backend`'s extractor (20 MB cap, untouched); the 10 MB gate is built into Cerveau's own ingestion pipeline when channel migration lands, rather than retrofitting the system being replaced |

**Exit gate:** synthetic tenant fed 90 days of simulated conversation + documents shows **flat (asymptotic) disk usage** after consolidation kicks in, retrieval quality spot-checked; a >10 MB upload is rejected at both layers with a clear user-facing message.

> **STATUS 2026-07-18:** 3.1 ✅ (dims locked 768); 3.2 ✅ **live on production avry-postgres** — `cerveau` schema auto-created, tenant-scoped write + cross-tenant blindness verified live, throwaway DB dropped; 3.3 ✅ lifecycle primitive (patch 0005, CI-green vs real Postgres) + daily timer driver; 3.4 → moved to Phase 6. **Exit gate partially met:** bounded-growth machinery is live, but the 90-day flat-disk simulation awaits **P-consolidation** (upstream ships `consolidate_turn` with no call sites — auto-distill isn't wired; writes currently only via the agent's `memory_store` tool) and **P-recall-scope** (memory tools are session-scoped; core facts should be tenant-wide). Vectors deferred: upstream bug (pgvector init panics from async context) + no pgvector extension in the current avry-postgres image + no embedding key yet. Full detail: [ADR-004 §4b](ADR-004-CERVEAU-MEMORY-LIFECYCLE.md).

### Phase 4 — Tool orchestration *(~2 weeks; parallel with Phase 3)*

| Task | Detail |
|---|---|
| 4.1 Composio as MCP | Add Composio as `[[mcp.servers]]` alongside `n8n-mcp`; Composio entity resolved from the authenticated tenant, never from LLM-influenced content |
| 4.2 Capability graph | Read `knowledge_graph_pg.rs` to scope; seed per-tenant graph from Composio catalog + tenant connections + n8n workflows; tool selection = graph narrows → embeddings rank → subset schemas into prompt |
| 4.3 Approval gate | Tiering via `approval`/`trust` modules; confirmation surfaces as **inline buttons in the chat channel** (dashboard = secondary audit surface); a pending approval is a durable on-hold task (Phase 2.5) |
| 4.4 Concurrent tool calls | Independent tool calls within a round execute concurrently (replacing `telegram-agent.js`'s sequential loop); shared caches → Redis, bounded LRUs in-process |

**Exit gate:** an agent for a synthetic tenant completes a multi-app chain (e.g. Gmail → Sheets → Slack) using only that tenant's connected apps, pausing for an in-channel approval on the side-effectful step, with no 80-second-class wall-clock ceiling.

> **UX note — per-agent integrations on the Agents page (decided direction, Irfan 2026-07-18).** Two concepts must stay separate in the dashboard: **connections** (Composio OAuth account linking) are **per-USER** — one Gmail connection serves every agent the user deploys — while **tool scope** ("which connected apps may THIS agent use") is per-agent. Therefore: do **not** embed OAuth inside the agent setup modal (it would wrongly imply per-agent connections and break the user's mental model). Direction chosen: evolve `CustomizeAgentModal` into tabs — **Identity | Connections | Tools**. *Connections* tab lists the user's already-connected apps (user-level store; "Connect more" runs the normal user-level OAuth flow or deep-links to Integrations). *Tools* tab is per-agent enable/disable toggles over connected apps — this is the UI face of ADR-002's "connected-tools scope per tenant" field. **Sequencing rule: the Tools tab ships together with (not before) this phase's backend tool-scope enforcement** — a toggle that nothing enforces is cosmetic and worse than absent. Prerequisite check when building: verify whether a per-agent tool-scope column exists yet (today the bridge curates tool slugs statically per agent type; the per-tenant scope column lands with this phase's work).

### Phase 5 — Early load test, 500 tenants *(~1 week after Phases 2–4 land)*

Validate the shared-daemon design before building more on top. Produce the three metrics with budgets: **RSS per 1,000 active conversations** (target: on track for <~1.5 GB @ 10k), **disk per tenant per month** (target: consistent with ~6 MB steady state), **LLM cost per active user** (first real number — feeds pricing). Surface the Postgres-pool and OpenRouter-rate-limit walls; implement **per-tenant rate limiting** based on what breaks. Tune lifecycle parameters (decay half-life, consolidation cadence, quotas) against measured data.

**Exit gate:** all three metrics within budget at 500 synthetic tenants, per-tenant rate limiting demonstrably prevents one runaway tenant from starving others. **A miss here stops the line** — fix before Phase 6.

### Phase 6 — Channel migration *(~2 weeks, staged)*

Bridge stays the front layer (auth, credit gate, tier gating, superadmin bypass, channel webhooks — per [Target Topology](#target-topology--migration-strategy)). Migrate per channel behind a per-tenant feature flag: **Telegram first** (richest existing flow, easiest rollback), then Slack, WhatsApp, Office Assistant (Enterprise gating stays in bridge). `telegram-agent.js` stays deployed as instant rollback until Phase 8 passes. Console/Assistant/Workflow-builder remain on vanilla zeroclaw:3010, untouched.

**Exit gate per channel:** N real tenants (start: internal/test accounts) run on Aivory Cerveau for a week with error rates ≤ the `telegram-agent.js` baseline and zero cross-tenant incidents.

### Phase 7 — Voice *(parallel track; Tier 1 ~1 week after Phase 2)*

| Task | Detail |
|---|---|
| 7.1 Tier 2 scoping (anytime) | Read `zeroclaw-gateway/src/voice_duplex.rs` — determines whether Tier 2 is wiring or a real project (currently an Open Question) |
| 7.2 Tier 1 | Voice note → Groq Whisper STT (already configured) → agent loop → TTS reply (evaluate ElevenLabs vs. Deepgram); voice choice = a per-tenant identity field from Phase 2.1 |
| 7.3 Tier 2 | Scope only after 7.1; explicitly **not** assumed to need OpenAI Realtime/WebRTC (see Non-Goals) |

**Exit gate (Tier 1):** a Telegram voice note gets a spoken reply in the tenant's chosen voice, E2E.

### Phase 8 — Scale validation + cutover *(gate for decommissioning the old system)*

Full load test at the 10,000-concurrent target (including rate limiting under contention and memory-lifecycle behavior at fleet scale). Only after it passes: set a cutover date, flip remaining tenants, keep `telegram-agent.js` dormant for one more cycle, then decommission.

**Exit gate:** 10k-concurrent load test passes all budgets; one full billing cycle on Aivory Cerveau with no rollback events.

### Standing items (not phase-bound)

- **Housekeeping (anytime):** archive/rename the unused `avry-zeroclaw` Python submodule before the fork exists to prevent name collisions.
- **Observability (grows with each phase):** per-tenant metrics (requests, tool calls, memory size, cost), structured tracing of tool-call chains, disk/RSS dashboards — each phase's exit gate assumes its metrics are actually visible.
- **Fork maintenance (recurring, per Phase 0.3's decision):** scheduled upstream-sync cadence; security patches from upstream zeroclaw applied within days, not months.
