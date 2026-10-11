# cognee-cerveau watchdog

Liveness probe for the graph-memory sidecar (`cognee-cerveau.service`, `cerveau-server`, `:3200`). It restarts the sidecar when it hangs and alerts on Telegram when it does. It exists because of [the 2026-10-03 incident](../../docs/INCIDENT-2026-10-03-COGNEE-CERVEAU-HANG.md): the sidecar stopped answering while systemd still reported it as running, and nobody noticed for 8 days.

**These files are the deployable source.** Unlike `ops/cerveau-config/`, which only records what is on the VPS, these files are what gets installed there.

| File | Installed as |
|---|---|
| `cognee-cerveau-watchdog.sh` | `/usr/local/bin/cognee-cerveau-watchdog.sh` |
| `cognee-cerveau-watchdog.service` | `/etc/systemd/system/` (oneshot, root) |
| `cognee-cerveau-watchdog.timer` | `/etc/systemd/system/` (every minute) |
| `cognee-cerveau.service.d-watchdog.conf` | `/etc/systemd/system/cognee-cerveau.service.d/watchdog.conf` |

## Behaviour

- **Every minute:** `curl -m 5 http://127.0.0.1:3200/health`.
- **3 consecutive failures:** the watchdog snapshots diagnostics to `/var/lib/aivory/cognee-watchdog/hang-*.txt`, runs `systemctl restart cognee-cerveau`, and waits up to 45 s for a 200. Then it sends a Telegram alert through `/usr/local/bin/tencent-watch-notify.sh`:
  - `WARN`: restarted and healthy again.
  - `CRITICAL`: still down after the restart.
- **Recovery:** after a CRITICAL, an `INFO RECOVERED` alert is sent once `/health` returns 200 again.
- **Restart cap:** at most 3 restarts per hour. Past that, the watchdog stops restarting and sends one CRITICAL per hour.
- **Leaves the unit alone when:**
  - it is `inactive` (stopped on purpose),
  - it is `activating`, `deactivating` or `reloading`,
  - it started less than 60 s ago.

The drop-in sets three things:

- `Restart=always`
- `TimeoutStopSec=15`, so a hung process is SIGKILLed quickly
- a looser start limit (10 per 10 min)

`WatchdogSec=` is deliberately not used, because `cerveau-server` has no sd_notify support.

All thresholds can be overridden through `COGNEE_WATCHDOG_*` environment variables (see the top of the script). To change them on the VPS, use `systemctl edit cognee-cerveau-watchdog.service`, then add `Environment=COGNEE_WATCHDOG_FAILS=2` (or another variable).

## Operate

```bash
bash ops/cognee-cerveau-watchdog/tests/watchdog-test.sh        # local, no root; fake hung sidecar
bash ops/cognee-cerveau-watchdog/deploy.sh                     # deploy to aivory-prod, sends one test alert
bash ops/cognee-cerveau-watchdog/deploy.sh --no-test-alert
bash ops/cognee-cerveau-watchdog/deploy.sh --rollback <TS>     # TS printed by the deploy
```

On the VPS:

```bash
sudo /usr/local/bin/cognee-cerveau-watchdog.sh --check         # read-only probe
journalctl -u cognee-cerveau-watchdog -n 50
ls /var/lib/aivory/cognee-watchdog/                            # fails, restarts, hang-*.txt
```

`deploy.sh` backs up whatever it would overwrite to `/var/backups/cognee-cerveau-watchdog/<TS>/`. That directory also holds a `systemctl show cognee-cerveau` snapshot and the manifest that `--rollback` reads. The deploy does **not** restart `cognee-cerveau`; the drop-in takes effect at `daemon-reload`.
