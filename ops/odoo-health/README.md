# odoo-health

Layer-by-layer health monitor for the Aivory Odoo sites (`odoo.aivory.id` Odoo 17, `odoo-demo.aivory.id` Odoo 19 demo)
and the shared Od-MCP connector. Stdlib Python, runs from a systemd timer every 2 minutes.

| Check | What it catches |
|---|---|
| container | Odoo container stopped / missing |
| database | `pg_isready` in the Odoo DB container |
| origin | `http://<container-ip>:8069/web/health` (Odoo itself, proxy bypassed) |
| edge | `https://<host>/web/health` (Traefik, CrowdSec/middlewares, TLS, DNS) |
| login | `https://<host>/web/login` (app + database round trip, slow > 6s counts as failing) |
| cert | TLS expiry: warning at 14 days, failing at 3 |
| od-mcp | container, `http://127.0.0.1:8500/health` and the public URL, `status == ok` |

The diagnosis names the broken layer. "Odoo is healthy but the public URL fails" is exactly the 2026-11-03..21 outage
(every Odoo domain returned HTTP 500 because Traefik's ForwardAuth CrowdSec bouncer was dead; nobody noticed for 18 days).

## Alerting
- A failure must persist for 2 runs (about 4 minutes) before it alerts; warnings (certificate) alert at once.
- Reminders every 6h while failing (24h for warnings); a recovery message when it clears. A blip never alerts.
- Channels are opt-in through `/home/ubuntu/odoo-health/odoo-health.env` (see `odoo-health.env.example`): Telegram and/or a webhook.
  `python3 odoo_health.py --test-alert` sends a test message.
  **Production uses Telegram via Geno:** `TELEGRAM_BOT_TOKEN` is the shared bot Geno uses (`@AivoryAgentBot`, the `TELEGRAM_BOT_TOKEN`
  of `avry-backend`) and `TELEGRAM_CHAT_ID` is the owner's *private* Geno chat from the `telegram_bindings` collection (not the
  "Aivory Agent team" group, so infra alerts stay private). The values live only in the VPS env file (mode 600); to repoint
  alerts to the group, use the Geno `supergroup` binding's chat id instead. With no channel configured, problems go to the journal only.
- Exit code is 1 while anything fails, so the unit also appears in `systemctl --failed`.

## Operate
```bash
python3 odoo_health.py --json --no-alert      # dry run, full result, no state or alerts
journalctl -u odoo-health -n 20               # recent runs
cat ~/.local/state/odoo-health/status.json    # last result (for dashboards)
```
`ODOO_HEALTH_SITES_JSON` overrides the site list (add a site, or simulate a broken one in a dry run).

## Install
```bash
sudo install -d -o ubuntu -g ubuntu /home/ubuntu/odoo-health /home/ubuntu/.local/state/odoo-health
cp odoo_health.py /home/ubuntu/odoo-health/ && cp odoo-health.env.example /home/ubuntu/odoo-health/odoo-health.env && chmod 600 /home/ubuntu/odoo-health/odoo-health.env
sudo cp odoo-health.service odoo-health.timer /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now odoo-health.timer
```
Tests: `python3 -m unittest` (17 tests, no network or Docker needed).
