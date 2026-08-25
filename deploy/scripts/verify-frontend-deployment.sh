#!/usr/bin/env bash
# Verify that each frontend is built and deployed to the expected app identity.
# Run from repository root.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATIC="$ROOT/deploy/static"
APPS="${HOPEHUB_STATIC_APPS:-patient,admin,doctor,operations,healing}"
MODE="${1:-local}"

contains_app() {
  case ",$APPS," in
    *",$1,"*) return 0 ;;
    *) return 1 ;;
  esac
}

app_domain() {
  case "$1" in
    admin) echo "${HOPEHUB_ADMIN_ORIGIN:-https://admin.hopehub.in}" ;;
    doctor) echo "${HOPEHUB_DOCTOR_ORIGIN:-https://earn.hopehub.in}" ;;
    operations) echo "${HOPEHUB_OPERATIONS_ORIGIN:-https://ops.hopehub.in}" ;;
    healing) echo "${HOPEHUB_HEALING_ORIGIN:-https://hopehub.in}" ;;
    patient) echo "${HOPEHUB_PATIENT_ORIGIN:-https://care.hopehub.in}" ;;
    *) return 1 ;;
  esac
}

assert_json_marker() {
  local app="$1"
  local content="$2"
  if ! grep -q "\"app\"[[:space:]]*:[[:space:]]*\"$app\"" <<< "$content"; then
    echo "::error::Expected app marker '$app', got: $content"
    exit 1
  fi
}

verify_local_app() {
  local app="$1"
  local dir="$STATIC/$app"
  [ -d "$dir" ] || { echo "::error::Missing static dir: $dir"; exit 1; }
  [ -f "$dir/index.html" ] || { echo "::error::Missing index.html for $app"; exit 1; }
  [ -f "$dir/hopehub-app.json" ] || { echo "::error::Missing hopehub-app.json for $app"; exit 1; }
  grep -q "name=\"hopehub-app\" content=\"$app\"" "$dir/index.html" || {
    echo "::error::Missing HTML app marker for $app in $dir/index.html"
    exit 1
  }
  assert_json_marker "$app" "$(cat "$dir/hopehub-app.json")"
  if [ "$app" = "patient" ]; then
    [ -f "$dir/private-shell.html" ] || {
      echo "::error::Missing noindex private shell for patient app"
      exit 1
    }
    grep -q 'noindex, nofollow' "$dir/private-shell.html" || {
      echo "::error::Patient private shell is indexable"
      exit 1
    }
    [ -f "$dir/faq/index.html" ] || {
      echo "::error::Missing prerendered patient FAQ"
      exit 1
    }
    [ -f "$dir/ads.txt" ] || {
      echo "::error::Missing patient ads.txt"
      exit 1
    }
  fi
}

verify_s3_app() {
  local app="$1"
  if [ "${VERIFY_UNIFIED_BUCKET:-true}" = "true" ] && [ -n "${FRONTEND_BUCKET:-}" ]; then
    echo "==> Verifying s3://${FRONTEND_BUCKET}/${app}/hopehub-app.json"
    assert_json_marker "$app" "$(aws s3 cp "s3://${FRONTEND_BUCKET}/${app}/hopehub-app.json" -)"
    if [ "$app" = "patient" ]; then
      aws s3api head-object --bucket "$FRONTEND_BUCKET" --key "patient/private-shell.html" >/dev/null
      aws s3api head-object --bucket "$FRONTEND_BUCKET" --key "patient/faq/index.html" >/dev/null
      aws s3api head-object --bucket "$FRONTEND_BUCKET" --key "patient/ads.txt" >/dev/null
    fi
  fi
}

verify_domain_app() {
  local app="$1"
  local origin
  origin="$(app_domain "$app")"
  [ -n "$origin" ] || return 0

  local url="${origin%/}/hopehub-app.json"
  echo "==> Verifying ${url}"
  assert_json_marker "$app" "$(curl --fail --silent --show-error --max-time 20 "$url")"
  if [ "$app" = "patient" ]; then
    local faq_html
    faq_html="$(curl --fail --silent --show-error --max-time 20 "${origin%/}/faq")"
    grep -q 'https://care.hopehub.in/faq' <<< "$faq_html" || {
      echo "::error::Patient FAQ is missing its production canonical URL"
      exit 1
    }
    curl --fail --silent --show-error --max-time 20 "${origin%/}/ads.txt" | grep -q 'pub-' || {
      echo "::error::Patient ads.txt is unavailable"
      exit 1
    }
  fi
}

for app in patient admin doctor operations healing; do
  contains_app "$app" || continue
  case "$MODE" in
    local) verify_local_app "$app" ;;
    s3) verify_s3_app "$app" ;;
    domain) verify_domain_app "$app" ;;
    *) echo "Unknown verify mode '$MODE'. Use local, s3, or domain."; exit 1 ;;
  esac
done

echo "Frontend deployment verification passed (${MODE})."
