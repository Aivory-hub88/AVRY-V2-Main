#!/usr/bin/env python3
"""Odoo health monitor for the Aivory VPS (stdlib only).

Checks every Odoo site layer by layer and says WHICH layer is broken:
  edge      https://<host>/web/health        (Traefik, CrowdSec, TLS, DNS)
  origin    http://<container ip>:8069/...   (Odoo itself, bypassing the proxy)
  login     https://<host>/web/login         (app + database round trip)
  database  pg_isready inside the DB container
  container docker state of the Odoo container
  cert      days until the TLS certificate expires
plus the shared Od-MCP (the connector agents use to read Odoo).

The 2026-11-03..21 outage (every Odoo domain answered HTTP 500 because Traefik's
ForwardAuth bouncer was dead) shows up here as "origin healthy, edge failing".

Alerts only on state changes: a problem must persist for 2 consecutive runs
before it alerts (warnings such as a near-expiry certificate alert at once),
reminders repeat every 6h (24h for warnings), and recovery is announced.
Channels are opt-in through the env file (Telegram and/or a generic webhook).
Exit code: 0 healthy or warnings only, 1 when anything is failing.
"""
import argparse
import json
import os
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass

SITES = [
    {"name": "odoo17", "host": "odoo.aivory.id", "container": "odoo-aivory", "db": "odoo-aivory-db"},
    {"name": "odoo19-demo", "host": "odoo-demo.aivory.id", "container": "aivory-odoo-demo", "db": "aivory-odoo-demo-db"},
]
ODMCP = {"container": "odoo-mcp-aivory", "local": "http://127.0.0.1:8500/health", "public": "https://odoo-mcp.aivory.uk/health"}

HTTP_TIMEOUT = 8
SLOW_SECONDS = 6.0
CERT_WARN_DAYS = 14
CERT_FAIL_DAYS = 3
FAIL_THRESHOLD = 2          # consecutive failing runs before a FAIL alert
WARN_THRESHOLD = 1
FAIL_REPEAT_SECONDS = 6 * 3600
WARN_REPEAT_SECONDS = 24 * 3600


@dataclass
class Check:
    name: str
    ok: bool
    detail: str = ""
    ms: int = 0
    days: float = None  # cert checks only


# ---------------------------------------------------------------- probes


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):  # a health endpoint must answer directly
        return None


def http_get(url, timeout=HTTP_TIMEOUT):
    """-> (status or 0, body text, ms, error or None). Never raises."""
    opener = urllib.request.build_opener(_NoRedirect)
    req = urllib.request.Request(url, headers={"User-Agent": "aivory-odoo-health/1"})
    t0 = time.monotonic()
    try:
        with opener.open(req, timeout=timeout) as r:
            body = r.read(4096).decode("utf-8", "replace")
            return r.status, body, int((time.monotonic() - t0) * 1000), None
    except urllib.error.HTTPError as e:
        try:
            body = e.read(512).decode("utf-8", "replace")
        except Exception:
            body = ""
        return e.code, body, int((time.monotonic() - t0) * 1000), None
    except Exception as e:  # DNS, refused, timeout, TLS
        return 0, "", int((time.monotonic() - t0) * 1000), f"{type(e).__name__}: {str(e)[:80]}"


def run(cmd, timeout=10):
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return p.returncode, (p.stdout or "") + (p.stderr or "")
    except Exception as e:
        return 127, f"{type(e).__name__}: {e}"


def container_state(name):
    rc, out = run(["docker", "inspect", "-f", "{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{end}}", name])
    if rc != 0:
        return "missing", ""
    status, _, health = out.strip().partition("|")
    return status, health


def container_ip(name):
    rc, out = run(["docker", "inspect", "-f", "{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}", name])
    ips = out.split() if rc == 0 else []
    return ips[0] if ips else None


def cert_days_left(host, port=443, timeout=HTTP_TIMEOUT):
    import socket

    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((host, port), timeout=timeout) as s:
            with ctx.wrap_socket(s, server_hostname=host) as t:
                not_after = t.getpeercert()["notAfter"]
        return (ssl.cert_time_to_seconds(not_after) - time.time()) / 86400.0, None
    except Exception as e:
        return None, f"{type(e).__name__}: {str(e)[:80]}"


def _health_ok(status, body):
    return status == 200 and "pass" in body.lower()


def probe_site(site, probes=None):
    """Run all checks for one Odoo site. `probes` lets tests inject fakes."""
    p = probes or {}
    get = p.get("http_get", http_get)
    cstate = p.get("container_state", container_state)
    cip = p.get("container_ip", container_ip)
    cdays = p.get("cert_days_left", cert_days_left)
    runner = p.get("run", run)
    checks = {}

    state, health = cstate(site["container"])
    checks["container"] = Check("container", state == "running", f"{site['container']} {state}{('/' + health) if health else ''}")

    rc, out = runner(["docker", "exec", site["db"], "pg_isready"])
    checks["database"] = Check("database", rc == 0, out.strip().splitlines()[-1][:90] if out.strip() else f"rc={rc}")

    ip = cip(site["container"]) if state == "running" else None
    if ip:
        s, b, ms, err = get(f"http://{ip}:8069/web/health")
        checks["origin"] = Check("origin", _health_ok(s, b), err or f"HTTP {s}", ms)
    else:
        checks["origin"] = Check("origin", False, "container has no IP")

    s, b, ms, err = get(f"https://{site['host']}/web/health")
    checks["edge"] = Check("edge", _health_ok(s, b), err or f"HTTP {s}", ms)

    s, b, ms, err = get(f"https://{site['host']}/web/login")
    slow = ms / 1000.0 > SLOW_SECONDS
    checks["login"] = Check("login", s == 200 and not slow, err or (f"HTTP {s}" + (f" slow {ms}ms" if slow else "")), ms)

    days, err = cdays(site["host"])
    checks["cert"] = Check("cert", days is not None and days > CERT_WARN_DAYS, err or f"{days:.0f} days left", 0, days)
    return checks


def probe_odmcp(probes=None):
    p = probes or {}
    get = p.get("http_get", http_get)
    cstate = p.get("container_state", container_state)
    checks = {}
    state, _ = cstate(ODMCP["container"])
    checks["container"] = Check("container", state == "running", f"{ODMCP['container']} {state}")
    for key in ("local", "public"):
        s, b, ms, err = get(ODMCP[key])
        ok = s == 200
        if ok:
            try:
                ok = json.loads(b).get("status") == "ok"
            except Exception:
                ok = False
        checks[key] = Check(key, ok, err or f"HTTP {s}", ms)
    return checks


# ------------------------------------------------------------- diagnosis


def diagnose_site(c):
    """-> (severity 'ok'|'warn'|'fail', message). Names the broken layer."""
    if not c["container"].ok:
        return "fail", f"container down ({c['container'].detail})"
    if not c["database"].ok:
        return "fail", f"database not accepting connections ({c['database'].detail})"
    if not c["origin"].ok and not c["edge"].ok:
        return "fail", f"Odoo application not responding (origin: {c['origin'].detail}, edge: {c['edge'].detail})"
    if c["origin"].ok and not c["edge"].ok:
        return "fail", f"edge/proxy problem: Odoo is healthy but the public URL fails ({c['edge'].detail}). Check Traefik, its middlewares (CrowdSec), TLS and DNS"
    if not c["origin"].ok:
        return "fail", f"Odoo origin failing while the edge answers ({c['origin'].detail})"
    if not c["login"].ok:
        return "fail", f"login page failing, app is up (database round trip?): {c['login'].detail}"
    days = c["cert"].days
    if days is not None and days <= CERT_FAIL_DAYS:
        return "fail", f"TLS certificate expires in {days:.0f} days"
    if not c["cert"].ok:
        return "warn", f"TLS certificate: {c['cert'].detail}"
    return "ok", "healthy"


def diagnose_odmcp(c):
    if not c["container"].ok:
        return "fail", f"Od-MCP container down ({c['container'].detail})"
    if not c["local"].ok and not c["public"].ok:
        return "fail", f"Od-MCP not answering (local: {c['local'].detail}, public: {c['public'].detail})"
    if c["local"].ok and not c["public"].ok:
        return "fail", f"Od-MCP healthy locally but the public URL fails ({c['public'].detail}): edge/proxy problem"
    if not c["local"].ok:
        return "fail", f"Od-MCP local health failing ({c['local'].detail})"
    return "ok", "healthy"


# ------------------------------------------------------------ alert logic


def step_state(state, incidents, now):
    """Pure state machine. incidents: {key: (severity, message)}.
    -> (new_state, [(kind, key, message)]) with kind in ALERT/REMINDER/RECOVERED."""
    new, events = {}, []
    for key, (sev, msg) in incidents.items():
        s = dict(state.get(key) or {"count": 0, "alerted": False, "last": 0})
        s["count"] += 1
        threshold = WARN_THRESHOLD if sev == "warn" else FAIL_THRESHOLD
        repeat = WARN_REPEAT_SECONDS if sev == "warn" else FAIL_REPEAT_SECONDS
        s["sev"], s["msg"] = sev, msg
        if s["count"] >= threshold:
            if not s["alerted"]:
                events.append(("ALERT", key, msg))
                s["alerted"], s["last"] = True, now
            elif now - s["last"] >= repeat:
                events.append(("REMINDER", key, msg))
                s["last"] = now
        new[key] = s
    for key, s in state.items():
        if key not in incidents and s.get("alerted"):
            events.append(("RECOVERED", key, "healthy again"))
    return new, events


def format_events(events, host):
    lines = []
    for kind, key, msg in events:
        icon = {"ALERT": "[ALERT]", "REMINDER": "[STILL FAILING]", "RECOVERED": "[RECOVERED]"}[kind]
        lines.append(f"{icon} {key}: {msg}")
    return f"Odoo health on {host}\n" + "\n".join(lines)


def send_alerts(text, env, post=None):
    """-> list of (channel, ok, detail). Empty list = no channel configured."""
    post = post or _post_json
    results = []
    token, chat = env.get("TELEGRAM_BOT_TOKEN"), env.get("TELEGRAM_CHAT_ID")
    if token and chat:
        base = env.get("TELEGRAM_API_BASE", "https://api.telegram.org").rstrip("/")
        ok, d = post(f"{base}/bot{token}/sendMessage", {"chat_id": chat, "text": text})
        results.append(("telegram", ok, d.replace(token, "<token>")))
    hook = env.get("ALERT_WEBHOOK_URL")
    if hook:
        ok, d = post(hook, {"text": text})
        results.append(("webhook", ok, d))
    return results


def _post_json(url, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return 200 <= r.status < 300, f"HTTP {r.status}"
    except Exception as e:
        return False, f"{type(e).__name__}: {str(e)[:80]}"


# --------------------------------------------------------------- driver


def load_env(path):
    env = dict(os.environ)
    if path and os.path.exists(path):
        for line in open(path):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip("\"'")
    return env


def configured_sites():
    # ODOO_HEALTH_SITES_JSON overrides the list (adding a site, or simulating a broken one in a dry run).
    raw = os.environ.get("ODOO_HEALTH_SITES_JSON")
    return json.loads(raw) if raw else SITES


def run_all(probes=None):
    result, incidents = {}, {}
    for site in configured_sites():
        checks = probe_site(site, probes)
        sev, msg = diagnose_site(checks)
        result[site["name"]] = {"severity": sev, "message": msg, "checks": {k: asdict(v) for k, v in checks.items()}}
        if sev == "fail":
            incidents[site["name"]] = ("fail", msg)
        elif sev == "warn":
            incidents[f"cert:{site['host']}"] = ("warn", msg)
    checks = probe_odmcp(probes)
    sev, msg = diagnose_odmcp(checks)
    result["od-mcp"] = {"severity": sev, "message": msg, "checks": {k: asdict(v) for k, v in checks.items()}}
    if sev == "fail":
        incidents["od-mcp"] = ("fail", msg)
    return result, incidents


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--env-file", default=os.environ.get("ODOO_HEALTH_ENV", "/home/ubuntu/odoo-health/odoo-health.env"))
    ap.add_argument("--state-dir", default=os.environ.get("ODOO_HEALTH_STATE", "/home/ubuntu/.local/state/odoo-health"))
    ap.add_argument("--json", action="store_true", help="print the full result as JSON")
    ap.add_argument("--no-alert", action="store_true", help="dry run: do not send alerts or touch state")
    ap.add_argument("--test-alert", action="store_true", help="send a test message to the configured channels and exit")
    a = ap.parse_args(argv)
    env = load_env(a.env_file)
    host = os.uname().nodename

    if a.test_alert:
        res = send_alerts(f"Odoo health on {host}\n[TEST] alert channel works", env)
        print(json.dumps(res) if res else "no alert channel configured (set TELEGRAM_BOT_TOKEN+TELEGRAM_CHAT_ID or ALERT_WEBHOOK_URL)")
        return 0 if res and all(ok for _, ok, _ in res) else 1

    result, incidents = run_all()
    now = time.time()
    os.makedirs(a.state_dir, exist_ok=True)
    state_path = os.path.join(a.state_dir, "state.json")
    try:
        state = json.load(open(state_path))
    except Exception:
        state = {}
    new_state, events = step_state(state, incidents, now)

    summary = " ".join(f"{k}={v['severity']}" for k, v in result.items())
    print(f"odoo-health: {summary}")
    for k, v in result.items():
        if v["severity"] != "ok":
            print(f"  {k}: {v['severity'].upper()} - {v['message']}", file=sys.stderr)
    if a.json:
        print(json.dumps(result, indent=2))

    if not a.no_alert:
        if events:
            text = format_events(events, host)
            sent = send_alerts(text, env)
            if not sent:
                print(f"  alert not delivered (no channel configured): {text.replace(chr(10), ' | ')}", file=sys.stderr)
            for ch, ok, d in sent:
                print(f"  alert via {ch}: {'ok' if ok else 'FAILED'} ({d})", file=sys.stderr)
        json.dump(new_state, open(state_path, "w"))
        json.dump({"ts": now, "result": result}, open(os.path.join(a.state_dir, "status.json"), "w"))
    return 1 if any(v["severity"] == "fail" for v in result.values()) else 0


if __name__ == "__main__":
    sys.exit(main())
