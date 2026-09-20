# Aivory Cerveau Odoo Widget (scaffold)

> **19.0.2.0.0:** the main surface is now Discuss, not the widget. Add agents under
> Settings → Aivory Agents (one Aivory API key per agent); each gets a bot with its
> dashboard name/avatar and answers to `@Name` or a direct chat. See
> `ops/odoo-demo/README.md`. The systray widget below still works with its own key.

Native OWL systray chat widget for Cerveau, embedded in Odoo's own web client.
See `docs/CERVEAU-ODOO-UI-WIDGET-PLAN.md` in the monorepo root for the full
architecture, decisions, and open questions this scaffold does not yet
resolve.

Target version for this scaffold: **Odoo 18**.

## Layout

```
addons/aivory_cerveau_odoo/
  __manifest__.py
  controllers/main.py          -- /aivory_cerveau/chat -> avry-backend /api/v1/agent-api/message
  models/res_config_settings.py -- single Aivory API Key setting
  views/res_config_settings_views.xml
  static/src/js/systray_icon.js -- OWL systray component
  static/src/xml/systray_icon.xml
```

## Architecture note: talks to avry-backend, not Cerveau directly

Earlier drafts of this scaffold called Cerveau's own `POST /webhook` with a
per-install copy of Cerveau's shared `X-Webhook-Secret`. That is explicitly
unsafe per `docs/ADR-006-CERVEAU-CLIENT-DEPLOYMENT-API.md`: the secret is
**not** a per-tenant credential, and `X-Tenant-Id` is trusted *only because*
the secret gate already ran -- handing it to a tenant-controlled server
would let that tenant set `X-Tenant-Id` to a different tenant's `user_id`
and read/write a stranger's agent.

Instead this addon calls `POST /api/v1/agent-api/message` on
`backend.aivory.id` with a per-tenant `X-Aivory-Api-Key`
(`app/routes/agent_api_keys.py`, `docs/ADR-006` Part A) -- a key created
from the Aivory dashboard, bound server-side to one `(user_id, agent_type)`
pair at creation. No tenant ID, no agent picker, no shared secret: the key
alone carries the tenant's identity and which agent it talks to. Needs the
Business plan or above on the Aivory account creating the key.

## What's real vs. placeholder

- Real: systray icon registration, panel open/close, full message
  round trip through the Odoo controller to the real production
  `backend.aivory.id` (verified against an invalid key: got the real 401
  back, not a local mock).
- Not yet exercised: a *valid* key's full reply (only the invalid-key error
  path has been verified end to end so far -- see Manual verification
  below), streaming (`/ws/chat`, not planned), multi-company support.

## Manual verification (local Odoo 18 instance)

**Last run 2026-09-14 -- passed, including a real call to production.**
Installed cleanly, systray icon rendered, panel opened, a typed message
round-tripped through `/aivory_cerveau/chat` all the way to the real
`https://backend.aivory.id/api/v1/agent-api/message` with a deliberately
invalid key -- got back the real `401` and the controller's translated
"Aivory API Key is invalid or has been revoked" message, rendered correctly
in the panel. This is the first pass of this addon to actually reach
production infrastructure, not just a local config-check error.

Earlier passes (now superseded by the `agent_api_keys.py` pivot) found and
fixed two real Odoo 18 bugs, still relevant to anyone extending this addon:
the settings-view xpath didn't match Odoo 18's `app`/`block`/`setting`
structure, and `useService("rpc")` no longer exists in Odoo 18 (use the
`rpc` function imported from `@web/core/network/rpc` instead).

Steps, if you need to redo this:

1. **Check nothing else is already listening on 8069** (`lsof -nP -iTCP:8069
   -sTCP:LISTEN`) -- an SSH tunnel or another process can silently shadow
   Docker's port binding on macOS, which looks exactly like a wrong master
   password / phantom pre-existing database. Pick a free host port (e.g.
   8169) if anything is already there.

2. Run a throwaway Odoo 18 + Postgres stack, e.g. (substituting your chosen
   port for `8169`):

   ```bash
   docker run -d --name aivory-odoo-pg -e POSTGRES_USER=odoo -e POSTGRES_PASSWORD=odoo -e POSTGRES_DB=postgres postgres:15
   docker run -d --name aivory-odoo -p 8169:8069 \
     --link aivory-odoo-pg:db -e HOST=db -e USER=odoo -e PASSWORD=odoo \
     -v "$(pwd)/addons:/mnt/extra-addons" \
     odoo:18
   ```

3. Create a database (`http://localhost:8169/web/database/manager`, or POST
   to `/web/database/create` with `master_pwd=admin` -- that's the image's
   real default, the UI's "Access Denied" on a first attempt is usually the
   port-conflict issue above, not a wrong password).
4. Log in as the admin user you just created. Activate developer mode
   (`?debug=1`), go to Apps, remove the default "Apps" filter, search
   "Aivory Chat" (or "Aivory"), Activate.
5. Settings > General Settings > Aivory: set the Aivory API Key
   (create one from the Aivory dashboard: Agents > an agent > Customize >
   Deploy > Create API Key -- needs Business plan or above). Save.
6. Reload any backend page. The systray icon (top-right, chat-bubble, next
   to the user menu) should be visible -- widen the browser past mobile
   width if the panel renders cut off.
7. Click it, type a message, submit. With a real key, confirm the agent's
   actual reply renders. With no/invalid key, confirm the controller's
   translated error message renders instead of a raw stack trace.

Tear down the containers when done -- this is a throwaway verification
instance, not a persistent dev environment.
