# Odoo Demo — bootstrap → golden → inject → reset

Persistent demo instance: `https://odoo-demo.aivory.uk` (also served at
`odoo-demo.aivory.id`) — Odoo 19 Community + Postgres 15, Traefik TLS, addon
`aivory_cerveau_odoo` mounted read-only. (`odoo.aivory.id` is the team's Odoo 17,
a different box.) You log in as `admin` and have the full Settings menu, so
API keys, users and modules can all be managed from the UI; nothing here is a
locked-down hosted demo.

## First-time setup (once, on the VPS, from the repo root)

1. `cp ops/odoo-demo/odoo.conf.example ops/odoo-demo/odoo.conf` + fill 2 passwords
   (`openssl rand -hex 16` twice). Write the DB one to `ops/odoo-demo/.env-demo`
   as `ODOO_DB_PASSWORD=...` too (compose needs it for the Postgres container).
2. `docker compose --env-file ops/odoo-demo/.env-demo -f docker-compose.odoo-demo.yml up -d`
3. Create DB `demo` via `/web/database/manager` (no demo data).
4. `./ops/odoo-demo/bootstrap_demo.sh modules` — installs CRM, Project, Purchase,
   Calendar, Invoicing, `sale_crm`, `sale_project` and the Aivory chat addon.
5. `./ops/odoo-demo/bootstrap_demo.sh agent` — makes `aivory-agent` an internal user
   (app-level rights, **not** Settings admin), sets `web.base.url`, and prints an
   API key **once**. Put it in the Od-MCP / `ODOO_API_KEY` config. Add
   `AIVORY_API_KEY=<tenant key from the Aivory dashboard>` to the same command to
   wire the chat widget's `aivory_cerveau.api_key` too.
6. Freeze golden (clean instance + agent user, before any demo data):
   `docker exec aivory-odoo-demo-db pg_dump -U odoo -Fc demo > ops/odoo-demo/golden/demo_golden.dump`
7. `./ops/odoo-demo/bootstrap_demo.sh seed` — the roofer dataset.
   (`bootstrap_demo.sh all` does 4→7 with a pause for the golden freeze.)

## Why the API key was stuck before

- `aivory-agent` had been created as a **portal** user (`share = true`, no groups):
  it cannot read sale orders over RPC, so an MCP pointed at it could never work.
- No API key had ever been created, and `web.base.url` held a container IP.
- Keys can also be made in the UI (avatar → Preferences → **Security** → API Keys →
  Add API Key; verified on 19.0), but Odoo 19 caps their life at **90 days** — rotate with
  `ROTATE_KEY=1 ./ops/odoo-demo/bootstrap_demo.sh agent`. The old key stops working.

## The roofer-ops dataset (`seed_roofer_ops.py`)

A fictional Texas roofing contractor, **Brazos Ridge Roofing Co.** (Bryan / College
Station), shaped on the workflow published at bestroofersresource.com: lead →
inspection → Good/Better/Best quote → permit → material PO → crew job → invoice →
payment. 34 jobs spread across every phase: 43 partners, 34 leads (pipeline stages
renamed to *New / Inspection Scheduled / Quote Sent / Won*), 25 quotes, 16 orders,
16 project tasks in *Roof Jobs*, 16 purchase orders, 7 customer invoices (4 paid,
1 partial, 2 overdue), 7 vendor bills, calendar inspections, and chatter threads.
All people, `555-01xx` phones and `@example.com` emails are fictional. Idempotent
(keyed by external id `aivory_seed.*`); dates are relative to today.

Built-in test situations, per Cerveau agent:

| Agent | Try |
|---|---|
| Teo (customer service) | "When is Ellen Kowalski's roof being done?", punch-list complaint, permit status |
| Lex (leads qualifier) | the two unusable leads (no phone/address) vs the hail-damage lead with an adjuster |
| Finn (finance) | overdue invoices (Grace Lindqvist, Monica Reyes), the HOA partial payment, open supplier bills |
| Ofira (office assistant) | Dana double-booked at 10:00 two days out; quotes sent >7 days ago with no follow-up |
| Geno (autonomous) | "thinnest-margin job?", "cash owed to us vs owed to suppliers" |

Guardrail traps: two customers named *Robert Miller*, one quote with a 35 % line
discount, and every MCP write is Irreversible-tier, so a "delete this lead" request
must stop at Approvals.

## Per-demo flow

```bash
# other scenarios (XML-RPC, run from a laptop; needs a user allowed to create data)
ODOO_API_KEY=xxx ./ops/odoo-demo/seed_demo.py --scenario retail

# after the demo — full wipe back to golden (DB + filestore)
ODOO_MASTER_PASSWORD=xxx ./ops/odoo-demo/reset_demo.sh      # ODOO_URL=... to override host
./ops/odoo-demo/bootstrap_demo.sh seed                      # re-inject roofer data
```

`seed_demo.py --scenario roofer` is the older, thin "Roofers Resource as vendor"
scenario (Elevate tiers as products); `roofer-ops` is the contractor's-own-Odoo view.

## Why golden dump, not just delete

`reset_demo.sh` drops via `/web/database/drop` (cleans filestore too), recreates,
then `pg_restore`. ~10 s, no orphan attachments, no skipped SO numbers. The agent
user and its API key live in the DB, so they survive a reset. Set `list_db = False`
in `odoo.conf` once you are done creating databases — but note reset needs the
database manager, so flip it back only if you drop that flow.
