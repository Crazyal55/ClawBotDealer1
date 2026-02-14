#!/usr/bin/env bash
set -euo pipefail

HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1:3000/api/health/db}"
DURATION_HOURS="${DURATION_HOURS:-24}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-60}"
OUTPUT_LOG="${OUTPUT_LOG:-/var/log/dealer-dev-ops/health-monitor.log}"

mkdir -p "$(dirname "${OUTPUT_LOG}")"

START_TS="$(date +%s)"
END_TS="$((START_TS + DURATION_HOURS * 3600))"
TOTAL_CHECKS=0
FAILED_CHECKS=0

echo "[health-monitor] starting at $(date -Is)" | tee -a "${OUTPUT_LOG}"
echo "[health-monitor] url=${HEALTHCHECK_URL} duration_hours=${DURATION_HOURS} interval_seconds=${INTERVAL_SECONDS}" | tee -a "${OUTPUT_LOG}"

while [[ "$(date +%s)" -lt "${END_TS}" ]]; do
  TOTAL_CHECKS="$((TOTAL_CHECKS + 1))"
  NOW="$(date -Is)"

  if curl -fsS --max-time 10 "${HEALTHCHECK_URL}" >/dev/null; then
    echo "${NOW} ok" >> "${OUTPUT_LOG}"
  else
    FAILED_CHECKS="$((FAILED_CHECKS + 1))"
    echo "${NOW} fail" | tee -a "${OUTPUT_LOG}"
  fi

  sleep "${INTERVAL_SECONDS}"
done

SUCCESS_RATE="$(awk -v t="${TOTAL_CHECKS}" -v f="${FAILED_CHECKS}" 'BEGIN { if (t==0) print "0.00"; else printf "%.2f", ((t-f)/t)*100 }')"
echo "[health-monitor] completed at $(date -Is)" | tee -a "${OUTPUT_LOG}"
echo "[health-monitor] checks=${TOTAL_CHECKS} failed=${FAILED_CHECKS} success_rate=${SUCCESS_RATE}%" | tee -a "${OUTPUT_LOG}"

if [[ "${FAILED_CHECKS}" -gt 0 ]]; then
  exit 1
fi
