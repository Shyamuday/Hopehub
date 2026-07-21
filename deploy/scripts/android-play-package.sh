#!/usr/bin/env bash
# Print the Google Play package name for a Capacitor app.
set -euo pipefail

APP="${1:-}"
case "$APP" in
  user-web) echo "com.hopehubclinic.patient" ;;
  doctor-web) echo "com.hopehubclinic.doctor" ;;
  operations-web) echo "com.hopehubclinic.operations" ;;
  *)
    echo "Unknown app: $APP" >&2
    exit 1
    ;;
esac
