"""
Aivory Odoo Demo -- one-shot bootstrap, run INSIDE `odoo shell` (see bootstrap_demo.sh).

Why this exists: the demo's API-key path was stuck on three things, all fixed here.
  1. `aivory-agent` was a *portal* user (share=True, no groups), which can neither
     read sale orders over RPC nor mint a useful API key. It is made an internal
     user with app-level rights only -- NOT Settings/system admin.
  2. Nobody had ever created an API key (res_users_apikeys was empty). This mints
     one straight from the ORM, so it does not depend on the Preferences UI.
  3. web.base.url pointed at a container IP, breaking portal/quote links.

Idempotent: re-running keeps the user and does NOT mint a second key unless
ROTATE_KEY=1. The key is printed once and never stored (Odoo keeps only a hash).

Env (all optional):
  ODOO_PUBLIC_URL   default https://odoo-demo.aivory.id
  ODOO_AGENT_LOGIN  default aivory-agent
  ROTATE_KEY        1 = revoke existing "Aivory MCP" keys and mint a new one
                    (Odoo 19 keys expire after at most 90 days -- rotate on a schedule)
"""
import os
from datetime import datetime, timedelta

PUBLIC_URL = os.environ.get("ODOO_PUBLIC_URL", "https://odoo-demo.aivory.id")
AGENT_LOGIN = os.environ.get("ODOO_AGENT_LOGIN", "aivory-agent")
KEY_NAME = "Aivory MCP"

# App-level rights the agent needs to read/write demo business data. Deliberately
# no base.group_system: Aivory's own approval gate covers writes, and the MCP guide
# says to scope the key to the least Odoo access the agent needs.
AGENT_GROUPS = [
    "base.group_user",                      # internal user (portal -> internal)
    "base.group_partner_manager",           # create contacts
    "sales_team.group_sale_manager",        # Sales + CRM, all documents
    "purchase.group_purchase_manager",
    "project.group_project_manager",
    "account.group_account_invoice",        # Billing (create/post invoices)
]

ICP = env["ir.config_parameter"].sudo()  # noqa: F821 -- `env` is injected by odoo shell
ICP.set_param("web.base.url", PUBLIC_URL)
ICP.set_param("web.base.url.freeze", "True")
print(f"web.base.url = {PUBLIC_URL} (frozen)")

Users = env["res.users"].with_context(no_reset_password=True)  # noqa: F821
user = Users.with_context(active_test=False).search([("login", "=", AGENT_LOGIN)], limit=1)
groups = []
for xmlid in AGENT_GROUPS:
    g = env.ref(xmlid, raise_if_not_found=False)  # noqa: F821
    if g:
        groups.append(g)
    else:
        print(f"WARN group {xmlid} not found (module not installed?) -- skipped")

portal = env.ref("base.group_portal")  # noqa: F821
if not user:
    user = Users.create({
        "name": "Aivory Agent",
        "login": AGENT_LOGIN,
        "email": "agent@aivory.uk",
        "group_ids": [(4, g.id) for g in groups],
    })
    print(f"created internal user {AGENT_LOGIN} (id {user.id})")
else:
    user.write({
        "active": True,
        "group_ids": [(3, portal.id)] + [(4, g.id) for g in groups],
    })
    print(f"updated {AGENT_LOGIN} (id {user.id}): share={user.share}")

assert not user.share, "agent is still a portal/share user -- group swap failed"

existing = env["res.users.apikeys"].sudo().search(  # noqa: F821
    [("user_id", "=", user.id), ("name", "=", KEY_NAME)]
)
if existing and os.environ.get("ROTATE_KEY") != "1":
    print(f'API key "{KEY_NAME}" already exists for {AGENT_LOGIN} -- value is not '
          "recoverable; re-run with ROTATE_KEY=1 to replace it.")
else:
    if existing:
        existing.unlink()
    key = None
    # Odoo 19 caps key lifetime at 90 days for internal users -- rotate before then.
    for days in (90, 30):
        try:
            key = env["res.users.apikeys"].with_user(user)._generate(  # noqa: F821
                "rpc", KEY_NAME, datetime.now() + timedelta(days=days)
            )
            print(f"API key valid {days} days")
            break
        except Exception as exc:  # duration cap differs between Odoo point releases
            print(f"  {days}d rejected: {exc}")
    if not key:
        raise SystemExit("could not mint an API key")
    print("=" * 60)
    print(f"ODOO_USER    = {AGENT_LOGIN}")
    print(f"ODOO_API_KEY = {key}")
    print("Copy it now -- it is never shown again.")
    print("=" * 60)

env.cr.commit()  # noqa: F821
