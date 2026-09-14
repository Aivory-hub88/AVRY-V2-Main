# Aivory Cerveau Odoo Widget (scaffold)

Native OWL systray chat widget for Cerveau, embedded in Odoo's own web client.
See `docs/CERVEAU-ODOO-UI-WIDGET-PLAN.md` in the monorepo root for the full
architecture, decisions, and open questions this scaffold does not yet
resolve.

Target version for this scaffold: **Odoo 18**.

## Layout

```
addons/aivory_cerveau_odoo/
  __manifest__.py
  controllers/main.py          -- /aivory_cerveau/chat -> Cerveau /webhook
  models/res_config_settings.py -- Cerveau base URL + shared secret settings
  views/res_config_settings_views.xml
  static/src/js/systray_icon.js -- OWL systray component
  static/src/xml/systray_icon.xml
```

## What's real vs. placeholder

- Real: systray icon registration, panel open/close, message send/receive
  round trip through the Odoo controller to Cerveau's `/webhook`, correct
  `X-Webhook-Secret` / `X-Tenant-Id` / `X-Agent-Type` header shape (matches
  the live gateway contract in `docs/CERVEAU-STATUS.md`).
- Placeholder: tenant id and agent type are hardcoded (`scaffold-tenant` /
  `generalist`), no validation of what the shared secret should actually be
  or where it's provisioned from, no streaming (`/ws/chat`), no
  multi-company support.

## Manual verification (local Odoo 18 instance)

**Last run 2026-09-14 -- passed.** Installed cleanly, systray icon rendered,
panel opened, a typed message round-tripped through `/aivory_cerveau/chat`
and the controller's config-check reply rendered back in the panel. Did not
test against the real `tencent-vps` Cerveau instance (needs
`CERVEAU_WEBHOOK_SECRET`, not available locally, and that's live production
infra -- ask before pointing a scaffold test at it).

Two real bugs were found and fixed this pass (see
`docs/CERVEAU-ODOO-UI-WIDGET-PLAN.md` for detail): the settings-view xpath
didn't match Odoo 18's `app`/`block`/`setting` structure, and
`useService("rpc")` no longer exists in Odoo 18 (use the `rpc` function
imported from `@web/core/network/rpc` instead). Both are fixed in the
committed source.

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
   "Aivory Cerveau Chat" (or "Cerveau"), Activate.
5. Settings > General Settings > Aivory Cerveau: set the Cerveau Base URL to
   a reachable Cerveau instance and, if configured, the shared secret. Save.
6. Reload any backend page. The systray icon (top-right, chat-bubble, next
   to the user menu) should be visible -- widen the browser past mobile
   width if the panel renders cut off.
7. Click it, type a message, submit. Confirm a reply renders in the panel
   and check the controller logs / Cerveau logs for the round trip.

Tear down the containers when done -- this is a throwaway verification
instance, not a persistent dev environment.
