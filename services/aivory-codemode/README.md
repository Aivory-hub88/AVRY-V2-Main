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

Cerveau config: an `[[mcp.servers]]` entry with `url = http://127.0.0.1:4101/mcp/codemode`,
`tenant_entity_query_param = "tenant_id"` and the `x-bridge-key` header, plus a bundle for the agents that should use it.

Run: `BRIDGE_KEY=... node server.mjs` · Test: `npm test`
