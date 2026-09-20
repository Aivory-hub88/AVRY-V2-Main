# Aivory Chat for Odoo (`aivory_cerveau_odoo`)

Aivory agents (Geno, Teo, Lex, Finn, Ofira, Aira) as mentionable bots in Odoo
Discuss. Target: **Odoo 19** (19.0.2.x). The earlier systray chat widget was
removed in 19.0.2.1.0 -- Discuss is the only surface.

## Use

1. Aivory dashboard: Agents -> the agent -> Customize -> Deploy -> **Create API
   Key** (Business plan or above). One key per agent.
2. Odoo -> **Settings -> Aivory Agents** -> New: pick the agent, paste its key.
3. In Discuss, type `@Lex ...` in any channel, or open a direct chat with it.

Each configured agent gets a bot with the dashboard's name and avatar, shown
with OdooBot's green-heart "bot" status (`models/res_partner.py`) instead of offline. Each keeps
its own conversation per channel. Group channels stay quiet unless an agent is
mentioned; agents never trigger each other. Replies are posted from a background
thread after the sender's message commits (a tool-using turn can take ~3 min).

## Layout

```
addons/aivory_cerveau_odoo/
  models/aivory_agent.py      -- aivory.agent: persona + API key, provisions the Discuss bot
  models/discuss_channel.py   -- mention/DM dispatch, async delivery
  models/aivory_api.py        -- POST /api/v1/agent-api/message client
  views/aivory_agent_views.xml, views/res_config_settings_views.xml
  security/ir.model.access.csv -- Settings admins only
  static/img/agents/*.svg     -- avatars (copied from avry-user-dashboard/public/agents)
  migrations/                 -- 2.0.0 retires the old generic bot, 2.1.0 drops the widget key
```

## Why it talks to avry-backend, not Cerveau

The addon calls `POST /api/v1/agent-api/message` on `backend.aivory.id` with a
per-agent `X-Aivory-Api-Key` (`app/routes/agent_api_keys.py`, ADR-006 Part A). The
key is bound server-side to one `(user_id, agent_type)` pair, so the key alone
carries the tenant identity and which agent it reaches. Cerveau's shared
`X-Webhook-Secret` is **never** given to a tenant-controlled server: it is not a
per-tenant credential, and holding it would let that tenant address any other
tenant's agent (ADR-006).

`aivory_cerveau.api_base_url` (system parameter, optional) overrides the backend
URL for staging or tests.

## Keeping the roster in sync

`ROSTER` in `models/aivory_agent.py` mirrors `GET /api/v1/agent-roster`
(`backend/avry-backend/app/routes/agent_roster.py`); avatars mirror
`frontend/avry-user-dashboard/public/agents/`. Update both when the roster changes.

## Not covered

The agent does not learn which Odoo user is asking, and sees only its own
conversation, not the whole channel. Letting an agent read/write Odoo data is a
separate concern (Od-MCP, `docs/ODOO-MCP-SETUP-GUIDE.md`). No streaming.

## Verifying locally

Throwaway Odoo 19 + Postgres 15 with the addon mounted at `/mnt/extra-addons`, then
`odoo -d <db> -i aivory_cerveau_odoo`. Point `aivory_cerveau.api_base_url` at a tiny
HTTP stub that answers `{"reply": "..."}` to check mention/DM routing without a real
key. Check `lsof -nP -iTCP:8069 -sTCP:LISTEN` first: a stray SSH tunnel can shadow
Docker's port and look like a wrong master password.
