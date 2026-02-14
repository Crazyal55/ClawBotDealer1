#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/dealer-dev-ops}"
SERVICE_NAME="${SERVICE_NAME:-dealer-dev-ops}"
BRANCH="${BRANCH:-main}"

echo "[deploy] app dir: ${APP_DIR}"
echo "[deploy] service: ${SERVICE_NAME}"
echo "[deploy] branch: ${BRANCH}"

cd "${APP_DIR}"

echo "[deploy] fetching latest code"
git fetch origin
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"

echo "[deploy] installing dependencies"
npm ci

echo "[deploy] running smoke checks"
npm run type-check
SERVER_ENTRY=server_pg.js SERVER_PORT=3100 HEALTH_URL=http://127.0.0.1:3100/api/health/db npm run test:smoke

echo "[deploy] pruning dev dependencies"
npm prune --omit=dev

echo "[deploy] restarting service"
sudo systemctl restart "${SERVICE_NAME}"
sudo systemctl status "${SERVICE_NAME}" --no-pager

echo "[deploy] done"
