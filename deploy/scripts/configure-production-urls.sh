#!/usr/bin/env bash
# Inject production API / app URLs into Angular environment files before CI or host builds.
# Usage (from repo root):
#   API_PUBLIC_URL=https://api.example.com \
#   WEB_ORIGIN=https://patient.example.com \
#   DOCTOR_ORIGIN=https://doctor.example.com \
#   OPERATIONS_ORIGIN=https://ops.example.com \
#   bash deploy/scripts/configure-production-urls.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

API_URL="${API_PUBLIC_URL:-https://YOUR_API_DOMAIN}"
PATIENT_URL="${WEB_ORIGIN:-https://YOUR_PATIENT_DOMAIN}"
DOCTOR_URL="${DOCTOR_ORIGIN:-https://YOUR_DOCTOR_DOMAIN}"
OPS_URL="${OPERATIONS_ORIGIN:-https://YOUR_OPS_DOMAIN}"

patch_file() {
  local file="$1"
  local api="$2"
  local doctor="${3:-}"

  if [ ! -f "$file" ]; then
    echo "Skip missing $file"
    return
  fi

  sed -i.bak "s|apiUrl: '[^']*'|apiUrl: '${api}'|g" "$file"
  if [ -n "$doctor" ]; then
    sed -i.bak "s|doctorAppUrl: '[^']*'|doctorAppUrl: '${doctor}'|g" "$file"
  fi
  rm -f "${file}.bak"
  echo "Patched $file"
}

patch_file "$ROOT/apps/user-web/src/environments/environment.prod.ts" "$API_URL"
patch_file "$ROOT/apps/doctor-web/src/environments/environment.prod.ts" "$API_URL"
patch_file "$ROOT/apps/admin-web/src/environments/environment.prod.ts" "$API_URL" "$DOCTOR_URL"
patch_file "$ROOT/apps/operations-web/src/environments/environment.prod.ts" "$API_URL" "$DOCTOR_URL"

# operations-web dev imports environment.ts — keep prod copy aligned for fileReplacements.
if [ -f "$ROOT/apps/operations-web/src/environments/environment.ts" ]; then
  patch_file "$ROOT/apps/operations-web/src/environments/environment.ts" "$API_URL" "$DOCTOR_URL"
fi

echo "Production URLs configured:"
echo "  API:        $API_URL"
echo "  Patient:    $PATIENT_URL"
echo "  Doctor:     $DOCTOR_URL"
echo "  Operations: $OPS_URL"
