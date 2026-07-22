#!/usr/bin/env bash
# Build Angular production bundles and stage them for static hosting.
# Run from repository root.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATIC="$ROOT/deploy/static"
APPS="${HOPEHUB_STATIC_APPS:-patient,admin,doctor,operations,healing}"

should_build() {
  case ",$APPS," in
    *",$1,"*) return 0 ;;
    *) return 1 ;;
  esac
}

echo "==> Building frontends..."
cd "$ROOT"
if should_build patient; then
  npm run build:user
fi
if should_build admin; then
  npm run build:admin
fi
if should_build doctor; then
  npm run build:doctor
fi
if should_build operations; then
  npm run build:operations
fi
if should_build healing; then
  cd "$ROOT/apps/healing-web"
  npm install --legacy-peer-deps --no-audit --no-fund
  cd "$ROOT"
  npm run build:healing
fi

echo "==> Staging static assets..."
mkdir -p "$STATIC"

if should_build patient; then
  rm -rf "$STATIC/patient"
  mkdir -p "$STATIC/patient"
  cp -r "$ROOT/apps/user-web/dist/user-web/browser/"* "$STATIC/patient/"
fi

if should_build admin; then
  rm -rf "$STATIC/admin"
  mkdir -p "$STATIC/admin"
  cp -r "$ROOT/apps/admin-web/dist/admin-web/browser/"* "$STATIC/admin/"
fi

if should_build doctor; then
  rm -rf "$STATIC/doctor"
  mkdir -p "$STATIC/doctor"
  cp -r "$ROOT/apps/doctor-web/dist/doctor-web/browser/"* "$STATIC/doctor/"
fi

if should_build operations; then
  rm -rf "$STATIC/operations"
  mkdir -p "$STATIC/operations"
  if [ -d "$ROOT/apps/operations-web/dist/operations-web/browser" ]; then
    cp -r "$ROOT/apps/operations-web/dist/operations-web/browser/"* "$STATIC/operations/"
  else
    cp -r "$ROOT/apps/operations-web/dist/operations-web/"* "$STATIC/operations/"
  fi
fi

if should_build healing; then
  rm -rf "$STATIC/healing"
  mkdir -p "$STATIC/healing"
  cp -r "$ROOT/apps/healing-web/dist/healing-hub-website/browser/"* "$STATIC/healing/"
fi

echo "==> Static files ready in deploy/static/"
