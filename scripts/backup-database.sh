#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-/etc/dealer-dev-ops.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/dealer-dev-ops}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

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

mkdir -p "${BACKUP_DIR}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/dealer_dev_ops_${TIMESTAMP}.sql"

pg_dump "${DATABASE_URL}" > "${BACKUP_FILE}"
gzip "${BACKUP_FILE}"

find "${BACKUP_DIR}" -type f -name "*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete

echo "Backup complete: ${BACKUP_FILE}.gz"
