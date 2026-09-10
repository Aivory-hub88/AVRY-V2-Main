# ADR-012 — Aivory-Hosted Shared Multi-Tenant Odoo MCP Server

**Date:** 2026-09-09
**Status:** Draft — under discussion, not approved for execution
**Related:** [`CERVEAU-ODOO-INTEGRATION-PLAN.md`](CERVEAU-ODOO-INTEGRATION-PLAN.md) (the self-hosted "bring your own MCP server" approach this ADR extends, not replaces — see Phase 0), [`ODOO-MCP-SETUP-GUIDE.md`](ODOO-MCP-SETUP-GUIDE.md) (the tenant-facing guide for the self-hosted path), [`ADR-006-CERVEAU-CLIENT-DEPLOYMENT-API.md`](ADR-006-CERVEAU-CLIENT-DEPLOYMENT-API.md) (custom MCP server registration + SSRF-guarded verification, reused here), [`ADR-002-CERVEAU-TENANT-DESIGN.md`](ADR-002-CERVEAU-TENANT-DESIGN.md) (tenant isolation model this ADR extends from memory/tasks into tool-credential resolution)

---

## Context

`CERVEAU-ODOO-INTEGRATION-PLAN.md` deliberately chose self-hosted-by-tenant as the whole scope, explicitly deferring "Aivory hosting a shared, multi-tenant Odoo MCP server itself" as bigger, different-shaped work — not assumed to be needed unless self-hosted friction proves to be a real blocker.

This ADR is that deferred work, opened for design because the UX gap is real: Odoo is currently the only integration in Cerveau that requires the tenant to run infrastructure (a Docker container + reverse proxy) themselves, in contrast to the one-click OAuth connect flow every other integration has (Composio-hosted toolkits, and the native Slack deploy bot). A shared, Aivory-hosted Odoo MCP server would let Odoo connect via the same "Connect" button pattern as everything else.

Two questions were worked through before this ADR:

1. **Is a shared multi-tenant process resource-heavy?** No — measured data on `erpipe-org/mcp-odoo` shows ~53.5 MB idle RAM, ~0.2% CPU per instance, and the server is natively multi-instance (one process, an `instances` config map, tools take an `instance` param). A shared deployment consolidates resource use versus today's N-tenants-×-N-containers model; it does not multiply it.
2. **Is per-tenant isolation in a shared process doable and safe?** Yes, and not from a standing start — Cerveau already has an adversarially-CI-tested tenant isolation pattern for memory/tasks (ADR-002 §D1, "P-isolation" Phase 2.4: tenant A stores, tenant B recalls, must always return empty), and Composio's own architecture already proves "one shared multi-tenant process holding every tenant's credentials, isolated by a tenant/entity parameter" works in Aivory production today (Gmail, Slack toolkit, Calendar, Trello, Linear, ERPNext all run this way). What's missing is the credential-resolution analogue of P-isolation, which ADR-002 itself flags as a "(later)" item never built. This ADR is that "later."

## Decision

Build a shared, Aivory-hosted, multi-instance Odoo MCP server, reusing `erpipe-org/mcp-odoo` as-is rather than writing a new server, and extend Cerveau's existing tenant-isolation and custom-MCP-registration machinery to cover it rather than inventing new isolation primitives. The self-hosted path (`ODOO-MCP-SETUP-GUIDE.md`) is not deleted by this decision — see Phase 0 for the open question on whether it stays as a parallel option (e.g. for tenants wanting physical isolation) or is fully superseded.

## Non-goals

- Rewriting or forking `erpipe-org/mcp-odoo`'s core Odoo-calling logic.
- A new encryption/KMS mechanism — this reuses whatever already encrypts `tenant_custom_mcp_servers.py` auth-header values.
- Loosening the mandatory Irreversible-tier approval gate on writes. That invariant carries over unchanged from the self-hosted design.
- OAuth for Odoo — Odoo has no equivalent to offer; the Connect flow in Phase 6 is API-key-based, not OAuth.

---

## Phase 0 — Blocking decisions

Must be answered before any implementation work starts:

1. **Business model**: does the shared server fully replace the self-hosted path, or stand alongside it as a second option (e.g. self-hosted retained for enterprise tenants who want full physical isolation rather than logical isolation in a shared process)? Determines whether `ODOO-MCP-SETUP-GUIDE.md` is retired or kept as an alternative.
2. **Plan tier**: does shared Odoo access stay at the current self-hosted tier (Pro+), or move up (Enterprise) given Aivory now custodies live credentials and carries the operational/security burden instead of the tenant?
3. **API key scope validation at onboarding**: is there any automated or manual check that a tenant-submitted Odoo API key is actually least-privilege (not an admin account), or is the tenant's claim trusted as-is, same as today?

**Exit gate:** all three answered in writing; downstream phases reference the answers.

---

## Phase 1 — Schema & credential store

**Goal:** a safe place to hold tenant → Odoo instance mappings, reusing existing encryption.

- Migration: `cerveau.odoo_tenant_instances` (tenant_id, odoo_url, odoo_db, encrypted_api_key, allowed_models/scope, status, created_at, last_verified_at).
- Reuse the encryption mechanism already protecting `tenant_custom_mcp_servers.py`'s auth-header-value column — no new KMS.
- Disconnect/revoke flow: an endpoint that nulls/removes the row and invalidates any cache held by the shared server process.

**Exit gate:** row insert/read/revoke works via an internal API; credential is proven encrypted at rest (direct Postgres read shows ciphertext, not plaintext).

---

## Phase 2 — Tenant-scoped instance resolution (the critical phase)

**Goal:** the `instance` parameter sent to `erpipe-org/mcp-odoo` can never resolve to another tenant's Odoo.

- Server-side resolver: authenticated `principal_id`/tenant context (header-derived, never message-content-derived — mirrors the Composio-entity rule already in force) → lookup in `odoo_tenant_instances` → inject `instance`. The LLM/tool-call layer never sets `instance` itself.
- **Extend the P-isolation test suite (ADR-002 Phase 2.4) to this domain**: tenant A attempts to resolve/read/call into tenant B's instance via every trick already exercised for memory (wildcard queries, guessed session ids, race conditions during credential rotation) — must always fail. Runs in CI with the same rigor as the existing memory-isolation suite.

**Exit gate:** the new adversarial test suite is green in CI, held to the same bar as the existing P-isolation Phase 2.4 suite.

---

## Phase 3 — Deploy the shared server & network hardening

**Goal:** `erpipe-org/mcp-odoo` in multi-instance mode running on Aivory infrastructure, safely reachable by many tenants' Odoo instances.

- Containerize; deploy as one new process. This is a deliberate, acknowledged exception to the "zero new VPS process" discipline the self-hosted plan was built to avoid — call it out explicitly in the eventual implementation writeup, don't let it pass silently.
- SSRF guard at **two points**: at registration (reuse the SSRF-guarded verification handshake from ADR-006) and at **runtime, on every call** (defends against a tenant re-pointing DNS to an internal address after passing initial verification — a TOCTOU SSRF). Block private IP ranges, link-local, and the cloud metadata endpoint (`169.254.169.254`) by default.
- `call_model_method` escape hatch: disabled by default **in config**, not togglable by a tenant without a higher approval tier — enforced, not just documented.

**Exit gate:** container running; SSRF test at both registration and runtime confirms a redirect/registration attempt toward an internal IP is rejected at both points.

---

## Phase 4 — Availability isolation (not just data isolation)

**Goal:** one tenant's misbehaving agent or Odoo instance cannot degrade service for other tenants sharing the process.

- Per-tenant rate limiting (requests/minute, concurrent calls).
- Per-tenant timeout + circuit breaker — a slow or down Odoo instance for tenant A must not hang the worker path used by tenant B.

**Exit gate:** load test simulating one "noisy" tenant (call spam, or an artificially slow instance) shows unaffected latency for other tenants.

---

## Phase 5 — Audit trail & observability

**Goal:** per-tenant visibility, early anomaly detection.

- Pipe `erpipe-org/mcp-odoo`'s built-in JSONL audit trail to durable, per-tenant-queryable storage — not a local file inside the container.
- Per-tenant metrics (latency, error rate, write-attempt count) with alerting on spikes — a sudden jump in write attempts from one tenant is a plausible signal of prompt injection or of that tenant's own Odoo account being compromised.

**Exit gate:** an internal dashboard/alert can answer "which tenant had the most rejects/errors this week" without manual grep.

---

## Phase 6 — UX: replace manual-URL registration with a Connect flow

**Goal:** deliver the actual motivating outcome — a "Connect" button experience comparable to Slack/Gmail, instead of "run a Docker container and paste a URL."

- New modal: Odoo URL + API key (API-key-based, not OAuth — Odoo offers no equivalent) → verify handshake → insert into `odoo_tenant_instances` → Verified status.
- The mandatory Irreversible-tier approval gate on writes is unchanged — explicitly preserved, not incidentally relaxed because the connect flow got smoother.

**Exit gate:** a pilot tenant can connect Odoo entirely from the dashboard with no Docker/VPS involvement, and the write-approval flow is verified identical to the self-hosted path.

---

## Phase 7 — Validation & canary

- Two synthetic tenants (mirroring the ADR-002 exit-gate pattern) to re-run the full Phase 2 + Phase 4 isolation suite end-to-end.
- Canary rollout to 1–2 real pilot tenants before general availability.

**Exit gate:** canary runs for a defined window with zero isolation/leak incidents before GA proceeds.

---

## Phase 8 — GA & disposition of the self-hosted path

- Resolve per the Phase 0 §1 answer: retire `ODOO-MCP-SETUP-GUIDE.md` as the primary path (demoting it to an enterprise/physical-isolation alternative) or keep both paths live in parallel.

---

## Success criteria

A tenant can connect their Odoo instance to a Cerveau agent through a one-click Connect flow in the dashboard, with no self-hosted infrastructure required, while credential isolation between tenants is proven to the same adversarial standard as Cerveau's existing memory/task isolation, and every Odoo write still lands as an Irreversible-tier, approval-gated pending action — no invariant from the self-hosted design is weakened to achieve the smoother UX.
