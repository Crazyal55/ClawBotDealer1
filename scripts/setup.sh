#!/usr/bin/env bash
set -euo pipefail

echo "Dealer Dev Ops setup"

if ! command -v psql >/dev/null 2>&1; then
  echo "PostgreSQL client is not installed."
  echo "Install with: sudo apt-get install -y postgresql postgresql-contrib"
  exit 1
fi

DB_NAME="${DB_NAME:-summit_auto}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo "Creating database: ${DB_NAME}"
sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${DB_NAME};" >/dev/null
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME};" >/dev/null

if [[ ! -f "docs/placeholder_data.sql" ]]; then
  echo "docs/placeholder_data.sql not found"
  exit 1
fi

echo "Loading schema and seed data"
sudo -u postgres psql -d "${DB_NAME}" < docs/placeholder_data.sql >/dev/null

cat > .env <<EOF
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=false
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT_MS=30000
DB_POOL_CONNECTION_TIMEOUT_MS=5000
DB_POOL_MAX_USES=0
CORS_ORIGINS=http://localhost:3000
RATE_LIMIT_MAX=300
EOF

echo "Setup complete."
echo "Run: npm run start:pg"
