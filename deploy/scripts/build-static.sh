#!/usr/bin/env bash
# Build Angular production bundles and stage them for static hosting.
# Run from repository root.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATIC="$ROOT/deploy/static"

echo "==> Building frontends..."
cd "$ROOT"
npm run build:all

echo "==> Staging static assets..."
rm -rf "$STATIC"
mkdir -p "$STATIC/patient" "$STATIC/admin" "$STATIC/doctor" "$STATIC/operations"

cp -r "$ROOT/apps/user-web/dist/user-web/browser/"* "$STATIC/patient/"
cp -r "$ROOT/apps/admin-web/dist/admin-web/browser/"* "$STATIC/admin/"
cp -r "$ROOT/apps/doctor-web/dist/doctor-web/browser/"* "$STATIC/doctor/"

if [ -d "$ROOT/apps/operations-web/dist/operations-web/browser" ]; then
  cp -r "$ROOT/apps/operations-web/dist/operations-web/browser/"* "$STATIC/operations/"
else
  cp -r "$ROOT/apps/operations-web/dist/operations-web/"* "$STATIC/operations/"
fi

echo "==> Static files ready in deploy/static/"
