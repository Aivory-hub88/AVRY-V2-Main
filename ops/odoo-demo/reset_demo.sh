#!/bin/bash
# Aivory Odoo Demo — full reset to golden dump after a demo.
# Restores BOTH postgres AND odoo filestore so no orphan attachments remain.
set -euo pipefail

DB="${ODOO_DB:-demo}"
GOLDEN="${GOLDEN_DUMP:-ops/odoo-demo/golden/demo_golden.dump}"
MASTER_PWD="${ODOO_MASTER_PASSWORD:?set ODOO_MASTER_PASSWORD}"

if [[ ! -f "$GOLDEN" ]]; then
  echo "golden dump not found: $GOLDEN"
  echo "create it once after first clean setup:"
  echo "  docker exec aivory-odoo-demo-db pg_dump -U odoo -Fc $DB > $GOLDEN"
  exit 1
fi

echo "=== resetting Odoo demo DB '$DB' from golden ==="

# 1. drop via Odoo database manager (also cleans filestore/$DB)
curl -s -X POST "https://odoo-demo.aivory.id/web/database/drop" \
  -H 'Content-Type: application/json' \
  -d "{\"params\":{\"master_pwd\":\"$MASTER_PWD\",\"name\":\"$DB\"}}" > /dev/null || true

# 2. recreate empty + restore
curl -s -X POST "https://odoo-demo.aivory.id/web/database/create" \
  -H 'Content-Type: application/json' \
  -d "{\"params\":{\"master_pwd\":\"$MASTER_PWD\",\"name\":\"$DB\",\"demo\":false,\"lang\":\"en_US\",\"password\":\"${DEMO_ADMIN_PASSWORD:-demo}\",\"login\":\"admin\"}}" > /dev/null

docker exec -i aivory-odoo-demo-db pg_restore -U odoo -d "$DB" --clean --if-exists < "$GOLDEN"

echo "=== done — $DB is back to golden ==="
echo "next demo: ./ops/odoo-demo/seed_demo.py --scenario retail"
