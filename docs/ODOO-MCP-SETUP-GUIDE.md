# Connecting Your Odoo ERP to an Aivory Agent

This guide walks you through giving an Aivory Cerveau agent real access to your Odoo instance — reading and writing sales orders, invoices, customers, and inventory. Every write the agent makes still requires your approval first (see [Approvals](#how-writes-are-approved) below); nothing happens to your real data without you saying yes.

**Who this is for:** Pro plan and above, self-hosted or Odoo.sh customers who can run one small server themselves (or ask whoever manages your infrastructure to). If that's not you, ask your IT/ops contact to follow this guide, or hold off — there's no other way to connect Odoo today (see the [why](#why-this-looks-different-from-other-integrations) below if you're curious).

## What you'll need

- An Odoo 16+ instance (self-hosted or Odoo.sh) with an account that can generate an API key.
- Somewhere to run one lightweight Docker container — a $5/month VPS is genuinely enough (see [resource footprint](#how-much-does-this-cost-to-run)).
- 15–20 minutes.

## Step 1 — Generate an Odoo API key

1. Log into Odoo as the user whose access level the agent should have — **create a dedicated user for this if you can**, scoped to only the modules (Sales, Invoicing, Inventory, etc.) the agent actually needs, rather than reusing an admin account.
2. Go to your user's **Preferences → Account Security → API Keys → New API Key**.
3. Give it a description like "Aivory agent" and copy the key immediately — Odoo only shows it once.

## Step 2 — Run the MCP server

We recommend [`erpipe-org/mcp-odoo`](https://github.com/erpipe-org/mcp-odoo) (MIT license, actively maintained) — it supports multiple Odoo databases from one server if you ever need that, and has its own preview-before-write safety layer on top of Aivory's own approval gate.

```bash
docker run -d --name odoo-mcp \
  -e ODOO_URL=https://your-odoo-instance.example.com \
  -e ODOO_DB=your_database_name \
  -e ODOO_API_KEY=paste_your_api_key_here \
  -e MCP_ALLOW_REMOTE_HTTP=1 \
  -p 8000:8000 \
  --restart unless-stopped \
  ghcr.io/erpipe-org/mcp-odoo:latest --transport streamable-http --host 0.0.0.0 --port 8000
```

Only have one Odoo database and want fewer moving parts? [`ivnvxd/mcp-server-odoo`](https://github.com/ivnvxd/mcp-server-odoo) (MPL-2.0) is a lighter alternative with the same idea — its own README covers setup.

**About `MCP_ALLOW_REMOTE_HTTP=1`**: the server refuses to bind beyond localhost without this flag, on purpose — its own error message says why: *"HTTP transports bind local hosts only by default. Use --allow-remote-http or MCP_ALLOW_REMOTE_HTTP=1 only behind external authentication, TLS, and network policy."* Take that seriously — see Step 3.

## Step 3 — Put a real address (and ideally auth) in front of it

The server has no built-in caller authentication of its own on the HTTP transport — anyone who can reach the port can talk to it. Aivory's dashboard form has an optional "auth header" field specifically for this: put a shared secret there and require it via whatever reverse proxy sits in front of the container (nginx, Caddy, Cloudflare Tunnel, your cloud provider's load balancer — anything that can check a header before forwarding).

At minimum:
- Terminate real TLS (HTTPS) in front of it — don't hand Odoo credentials-adjacent traffic over plain HTTP across the internet.
- Require a header (e.g. `X-Api-Key: <a secret you make up>`) at the proxy layer, matching what you'll enter in Aivory's "Auth header value" field.

The exact reverse-proxy setup depends on your infrastructure — if you're not sure how to do this, this is the point to loop in whoever manages your servers.

## Step 4 — Register it in Aivory

1. Open the agent you want connected to Odoo → **Customise Agent → MCP** tab.
2. Fill in:
   - **Name**: something like `odoo` (letters, numbers, `-`/`_` only).
   - **MCP server URL**: `https://your-domain.example.com/mcp` (through your reverse proxy from Step 3, not the bare container port).
   - **Transport**: `streamable-http`.
   - **Auth header name**: whatever header your proxy checks, e.g. `X-Api-Key`.
   - **Auth header value**: the secret from Step 3. Encrypted at rest — Aivory never shows it again after you save.
3. Click **Register & verify server**. A green **Verified · N tools** badge means it worked; **Verification failed** with an error message means something in Steps 1–3 needs a fix.

This is registered per agent — if you want more than one agent type talking to Odoo, repeat this for each one.

## How writes are approved

Every tool call through a custom MCP server (Odoo included) is automatically treated as **irreversible** by Aivory — there is no "auto-approve" setting for this, by design. When the agent wants to create, update, or delete anything in Odoo, it stops and asks first; you approve or deny it from the **Approvals** page in your dashboard sidebar (or wherever your team has that page bookmarked). Reads (looking things up) don't need approval. Nothing you haven't explicitly said yes to touches your real Odoo data.

## How much does this cost to run

Measured directly, not estimated: `erpipe-org/mcp-odoo` idles at **~53 MB of RAM** and effectively 0% CPU; a real request barely moves that. It comfortably runs on the cheapest VPS tier any provider offers — you don't need to provision anything special for this.

## Why this looks different from other integrations

Aivory's Gmail, Google Calendar, Trello, Linear, and ERPNext connections are all one-click — you authorize once through a popup and Aivory handles the rest. Odoo can't work that way today: the platform Aivory uses for those one-click connections (Composio) only offers a document-parsing product for Odoo, not general read/write access to your business records. Real open-source servers exist that do offer that, so this guide uses one directly — the tradeoff is that you (or your infrastructure team) run it, rather than Aivory hosting it for you. If this friction turns out to be a real blocker for enough people, a fully-hosted option is worth revisiting later — it isn't available yet.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "Verification failed" — connection refused / timeout | The MCP server URL isn't reachable from the internet, or your reverse proxy isn't forwarding correctly. |
| "Verification failed" — 401/403 | Auth header name/value in Aivory doesn't match what your reverse proxy expects. |
| Server logs show an Odoo auth error | Check `ODOO_API_KEY`/`ODOO_DB`/`ODOO_URL` are correct and the API key hasn't expired or been revoked. |
| Agent says it has no Odoo tools | Re-open the MCP tab and confirm the server still shows **Verified** — a since-broken connection needs **Reverify**, not a new registration. |
