#!/usr/bin/env bash
# Deploy the API from the production server itself.
# Intended for the GitHub self-hosted runner on Lightsail.
set -euo pipefail

APP_DIR="${LIGHTSAIL_APP_DIR:-/opt/hopehub}"
API_DIR="$APP_DIR/apps/api"

cd "$APP_DIR"
git remote set-url origin https://github.com/Shyamuday/Hopehub.git
git fetch origin main
git checkout main
git reset --hard origin/main
git update-index --skip-worktree apps/api/.env || true

cd "$API_DIR"
if [ ! -f /etc/hopehub-db-pass ] || [ ! -f /etc/hopehub-jwt-secret ]; then
  echo "Missing /etc/hopehub-db-pass or /etc/hopehub-jwt-secret on server"
  exit 1
fi

DB_PASS="$(sudo cat /etc/hopehub-db-pass)"
JWT_SECRET="$(sudo cat /etc/hopehub-jwt-secret)"
SMTP_HOST="$(sudo cat /etc/hopehub-smtp-host 2>/dev/null || true)"
SMTP_PORT="$(sudo cat /etc/hopehub-smtp-port 2>/dev/null || echo 587)"
SMTP_USER="$(sudo cat /etc/hopehub-smtp-user 2>/dev/null || true)"
SMTP_PASS="$(sudo cat /etc/hopehub-smtp-pass 2>/dev/null || true)"
SMTP_FROM="$(sudo cat /etc/hopehub-smtp-from 2>/dev/null || echo noreply@hopehub.in)"
TURN_URL="$(sudo cat /etc/hopehub-turn-url 2>/dev/null || true)"
TURN_USERNAME="$(sudo cat /etc/hopehub-turn-username 2>/dev/null || true)"
TURN_CREDENTIAL="$(sudo cat /etc/hopehub-turn-credential 2>/dev/null || true)"

cat > .env <<ENV
DATABASE_URL="postgresql://hopehub_app:${DB_PASS}@localhost:5432/hopehub_clinic?schema=public"
JWT_SECRET="${JWT_SECRET}"
NODE_ENV="production"
PORT=4000
API_PUBLIC_URL="https://api.hopehub.in"
API_URL="https://api.hopehub.in"
WEB_ORIGIN="https://hopehub.in,http://localhost:4203,http://127.0.0.1:4203"
CORS_ORIGINS="https://hopehub.in,https://mind.hopehub.in,https://admin.hopehub.in,https://doctor.hopehub.in,https://ops.hopehub.in,http://localhost:4203,http://127.0.0.1:4203,http://localhost:4204,http://127.0.0.1:4204,http://localhost:4200,http://127.0.0.1:4200"
ADMIN_ORIGIN="https://admin.hopehub.in"
DOCTOR_ORIGIN="https://doctor.hopehub.in"
OPERATIONS_ORIGIN="https://ops.hopehub.in"
DEV_OTP=""
DISABLE_DEV_DEMO="true"
SMTP_HOST="${SMTP_HOST}"
SMTP_PORT="${SMTP_PORT}"
SMTP_USER="${SMTP_USER}"
SMTP_PASS="${SMTP_PASS}"
SMTP_FROM="${SMTP_FROM}"
DOSE_OVERDUE_SWEEP_ENABLED="true"
DOSE_OVERDUE_SWEEP_INTERVAL_MS="300000"
DOSE_REMINDER_SWEEP_ENABLED="true"
DOSE_REMINDER_WINDOW_MINUTES="30"
NOTIFICATION_CHANNELS="IN_APP,EMAIL"
TURN_URL="${TURN_URL}"
TURN_USERNAME="${TURN_USERNAME}"
TURN_CREDENTIAL="${TURN_CREDENTIAL}"
OOREP_BASE_URL="https://www.oorep.com"
OOREP_TIMEOUT_MS="15000"
ENV
chmod 600 .env

npm install --no-audit --no-fund
npm run prisma:generate
npm run prisma:deploy
pm2 restart hopehub-api --update-env
pm2 save

echo "Waiting for API to be ready..."
for i in $(seq 1 15); do
  if curl -fsS http://127.0.0.1:4000/health > /dev/null 2>&1; then
    echo "API is up after ${i} attempt(s)"
    break
  fi
  if [ "$i" -eq 15 ]; then
    echo "API did not respond on port 4000 after 30s"
    pm2 logs hopehub-api --lines 50 --nostream
    exit 1
  fi
  echo "Attempt $i: not ready yet, retrying in 2s..."
  sleep 2
done
