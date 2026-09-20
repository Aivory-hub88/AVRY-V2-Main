# Odoo Demo — bootstrap → golden → inject → reset

Persistent demo instance: `https://odoo-demo.aivory.id` — Odoo 19 Community + Postgres 15, Traefik TLS, addon
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
   API key **once**. Put it in the Od-MCP / `ODOO_API_KEY` config.
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

## Aivory agents in Odoo Discuss (all from Odoo's own UI)

Everything is done inside Odoo as `admin` — no terminal:

1. In the **Aivory dashboard**, for each agent you want in Odoo: Agents → the agent →
   Customize → Deploy → **Create API Key** (Business plan or above). A key is bound to
   one agent, so Lex needs its own key, Geno its own, and so on.
2. In **Odoo → Settings → Aivory Agents** (top menu; also *Settings → Aivory → Manage
   Aivory agents*): click **New**, pick the agent (Geno, Teo, Lex, Finn, Ofira, Aira),
   paste its key, save.
3. The agent now exists in **Discuss** under its dashboard name and avatar. Type
   **`@Lex …`** in any channel, or open a direct message with it. Each agent keeps its
   own history per channel. Replies arrive asynchronously (a tool-using turn can take
   up to ~3 minutes); your own message shows immediately.

Group channels stay quiet unless an agent is mentioned, and agents never trigger each
other. Removing a row (or toggling *Active* off) retires the bot but keeps its history.
The old single "Aivory" bot was retired by the 19.0.2.0.0 upgrade, and the systray
chat widget (with its own key) was removed in 19.0.2.1.0 — Discuss is the only surface.

**Two different keys, two directions — don't mix them up:**

| Direction | Key | Created in | Pasted in |
|---|---|---|---|
| Odoo → Aivory (chat with agents) | Aivory API key, one per agent | Aivory dashboard | Odoo: *Settings → Aivory Agents* |
| Aivory → Odoo (agent reads/writes Odoo data via MCP) | Odoo API key | Odoo: avatar → Preferences → *Security* → *Add API Key* | The Od-MCP server config (`ODOO_API_KEY`), not an Odoo screen |

## The roofer-ops dataset (`seed_roofer_ops.py`)

A fictional Texas roofing contractor, **Brazos Ridge Roofing Co.** (Bryan / College
Station), shaped on the workflow published at bestroofersresource.com: lead →
inspection → Good/Better/Best quote → permit → material PO → crew job → invoice →
payment. 34 jobs spread across every phase: 43 partners, 34 leads (pipeline stages
renamed to *New / Inspection Scheduled / Quote Sent / Won*), 25 quotes, 16 orders,
16 project tasks in *Roof Jobs*, 16 purchase orders, 7 customer invoices (4 paid,
1 partial, 2 overdue), 7 vendor bills, calendar inspections, and chatter threads.
A further ~46 historic jobs (about six months, won/paid and lost, three with blown material budgets),
follow-up activities (some overdue, one big quote deliberately with no next step), customer tags and
real close dates make trends readable. `DEMO-SCRIPT.md` lists the questions to ask each agent and
`bootstrap_demo.sh facts` prints the correct answers from the database.
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

# after the demo — back to the golden snapshot (~15 s, short outage), no master password needed
./ops/odoo-demo/reset_demo.sh
./ops/odoo-demo/bootstrap_demo.sh seed          # only if the snapshot was frozen before the data

# after changing the demo ON PURPOSE (new agent, rotated key, more data): take a new golden
./ops/odoo-demo/reset_demo.sh --freeze
```

## The golden snapshot

Two files in `ops/odoo-demo/golden/` (git-ignored, mode 600): `demo_golden.dump` (pg_dump) and
`demo_golden_filestore.tar.gz` (attachments and agent avatars). They are a pair. The snapshot
includes the Geno agent row **with its Aivory API key**, both Odoo API keys' hashes and the
`admin@aivory.uk` login, so a reset returns exactly to the configured, seeded demo. Rotate a key or
add an agent, then `--freeze` again, or a later reset will bring the old state back.

`reset_demo.sh` works on Postgres and the container filesystem directly. It does not use Odoo's
`/web/database/drop|create`: on Odoo 19 those are form-POST endpoints and the previous JSON calls
returned HTTP 500 without anyone noticing, so the old reset never worked. Because no master
password is needed any more, set `list_db = False` in `odoo.conf` (then `docker restart
aivory-odoo-demo`) to take the public database manager offline.
