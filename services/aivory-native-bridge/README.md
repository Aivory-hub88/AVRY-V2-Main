# aivory-native-bridge

The zero-signup toolkit backend for Cerveau's agent types. One HTTP MCP route
per agent type (`/mcp/<agent>`), each tool forwarding to that agent's single
n8n webhook, which branches internally on the `action` field.

**This directory was untracked until 2026-08-30.** It ran only from
`/home/ubuntu/aivory-native-bridge` on `tencent-vps`, so every tool added to
it existed in exactly one place with no history. This copy is the record; the
VPS is still where it executes.

## Deployment

There is no build step. Deploying is copying the changed `.mjs` files to
`/home/ubuntu/aivory-native-bridge/` and restarting:

```
sudo systemctl restart aivory-native-bridge
```

It listens on `127.0.0.1:4100` and is referenced from Cerveau's `config.toml`
as `http://127.0.0.1:4100/mcp/<agent>` with `tenant_entity_query_param`.

## Shape

- `server.mjs` — MCP session handling, `x-bridge-key` auth, tenant-id
  validation, the n8n webhook call, and the optional per-tool `postProcess`
  hook (used by `pipeline_summary` for currency conversion).
- `agents/<agent>.mjs` — one module per agent type: `agentType`, `mcpPath`,
  `webhookEnvVar`, and a `tools` array of `{name, description, inputSchema,
  action}` (plus optional `postProcess`).

`tenant_id` is bound at session-init time from the connection URL and injected
by the server; no tool's `inputSchema` declares it, so a calling model has
nothing to override.

## Secrets

Copy `.env.example` to `.env` on the VPS and fill it. The real `.env` is mode
0600 and is never committed. Note `N8N_SHARED_SECRET` is duplicated as a
literal inside each n8n workflow's "Check Bridge Secret" node — rotating it
means changing both.
