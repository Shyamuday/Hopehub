#!/usr/bin/env bash
# Inject production API / app URLs into app-owned frontend constants before CI or host builds.
# Usage (from repo root):
#   bash deploy/scripts/configure-production-urls.sh
#
# Override any value from deploy/config/production.env by exporting the matching
# API_PUBLIC_URL / WEB_ORIGIN / ADMIN_ORIGIN / DOCTOR_ORIGIN / OPERATIONS_ORIGIN.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CONFIG="$ROOT/deploy/config/production.env"

if [ -f "$CONFIG" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$CONFIG"
  set +a
fi

API_URL="${API_PUBLIC_URL:-${HOPEHUB_API_PUBLIC_URL:-https://api.hopehub.in}}"
PATIENT_URL="${WEB_ORIGIN:-${HOPEHUB_WEB_ORIGIN:-https://hopehub.in}}"
ADMIN_URL="${ADMIN_ORIGIN:-${HOPEHUB_ADMIN_ORIGIN:-https://admin.hopehub.in}}"
DOCTOR_URL="${DOCTOR_ORIGIN:-${HOPEHUB_DOCTOR_ORIGIN:-https://doctor.hopehub.in}}"
OPS_URL="${OPERATIONS_ORIGIN:-${HOPEHUB_OPERATIONS_ORIGIN:-https://ops.hopehub.in}}"
HEALING_URL="${HEALING_ORIGIN:-${HOPEHUB_HEALING_ORIGIN:-https://healing.hopehub.in}}"

patch_app_constants() {
  local file="$1"
  local api="$2"
  local app="${3:-}"
  local doctor="${4:-}"

  if [ ! -f "$file" ]; then
    echo "Skip missing $file"
    return
  fi

  sed -i.bak "s|API: '[^']*'|API: '${api}'|g" "$file"
  if [ -n "$app" ]; then
    sed -i.bak "s|APP: '[^']*'|APP: '${app}'|g" "$file"
  fi
  if [ -n "$doctor" ]; then
    sed -i.bak "s|DOCTOR: '[^']*'|DOCTOR: '${doctor}'|g" "$file"
  fi
  rm -f "${file}.bak"
  echo "Patched $file"
}

patch_app_constants "$ROOT/apps/user-web/src/environments/production-url.constants.ts" "$API_URL" "$PATIENT_URL"
patch_app_constants "$ROOT/apps/doctor-web/src/environments/production-url.constants.ts" "$API_URL" "$DOCTOR_URL"
patch_app_constants "$ROOT/apps/admin-web/src/environments/production-url.constants.ts" "$API_URL" "$ADMIN_URL" "$DOCTOR_URL"
patch_app_constants "$ROOT/apps/operations-web/src/environments/production-url.constants.ts" "$API_URL" "$OPS_URL" "$DOCTOR_URL"
patch_app_constants "$ROOT/apps/healing-web/src/environments/production-url.constants.ts" "$API_URL" "$HEALING_URL"

echo "Production URLs configured:"
echo "  API:        $API_URL"
echo "  Patient:    $PATIENT_URL"
echo "  Admin:      $ADMIN_URL"
echo "  Doctor:     $DOCTOR_URL"
echo "  Operations: $OPS_URL"
echo "  Healing:    $HEALING_URL"
