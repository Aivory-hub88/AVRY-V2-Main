#!/usr/bin/env python3
"""
Check the exact path the Odoo MCP uses: log in with the agent's API key over
XML-RPC and JSON-2, read real business data, and confirm the key is NOT an admin.

  ODOO_URL=https://odoo-demo.aivory.id ODOO_DB=demo \
  ODOO_USER=aivory-agent ODOO_API_KEY=xxx ./ops/odoo-demo/verify_agent.py

Exit code 0 = everything the MCP needs works; the key is never printed.
"""
import json
import os
import sys
import urllib.request
import xmlrpc.client

url = os.environ.get("ODOO_URL", "https://odoo-demo.aivory.id").rstrip("/")
db = os.environ.get("ODOO_DB", "demo")
user = os.environ.get("ODOO_USER", "aivory-agent")
key = os.environ.get("ODOO_API_KEY") or sys.exit("set ODOO_API_KEY")

ok = True


def check(label, passed, detail=""):
    global ok
    ok &= bool(passed)
    print(f"{'PASS' if passed else 'FAIL'}  {label}{(' -- ' + str(detail)) if detail else ''}")


uid = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common").authenticate(db, user, key, {})
check("XML-RPC authenticate", uid, f"uid {uid}")
if not uid:
    sys.exit(1)
call = lambda *a, **k: xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object").execute_kw(db, uid, key, *a, **k)  # noqa: E731

me = call("res.users", "read", [[uid]], {"fields": ["share", "login"]})[0]
check("agent is an internal user (not portal)", not me["share"])
for model in ("sale.order", "crm.lead", "project.task", "purchase.order", "account.move"):
    try:
        check(f"read {model}", True, f"{call(model, 'search_count', [[]])} records")
    except Exception as exc:  # module missing or no access
        check(f"read {model}", False, str(exc).splitlines()[-1][:80])
try:
    call("ir.config_parameter", "search_count", [[]])
    check("Settings access is denied (least privilege)", False, "agent can read system parameters")
except xmlrpc.client.Fault:
    check("Settings access is denied (least privilege)", True)

req = urllib.request.Request(
    f"{url}/json/2/sale.order/search_count", data=b'{"domain": []}', method="POST",
    headers={"Authorization": f"Bearer {key}", "X-Odoo-Database": db, "Content-Type": "application/json"},
)
try:
    check("JSON-2 Bearer (Odoo 19 API)", True, urllib.request.urlopen(req, timeout=15).read().decode())
except Exception as exc:
    check("JSON-2 Bearer (Odoo 19 API)", False, exc)

sys.exit(0 if ok else 1)
