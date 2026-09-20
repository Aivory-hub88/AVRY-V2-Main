#!/usr/bin/env bash
# Aivory Odoo Demo -- module install, agent user + API key, roofer dataset.
#
#   ./ops/odoo-demo/bootstrap_demo.sh modules   # install CRM/Project/Purchase/... into $ODOO_DB
#   ./ops/odoo-demo/bootstrap_demo.sh agent     # internal aivory-agent user + API key + base URL
#   ./ops/odoo-demo/bootstrap_demo.sh seed      # roofer-ops dataset (idempotent)
#   ./ops/odoo-demo/bootstrap_demo.sh all       # modules -> agent -> (freeze golden) -> seed
#
# Run on the VPS from the repo root. Everything goes through `odoo shell` inside the
# running container, so no Odoo password/RPC is needed and the API key never touches
# a file: it is printed once by `agent` and Odoo stores only its hash.
#
# Env (all optional): ODOO_DB=demo  ODOO_PUBLIC_URL  ROTATE_KEY=1
#                     ODOO_MODULES  SVC  COMPOSE  ODOO_ARGS (override for non-prod setups)
set -euo pipefail
cd "$(dirname "$0")/../.."

DB="${ODOO_DB:-demo}"
SVC="${SVC:-odoo-demo}"
COMPOSE="${COMPOSE:-docker compose --env-file ops/odoo-demo/.env-demo -f docker-compose.odoo-demo.yml}"
ODOO_ARGS="${ODOO_ARGS:--c /etc/odoo/odoo.conf}"
MODULES="${ODOO_MODULES:-sale_management,account,l10n_us,crm,sale_crm,project,sale_project,purchase,calendar,aivory_cerveau_odoo}"

env_flags=()
for v in ODOO_PUBLIC_URL ODOO_AGENT_LOGIN ROTATE_KEY; do
  [[ -n "${!v:-}" ]] && env_flags+=(-e "$v=${!v}")
done

# shellcheck disable=SC2086 -- ODOO_ARGS / COMPOSE are intentionally word-split
oshell() { $COMPOSE exec -T ${env_flags[@]+"${env_flags[@]}"} "$SVC" odoo shell $ODOO_ARGS -d "$DB" --no-http < "$1"; }

# `odoo shell` prints Python DeprecationWarning tracebacks from addons; hide them but keep our output/errors.
quiet() { grep -vE ' (INFO|WARNING) |^\s+(File "/(usr|mnt)|class |odoo\.cli|command\(|self\.shell|registry|return |load_|__import__|from \. import)|^\s*$' || true; }

cmd_modules() {
  echo "== installing: $MODULES"
  # shellcheck disable=SC2086
  $COMPOSE exec -T "$SVC" odoo $ODOO_ARGS -d "$DB" -i "$MODULES" --stop-after-init --no-http 2>&1 \
    | grep -E 'ERROR|CRITICAL|Modules loaded' || true
  echo "== restarting $SVC so the running workers see the new registry/routes"
  $COMPOSE restart "$SVC" >/dev/null
}
cmd_agent() { oshell ops/odoo-demo/bootstrap_agent.py 2>&1 | quiet; }
cmd_seed()  { oshell ops/odoo-demo/seed_roofer_ops.py 2>&1 | quiet; }

case "${1:-}" in
  modules) cmd_modules ;;
  agent)   cmd_agent ;;
  seed)    cmd_seed ;;
  all)
    cmd_modules
    cmd_agent
    echo
    echo "== freeze the golden dump NOW (clean instance + agent user, before demo data):"
    echo "   docker exec aivory-odoo-demo-db pg_dump -U odoo -Fc $DB > ops/odoo-demo/golden/demo_golden.dump"
    read -r -p "Press Enter to continue with the seed (Ctrl-C to stop and freeze first)... " _
    cmd_seed
    ;;
  *) sed -n '2,12p' "$0"; exit 1 ;;
esac
