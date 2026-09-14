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
  round trip through the Odoo controller to Cerveau's `/webhook`.
- Placeholder: tenant id is hardcoded (`scaffold-tenant`), auth to Cerveau is
  an optional shared-secret header with no validation on Cerveau's side yet,
  no streaming (`/ws/chat`), no multi-company support.

## Manual verification (local Odoo 18 instance)

1. Run a throwaway Odoo 18 + Postgres stack, e.g.:

   ```bash
   docker run -d --name aivory-odoo-pg -e POSTGRES_USER=odoo -e POSTGRES_PASSWORD=odoo -e POSTGRES_DB=postgres postgres:15
   docker run -d --name aivory-odoo -p 8069:8069 \
     --link aivory-odoo-pg:db -e HOST=db -e USER=odoo -e PASSWORD=odoo \
     -v "$(pwd)/addons:/mnt/extra-addons" \
     odoo:18
   ```

2. Open `http://localhost:8069`, create a database, log in as admin.
3. Activate developer mode (Settings > General Settings > scroll to bottom,
   or `?debug=1`), go to Apps, remove the "Apps" filter, search
   "Aivory Cerveau Chat", install it.
4. Settings > General Settings > Aivory Cerveau: set the Cerveau Base URL to
   a reachable Cerveau instance (e.g. the `tencent-vps` one) and, if
   configured, the shared secret. Save.
5. Reload any backend page. The systray icon (top-right, next to the user
   menu) should show a chat bubble icon.
6. Click it, type a message, submit. Confirm a reply renders in the panel
   and check the controller logs / Cerveau logs for the round trip.

Tear down the containers when done -- this is a throwaway verification
instance, not a persistent dev environment.
