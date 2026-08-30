# Cerveau config — redacted snapshot

`config.redacted.toml` is a **record, not a deployable file.** The live config
is `/home/ubuntu/.zeroclaw-cerveau/config.toml` on `tencent-vps` (and a second,
drifted copy at `.zeroclaw-cerveau-b` for the ADR-005 two-instance fleet).

Until 2026-08-30 that file existed in exactly one place with no history, which
meant every MCP server, agent-type bundle and tool risk tier — the whole map of
what each agent can do — was untracked. This snapshot fixes that. Regenerate it
with `redact.py <live-config> <output>` after any change worth recording.

## What is redacted, and what deliberately is not

Redacted: Composio API keys, the bridge key, webhook and shared secrets, the
Postgres URL's password, and `paired_tokens` (encrypted channel-binding blobs —
encrypted at rest, but still credential material).

**Kept:** Composio MCP server UUIDs, which appear in the server URLs. They are
structure, not secrets, and dropping them would make the snapshot useless for
answering "which server is `composio-gmail-mail` actually pointed at?".

`redact.py` refuses to write if any unbroken 32+ character alphanumeric run
survives — the shape of every API key and hex secret in this file — so a new
secret-bearing key that is not yet in its `SECRET_KEYS` list fails loudly
rather than leaking.

## Reading it

- `[[mcp.servers]]` — one per toolkit, with `requires_composio_toolkit`
  gating it behind that tenant's connection.
- `[mcp_bundles.*]` and `[agent_type_mcp_bundles.*]` — which agent type
  carries which servers.
- `[tool_risk_tiers]` — `reversible` / `irreversible`. **A tool listed in
  neither is hard-denied by default** (patch 0013), so this section is
  load-bearing, not documentation.
- `[risk_profiles.*].auto_approve` — which tools skip the approval gate.

## `cerveau-lifecycle.sh`

A copy of `/usr/local/bin/cerveau-lifecycle.sh`, the daily tenant-memory
lifecycle driver (`cerveau-lifecycle.timer`, 03:30 with 15-minute jitter). Same
status as the config snapshot: a record, not a deployable file — the VPS copy is
what runs, and it holds no secrets (the Postgres password is read from
`docker inspect` at run time).

Tracked here because its category list is a policy decision, not an
implementation detail: it is the only place that says an ingested `document` is
never age-pruned and is capped at 5 000 rows per tenant. That category has no
counterpart in `PgLifecycleConfig` yet, so this file and `postgres.rs::run_lifecycle`
have deliberately diverged — see the note in the script.
