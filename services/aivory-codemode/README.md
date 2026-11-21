# aivory-codemode

Code Mode for Aivory agents (the idea from Cloudflare's "Code Mode", built for our Node/VPS stack).

Instead of calling many tools one at a time, an agent calls **`execute`** with one short JavaScript
program that reads several tools, filters/aggregates, and returns one answer. **`search`** finds
tools by keyword if the signatures in `execute`'s description are not enough.

- **Sandbox:** QuickJS (WASM). No fetch/require/process/fs/timers; memory, stack, time and tool-call limits.
- **Read-only:** only tools on `READ_ALLOW` (`upstream.mjs`) are visible. Writes (create/update/close/reply)
  are never exposed here and stay normal Cerveau tools behind approval.
- **Tenant isolation:** `tenant_id` is bound once from the connection URL (same contract as `aivory-native-bridge`)
  and forwarded to the bridge on every upstream connection. A tenant id in model-written code has no effect.
- **Auth:** `x-bridge-key` header (same shared key as the bridge). Listens on 127.0.0.1:4101.

**Odoo:** for each (tenant, agent) the proxy asks the backend internal API
(`AVRY_BACKEND_INTERNAL_URL` + `AVRY_BACKEND_INTERNAL_TOKEN`, same route Cerveau uses) for the tenant's `odoo`
server. Only a URL on the exact shared Od-MCP host (`OD_MCP_BASE_URL`, default `https://odoo-mcp.aivory.uk`) is
accepted, only the read tools in `tenant_odoo.mjs` are exposed (minus the tenant's `disabled_tools`), and the
per-tenant token in the URL is never logged or shown to the model. Without backend env the Odoo part is off.

**Operations:** Cerveau pools MCP connections for up to `CERVEAU_MCP_POOL_IDLE_SECS` (3600), so after restarting
this service also restart `zeroclaw-cerveau` (otherwise agents keep a dead session and silently fall back to
their plain tools until the pool expires).

Cerveau config: an `[[mcp.servers]]` entry with `url = http://127.0.0.1:4101/mcp/codemode`,
`tenant_entity_query_param = "tenant_id"` and the `x-bridge-key` header, plus a bundle for the agents that should use it.

Run: `BRIDGE_KEY=... node server.mjs` · Test: `npm test`
