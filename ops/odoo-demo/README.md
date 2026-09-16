# Odoo Demo — inject → demo → reset

Persistent demo instance at `https://odoo.aivory.id` (Odoo 18 + Postgres 15,
Traefik TLS, addon `aivory_cerveau_odoo` mounted read-only).

## First-time setup (once)

1. Fill `ODOO_DB_PASSWORD` + `ODOO_MASTER_PASSWORD` in `.env`.
2. `docker compose -f docker-compose.odoo-demo.yml up -d`
3. Create DB `demo` via `/web/database/manager` (no demo data — golden stays clean).
4. Login, install `Aivory Cerveau Chat`, set the Aivory API key.
5. Create dedicated user `aivory-agent`, generate its Odoo API key.
6. Freeze golden:
   `docker exec aivory-odoo-demo-db pg_dump -U odoo -Fc demo > ops/odoo-demo/golden/demo_golden.dump`

## Per-demo flow

```bash
# before demo — inject tailored data
ODOO_API_KEY=xxx ./ops/odoo-demo/seed_demo.py --scenario retail
# or: --scenario service

# ... run the demo (systray chat + MCP reads/writes + Approvals) ...

# after demo — full wipe back to golden (DB + filestore)
ODOO_MASTER_PASSWORD=xxx ./ops/odoo-demo/reset_demo.sh
```

`--scenario retail` = 3 customers, 5 products, 6 SO (mix draft/confirmed).
`--scenario service` = implementation/support shaped data.
`--scenario roofer` = Roofers Resource prospect (bestroofersresource.com):
4 Texas roofing contractors, Elevate Base/RMS/Pro with real pricing
($325/job, $20/sq, $60/mo, $30/mo + $200/job).
Everything is prefixed `[DEMO]` so a partial `--clear` never touches real config.

## Why golden dump, not just delete

`reset_demo.sh` drops via `/web/database/drop` (cleans filestore too),
recreates, then `pg_restore`. ~10 detik, no orphan attachments, no leftover
SO numbers skipping. `seed_demo.py --clear` exists for mid-demo cleanup
without a full restore.
