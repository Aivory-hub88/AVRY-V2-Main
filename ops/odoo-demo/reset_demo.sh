#!/bin/bash
# Aivory Odoo Demo -- reset to the golden snapshot (and re-freeze it).
#
#   ./ops/odoo-demo/reset_demo.sh            # wipe the demo back to golden (~15 s, brief outage)
#   ./ops/odoo-demo/reset_demo.sh --freeze   # take a NEW golden from the live demo
#
# The golden snapshot is TWO files, always taken and restored together:
#   golden/demo_golden.dump               pg_dump -Fc of the database
#   golden/demo_golden_filestore.tar.gz   the Odoo filestore (attachments, agent avatars)
# A dump without its filestore leaves rows that point at missing files.
#
# Works directly on Postgres and the container filesystem. It deliberately does NOT use Odoo's
# /web/database/{drop,create}: on Odoo 19 those are form-POST endpoints (the old JSON calls
# returned HTTP 500, silently), and they need list_db = True, i.e. a public database manager.
# No master password is needed, so list_db can (and should) be False.
#
# Env: ODOO_DB=demo  GOLDEN_DUMP  GOLDEN_FILESTORE  ODOO_CONTAINER=aivory-odoo-demo
#      PG_CONTAINER=aivory-odoo-demo-db  RESTART_ODOO=1 (0 for a scratch-DB test)
set -euo pipefail

DB="${ODOO_DB:-demo}"
GOLDEN="${GOLDEN_DUMP:-ops/odoo-demo/golden/demo_golden.dump}"
FILESTORE_TAR="${GOLDEN_FILESTORE:-${GOLDEN%.dump}_filestore.tar.gz}"
ODOO_CTR="${ODOO_CONTAINER:-aivory-odoo-demo}"
PG_CTR="${PG_CONTAINER:-aivory-odoo-demo-db}"
FS_ROOT="/var/lib/odoo/.local/share/Odoo/filestore"   # data_dir default for the odoo user
psql_admin() { docker exec -i "$PG_CTR" psql -U odoo -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

if [[ "${1:-}" == "--freeze" ]]; then
  if [[ -f "$GOLDEN" ]]; then
    keep="${GOLDEN%.dump}.$(date +%Y%m%d-%H%M%S).dump"; mv "$GOLDEN" "$keep"; echo "previous golden kept: $keep"
  fi
  docker exec "$PG_CTR" pg_dump -U odoo -Fc "$DB" > "$GOLDEN"
  docker exec "$ODOO_CTR" tar -czf - -C "$FS_ROOT/$DB" . > "$FILESTORE_TAR"
  chmod 600 "$GOLDEN" "$FILESTORE_TAR"          # holds agent API keys and password hashes
  sha256sum "$GOLDEN" "$FILESTORE_TAR"
  echo "frozen. Keep the two files together."
  exit 0
fi

for f in "$GOLDEN" "$FILESTORE_TAR"; do
  [[ -f "$f" ]] || { echo "golden file missing: $f   (create with: $0 --freeze)"; exit 1; }
done

echo "=== resetting Odoo DB '$DB' from golden ==="
# 1. database: drop (FORCE ends Odoo's open connections), recreate empty, restore the dump
psql_admin -c "DROP DATABASE IF EXISTS \"$DB\" WITH (FORCE)"
psql_admin -c "CREATE DATABASE \"$DB\" OWNER odoo TEMPLATE template0 ENCODING 'UTF8'"
docker exec -i "$PG_CTR" pg_restore -U odoo -d "$DB" --no-owner --exit-on-error < "$GOLDEN"

# 2. filestore
docker exec "$ODOO_CTR" sh -c "rm -rf '$FS_ROOT/$DB' && mkdir -p '$FS_ROOT/$DB'"
docker exec -i "$ODOO_CTR" tar -xzf - -C "$FS_ROOT/$DB" < "$FILESTORE_TAR"

# 3. the running server still caches the old database's registry
if [[ "${RESTART_ODOO:-1}" == "1" ]]; then
  docker restart "$ODOO_CTR" > /dev/null
fi
echo "=== done: '$DB' is back to golden (logins and API keys are the ones in the snapshot) ==="
