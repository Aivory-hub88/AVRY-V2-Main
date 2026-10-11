# Incident: cognee-cerveau (graph memory sidecar) hung for 8 days without anyone noticing

**Window:** 2026-10-03 ~21:02 CST → 2026-10-11 17:32 CST (about 8 days 20 hours). Times are VPS local, UTC+8.
**Host:** prod VPS (`aivory-prod` / `tencent-vps`, `VM-0-16-ubuntu`)
**Component:** `cognee-cerveau.service` → `/usr/local/bin/cerveau-server` (cognee-rs fork, ADR-007), listening on `0.0.0.0:3200`
**Severity:** degraded. No data loss is known. Graph memory was silently unavailable to every Cerveau agent, and some long turns failed outright.
**Status:** recovered by a manual restart on 2026-10-11 17:32 CST. Prevention is in `ops/cognee-cerveau-watchdog/` (this commit) plus the Cerveau fail-fast patch (AVRY-Cerveau branch `fix/graph-memory-fail-fast`).

## What happened

At 21:02:05 CST on 2026-10-03, `cerveau-server` wrote its last journal line. It was in the middle of ordinary ingest work: `dataset resolved`, then `input processed`, then an `ingest gate verdict mode=shadow`. After that line it never logged or answered again. The process did not exit:

| Signal | Value during the hang |
|---|---|
| `systemctl` state | `active (running)` |
| `NRestarts` | 0 |
| RSS | ~2 MB |
| `GET /health` | timed out |
| `ss -ltn` on :3200 | LISTEN with **Recv-Q ~61**: the kernel kept completing TCP handshakes into the accept backlog, but the process never accepted them |

Because the kernel accepted the connections, clients were never refused. Each request connected and then waited for an answer that never came. Cerveau's graph client had one 60 s timeout for everything (`zeroclaw-tools/src/graph_memory.rs`, `build_runtime_proxy_client_with_timeouts("tool.graph_memory", 60, 10)`). As a result:

- **`graph_recall` / `graph_remember`** each blocked for 60 s, then failed with `graph memory unavailable: error sending request for url (http://127.0.0.1:3200/api/v1/search)`. The errors appear in `/home/ubuntu/.zeroclaw-cerveau/data/state/runtime-trace.jsonl`. All six brain profiles auto-approve both tools, and the system prompt tells agents to "check what is already known" first, so many tenant turns paid this 60 s at least once.
- **Geno's sales-forecast turns** ran past Cerveau's 180 s wall-clock turn cap (`request_timeout_secs = 180`): one or two 60 s graph waits plus normal tool work was enough.
- **`auto_recall`** stayed bounded, because it already had its own 1.5 s budget (`recall_timeout_ms`) and fails open. **`auto_ingest`** `add` calls ran in the background and each one waited 60 s.

The root cause of the hang itself is **unknown**. The process was restarted before anyone captured thread stacks or `/proc` state, so the evidence was lost. Leads, not conclusions:

- The last log lines are the ingest-gate shadow verdict path, deployed 2026-09-25 (`cerveau-server.bak-pre-ingestgate-20260925`).
- An RSS of ~2 MB for a 200 MB binary suggests the process had been idle (paged out) for a long time, not that it was spinning.

The watchdog now captures a snapshot before it restarts (see below), so the next occurrence leaves evidence.

## Why nobody noticed for 8 days

Four independent gaps, and every one of them had to be open:

1. **Restart policy only covers crashes.** `Restart=on-failure` reacts to the process exiting. A live-but-unresponsive process is "running" as far as systemd is concerned.
2. **The existing health check didn't cover :3200 and couldn't alert.** `cerveau-health-check.timer` (every 5 min) probes only `:3100` (zeroclaw-cerveau), and on failure it only writes to the journal.
3. **The monitoring stack is not alerting.** `services/avry-vps-monitoring` is not running on prod (no Prometheus or Grafana containers). Its configs also deliver alerts nowhere: `prometheus.yml` has `alertmanagers: targets: []`, and the Grafana contact point posts to `localhost:9093`, where nothing listens. It never scraped `:3200` either.
4. **Graph tools fail soft.** A failed `graph_recall` is a tool error the model works around. Turns got slower and dumber instead of breaking, and the evidence existed only in `runtime-trace.jsonl`.

## Remediation

### 1. External liveness watchdog with auto-restart and Telegram alert (deployed by `ops/cognee-cerveau-watchdog/deploy.sh`)

- `cognee-cerveau-watchdog.timer` runs every minute. It calls `curl -m 5 http://127.0.0.1:3200/health`.
- After **3 consecutive failures** (about 3 minutes), the watchdog:
  1. writes a diagnostics snapshot to `/var/lib/aivory/cognee-watchdog/hang-*.txt` (unit state, listen-socket Recv-Q, `/proc/<pid>` thread states and kernel stacks, last 40 journal lines);
  2. runs `systemctl restart cognee-cerveau`;
  3. waits up to 45 s for `/health` to return 200;
  4. sends a Telegram alert through the existing `/usr/local/bin/tencent-watch-notify.sh` (same bot and chat as `tencent-watch-agent`, which already uses it).
- Alert levels:
  - `WARN`: restarted, and `/health` is back.
  - `CRITICAL`: still down after the restart, or `systemctl restart` failed.
  - `INFO RECOVERED`: sent once the service is healthy again after a CRITICAL.
- **Restart cap:** at most 3 restarts per hour. Past that, the watchdog sends one CRITICAL ("needs a human") per hour instead of restart-looping.
- **Hands off when appropriate:** it does nothing if the unit was deliberately stopped (`inactive`) or is still starting (60 s grace).
- **Drop-in `cognee-cerveau.service.d/watchdog.conf`:**
  - `Restart=always`, because a clean exit is also an outage;
  - `TimeoutStopSec=15`, so a hung process gets SIGKILL in 15 s instead of 90;
  - `StartLimitBurst=10` per 10 min, so watchdog restarts plus a crash or two don't leave the unit stuck in `failed`.
- **Why not `WatchdogSec=`:** `cerveau-server` never calls `sd_notify` (no `NOTIFY_SOCKET` or `WATCHDOG=1` in the binary). Enabling it would make systemd kill a healthy process on every interval.
- Logic is covered by `ops/cognee-cerveau-watchdog/tests/watchdog-test.sh` (21 checks). It runs against a fake sidecar that reproduces the never-`accept()` hang.

### 2. Cerveau fails fast on a dead sidecar (AVRY-Cerveau `fix/graph-memory-fail-fast`, needs CI build + deploy)

- **Per-request budgets** replace the blanket 60 s: `add` 10 s, `graph_recall` search 15 s. A healthy search is 2–6 s, and about 3 s was observed live on 2026-10-11. `cognify` keeps 60 s, because it is a ~40 s LLM pipeline when it runs in the foreground.
- **Per-sidecar circuit breaker:** a transport failure (timeout, refused, reset) on any graph call makes every graph call fail immediately for 30 s. This covers `graph_recall`, `graph_remember`/`add`, `cognify` and `auto_recall`. HTTP error statuses don't trip it, since the sidecar did answer.
- Worst case during a hang drops from 60 s per call, every call, to 15 s for one call every 30 s. Everything else returns in milliseconds.

## Follow-ups (not done here)

- [ ] Build and deploy `fix/graph-memory-fail-fast` to both Cerveau instances (`:3100` and the `-b` config, if that is ever re-enabled).
- [ ] Next hang: read the `hang-*.txt` snapshot and find the actual deadlock (the ingest-gate path is the first suspect).
- [ ] `cerveau-health-check.sh` only logs. Either give it the same Telegram alert for `:3100`, or fold `:3100` into this watchdog. Restarting the agent runtime is a bigger decision than restarting the sidecar, so alert-only is probably right there.
- [ ] Decide whether `services/avry-vps-monitoring` should run on prod at all. If it should, wire a real Alertmanager receiver; today it would alert nobody even if it were up.
