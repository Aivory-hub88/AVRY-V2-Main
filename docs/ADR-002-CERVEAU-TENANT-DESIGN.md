# ADR-002 — Aivory Cerveau Phase 2: Multi-Tenant Identity & Isolation Design

**Date:** 2026-07-17
**Status:** Accepted (design); implementation in progress
**Context:** Phase 2 of [DEPLOYABLE_AGENT_RUNTIME_PLANNING.md](DEPLOYABLE_AGENT_RUNTIME_PLANNING.md). Based on a seam read of the fork at v0.8.3 (`AVRY-Cerveau@5cb062b80`, local clone `~/Documents/AVRY-Cerveau`).

---

## 1. The seam map (what v0.8.3 already provides)

The request path the bridge will use, end to end:

```
POST /webhook  →  handle_webhook            (zeroclaw-gateway/src/lib.rs:2724)
               →  run_gateway_chat_with_tools (lib.rs:2563)
               →  zeroclaw_runtime::agent::process_message(config, agent_alias,
                     message, session_id, TurnOrigin)   (agent/loop_.rs:2888)
```

Already present at each hop — we extend, not invent:

| Capability | Where | State at v0.8.3 |
|---|---|---|
| Per-request agent dispatch | `?agent=` query on `/webhook` (`WebhookQuery`) | exists |
| Per-conversation scoping | `X-Session-Id` header → `session_id` threaded into memory store/recall | exists |
| Request idempotency | `X-Idempotency-Key` header + in-memory store | exists |
| Auth layers | Bearer pairing token + optional `X-Webhook-Secret` (constant-time compare) | exists |
| **Two-dimensional memory scoping** | `Memory` trait (`zeroclaw-api/src/memory_traits.rs`): composite `(key, agent_id)` rows, `store_with_agent`, `recall_for_agents(allowed_agent_ids)`, plus orthogonal `session_id` | exists — **the agent dimension is default-jailed** (cross-agent reads only via `read_memory_from` allowlist, resolved in `loop_.rs:1312`) |
| Untrusted-content framing | `zeroclaw-api/src/ingress.rs`: `IngressContext`, `TrustClass`, `UntrustedFraming`, `TurnOrigin` (the 0.8.2 "universal ingress policy layer") | exists |
| Principal attribution | `zeroclaw-api/src/principal.rs`: `PrincipalId`, `Principal`, `AuthMethod`, `AuthOutcome`; `TaskRecord.principal_id` (unstamped) | exists, unwired |
| Durable tasks | `control_plane` (v0.8.2+): atomic pause/resume, continuation contexts, reaper | exists (per ADR-001 §0.2) |

Correction recorded: `prompt_injection_mode` is `SkillsPromptInjectionMode` (skills-related), **not** a security control — the security framing lives in `ingress.rs`.

## 2. Design decisions

### D1 — Tenant = the memory agent-dimension, NOT a config alias

A tenant (an Aivory `user_id × agent_type` pair) maps to a **synthetic memory agent id** `t_<user_id>_<agent_type>` used via `store_with_agent` / `recall_for_agents(&[that id])`. This rides the existing composite index and inherits the default-jailed cross-agent semantics: isolation is enforced by the same code paths upstream already enforces between config agents. No `[agents.<alias>]` entry, no workspace dir, no reload — the 10k-scale wall from ADR-001 §0.1 never comes into play. The config-alias system stays untouched for the six existing brains.

### D2 — Identity source of truth = `product.agent_profiles` (reuse, no dual-write)

The bridge already reads persona (name/business/tone/languages/knowledge/instructions) from `product.agent_profiles` in avry-postgres. Cerveau reads **the same table** through a new small read-only resolver (bounded LRU, TTL ~5 min — same cadence as the bridge's cache). New per-tenant fields (voice, tool scope) are added to that table by migration when their phases land. No second identity store, no sync problem.

### D3 — Wire protocol: authenticated tenant headers on `/webhook`

The bridge (which stays the front layer per the plan) adds:

- `X-Tenant-Id: <user_id>` + `X-Agent-Type: <agent_type>` — tenant selector
- `X-Session-Id: <binding_id>` — existing header, same value the bridge already keys history by
- `X-Webhook-Secret` — **mandatory whenever tenant headers are present** (config gains `require_secret_for_tenant = true`); a tenant-scoped request without valid secret is rejected before any resolution

Tenant id enters `Principal`/`principal_id` on task records (D4) — never derived from message content, mirroring the Composio-entity rule from the tenant-isolation requirement.

### D4 — Threading: a `TenantContext` overlay through `process_message`

New optional parameter (struct, not more positional args):

```rust
pub struct TenantContext {
    pub tenant_id: String,          // "t_<user_id>_<agent_type>" — memory agent id + principal id
    pub persona: String,            // pre-rendered inert operator_config block
    pub session_id: String,         // conversation scope (binding id)
}
```

Effects inside the turn when present: (a) memory store/recall use the tenant id as the agent dimension with an allowlist of exactly one; (b) the persona block is appended to the system prompt **through the ingress `UntrustedFraming` machinery** as fenced inert data — reproducing `telegram-agent.js`'s `<operator_config>` + SECURITY_RULES semantics with upstream's own framing primitives (Phase 2.3 becomes mostly reuse); (c) `principal_id` is stamped on any task the turn creates.

### D5 — Postgres layout

zeroclaw's own Postgres memory backend gets pointed at `avry-postgres` with its tables in a dedicated **`cerveau` schema** (search_path-scoped DSN) — platform-consistent (per the plan's single-DB stance), invisible to the `public`/`product`/`billing`/`identity` schemas, and droppable in dev without touching anything else. Memory rows carry the tenant via the agent-dimension column that upstream's schema already has; no schema fork of upstream's tables.

## 3. Patch series impact (CERVEAU_PATCHES.md)

- **P-identity** (Phase 2.2) = D3 + D4 + the Postgres persona resolver. Gateway + runtime crates; focused.
- **P-isolation** (Phase 2.4) = adversarial tests: tenant A stores → tenant B recalls (same query, same session tricks, wildcard queries) must return empty; task listing and (later) tool-credential resolution likewise. Runs in `cerveau-build` CI against a throwaway Postgres service container.
- **F-1 / F-2** (Phase 2.5) unchanged from ADR-001.

## 4. Exit-gate mapping (unchanged from the plan)

Two synthetic tenants created **at runtime via data rows only** (INSERT into `product.agent_profiles` — no config change, no reload, which is stronger than the original "via API + reload" formulation), provably isolated memories/tasks (CI suite green); a multi-hour task survives restart + hold/resume without re-executing completed side effects (F-1/F-2 validation).
