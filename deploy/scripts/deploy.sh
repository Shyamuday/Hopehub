#!/usr/bin/env bash
# Deploy API + nginx on an EC2 host with Docker.
# Run from repository root after configuring deploy/.env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEPLOY="$ROOT/deploy"
COMPOSE="docker compose -f $DEPLOY/docker-compose.prod.yml --env-file $DEPLOY/.env"

cd "$ROOT"

if [ ! -f "$DEPLOY/.env" ]; then
  echo "Missing $DEPLOY/.env — copy deploy/.env.production.example and fill in values."
  exit 1
fi

echo "==> Building static frontends..."
if [ -n "${API_PUBLIC_URL:-}" ]; then
  bash "$DEPLOY/scripts/configure-production-urls.sh"
fi
bash "$DEPLOY/scripts/build-static.sh"

echo "==> Building API image..."
$COMPOSE build api

echo "==> Running database migrations..."
$COMPOSE run --rm api npx prisma migrate deploy

echo "==> Starting services..."
$COMPOSE up -d

echo "==> Health check..."
sleep 5
$COMPOSE exec api node -e "fetch('http://127.0.0.1:4000/health').then((r)=>r.json()).then(console.log).catch(console.error)" || true

echo "==> Deploy complete. Verify https://api.hopehub.in/health"
