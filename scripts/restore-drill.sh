#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-/etc/dealer-dev-ops.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/dealer-dev-ops}"
RESTORE_DB_NAME="${RESTORE_DB_NAME:-summit_auto_restore_drill}"
KEEP_RESTORE_DB="${KEEP_RESTORE_DB:-false}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Env file not found: ${ENV_FILE}"
  exit 1
fi

set -a
source "${ENV_FILE}"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is missing in ${ENV_FILE}"
  exit 1
fi

LATEST_BACKUP="$(find "${BACKUP_DIR}" -type f -name "*.sql.gz" | sort | tail -n 1)"
if [[ -z "${LATEST_BACKUP}" ]]; then
  echo "No backup files found in ${BACKUP_DIR}"
  exit 1
fi

if [[ ! "${DATABASE_URL}" =~ ^(postgres(ql)?://[^/]+)/([^?]+)(\?.*)?$ ]]; then
  echo "Unsupported DATABASE_URL format. Expected postgresql://.../dbname"
  exit 1
fi

DB_PREFIX="${BASH_REMATCH[1]}"
DB_QUERY="${BASH_REMATCH[4]:-}"
RESTORE_DATABASE_URL="${DB_PREFIX}/${RESTORE_DB_NAME}${DB_QUERY}"

echo "[restore-drill] using backup: ${LATEST_BACKUP}"
echo "[restore-drill] restore db: ${RESTORE_DB_NAME}"

psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${RESTORE_DB_NAME};"
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${RESTORE_DB_NAME};"

gunzip -c "${LATEST_BACKUP}" | psql "${RESTORE_DATABASE_URL}" -v ON_ERROR_STOP=1 >/dev/null

VEHICLES_COUNT="$(psql "${RESTORE_DATABASE_URL}" -tAc "SELECT COUNT(*) FROM vehicles;")"
DEALERS_COUNT="$(psql "${RESTORE_DATABASE_URL}" -tAc "SELECT COUNT(*) FROM dealers;")"
LOCATIONS_COUNT="$(psql "${RESTORE_DATABASE_URL}" -tAc "SELECT COUNT(*) FROM dealer_locations;")"

echo "[restore-drill] verification:"
echo "  vehicles=${VEHICLES_COUNT}"
echo "  dealers=${DEALERS_COUNT}"
echo "  dealer_locations=${LOCATIONS_COUNT}"

if [[ "${KEEP_RESTORE_DB}" != "true" ]]; then
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${RESTORE_DB_NAME};"
  echo "[restore-drill] dropped temporary restore database"
else
  echo "[restore-drill] keeping restore database (${RESTORE_DB_NAME})"
fi

echo "[restore-drill] success"
