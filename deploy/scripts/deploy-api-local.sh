#!/usr/bin/env bash
# Deploy the API from the production server itself.
# Intended for the GitHub self-hosted runner on Lightsail.
set -euo pipefail

APP_DIR="${LIGHTSAIL_APP_DIR:-/opt/hopehub}"
API_DIR="$APP_DIR/apps/api"

cd "$APP_DIR"
git remote set-url origin https://github.com/Shyamuday/Hopehub.git
if git ls-files --error-unmatch apps/api/.env >/dev/null 2>&1; then
  git update-index --no-skip-worktree apps/api/.env || true
  git checkout --force -- apps/api/.env || true
fi
git fetch origin main
git checkout -f main
git reset --hard origin/main
if git ls-files --error-unmatch apps/api/.env >/dev/null 2>&1; then
  git update-index --skip-worktree apps/api/.env || true
fi

cd "$API_DIR"
if [ ! -f /etc/hopehub-db-pass ] || [ ! -f /etc/hopehub-jwt-secret ]; then
  echo "Missing /etc/hopehub-db-pass or /etc/hopehub-jwt-secret on server"
  exit 1
fi

DB_PASS="$(sudo cat /etc/hopehub-db-pass)"
JWT_SECRET="$(sudo cat /etc/hopehub-jwt-secret)"
SES_SMTP_HOST="$(sudo cat /etc/hopehub-ses-smtp-host 2>/dev/null || true)"
SES_SMTP_PORT="$(sudo cat /etc/hopehub-ses-smtp-port 2>/dev/null || echo 587)"
SES_SMTP_USER="$(sudo cat /etc/hopehub-ses-smtp-username 2>/dev/null || true)"
SES_SMTP_PASS="$(sudo cat /etc/hopehub-ses-smtp-password 2>/dev/null || true)"
SMTP_FROM="$(sudo cat /etc/hopehub-ses-from 2>/dev/null || echo noreply@hopehub.in)"
TURN_URL="$(sudo cat /etc/hopehub-turn-url 2>/dev/null || true)"
TURN_URLS="$(sudo cat /etc/hopehub-turn-urls 2>/dev/null || echo "${TURN_URL}")"
TURN_USERNAME="$(sudo cat /etc/hopehub-turn-username 2>/dev/null || true)"
TURN_CREDENTIAL="$(sudo cat /etc/hopehub-turn-credential 2>/dev/null || true)"
TURN_SHARED_SECRET="$(sudo cat /etc/hopehub-turn-shared-secret 2>/dev/null || true)"
TURN_USERNAME_PREFIX="$(sudo cat /etc/hopehub-turn-username-prefix 2>/dev/null || echo hopehub)"
TURN_TTL_SECONDS="$(sudo cat /etc/hopehub-turn-ttl-seconds 2>/dev/null || echo 3600)"
GOOGLE_CLIENT_ID="$(sudo cat /etc/hopehub-google-client-id 2>/dev/null || echo "${GOOGLE_CLIENT_ID:-}")"
RAZORPAY_KEY_ID_VALUE="$(sudo cat /etc/hopehub-razorpay-key-id 2>/dev/null || echo "${RAZORPAY_KEY_ID:-}")"
RAZORPAY_KEY_SECRET_VALUE="$(sudo cat /etc/hopehub-razorpay-key-secret 2>/dev/null || echo "${RAZORPAY_KEY_SECRET:-}")"
RAZORPAY_WEBHOOK_SECRET_VALUE="$(sudo cat /etc/hopehub-razorpay-webhook-secret 2>/dev/null || echo "${RAZORPAY_WEBHOOK_SECRET:-}")"
AWS_ACCESS_KEY_ID_VALUE="$(sudo cat /etc/hopehub-aws-access-key-id 2>/dev/null || echo "${AWS_ACCESS_KEY_ID:-}")"
AWS_SECRET_ACCESS_KEY_VALUE="$(sudo cat /etc/hopehub-aws-secret-access-key 2>/dev/null || echo "${AWS_SECRET_ACCESS_KEY:-}")"
TELEGRAM_USER_BOT_TOKEN_VALUE="$(sudo cat /etc/hopehub-telegram-user-bot-token 2>/dev/null || echo "${TELEGRAM_USER_BOT_TOKEN:-}")"
TELEGRAM_DOCTOR_BOT_TOKEN_VALUE="$(sudo cat /etc/hopehub-telegram-doctor-bot-token 2>/dev/null || echo "${TELEGRAM_DOCTOR_BOT_TOKEN:-}")"
TELEGRAM_ADMIN_BOT_TOKEN_VALUE="$(sudo cat /etc/hopehub-telegram-admin-bot-token 2>/dev/null || echo "${TELEGRAM_ADMIN_BOT_TOKEN:-}")"
TELEGRAM_HOPEHUBBOT_TOKEN_VALUE="$(sudo cat /etc/hopehub-telegram-hopehubbot-token 2>/dev/null || sudo cat /etc/hopehub-telegram-group-help-bot-token 2>/dev/null || echo "${TELEGRAM_HOPEHUBBOT_TOKEN:-${TELEGRAM_GROUP_HELP_BOT_TOKEN:-}}")"
TELEGRAM_WEBHOOK_SECRET_VALUE="$(sudo cat /etc/hopehub-telegram-webhook-secret 2>/dev/null || echo "${TELEGRAM_WEBHOOK_SECRET:-}")"
TELEGRAM_SETUP_SECRET_VALUE="$(sudo cat /etc/hopehub-telegram-setup-secret 2>/dev/null || echo "${TELEGRAM_SETUP_SECRET:-}")"

cat > .env <<ENV
DATABASE_URL="postgresql://hopehub_app:${DB_PASS}@localhost:5432/hopehub_clinic?schema=public"
JWT_SECRET="${JWT_SECRET}"
NODE_ENV="production"
PORT=4000
API_PUBLIC_URL="https://api.hopehub.in"
API_URL="https://api.hopehub.in"
WEB_ORIGIN="https://hopehub.in"
CORS_ORIGINS="https://hopehub.in,https://admin.hopehub.in,https://earn.hopehub.in,https://support.hopehub.in,https://ops.hopehub.in,http://localhost:4203,http://127.0.0.1:4203,http://localhost:4204,http://127.0.0.1:4204,http://localhost:4200,http://127.0.0.1:4200"
ADMIN_ORIGIN="https://admin.hopehub.in"
DOCTOR_ORIGIN="https://earn.hopehub.in"
OPERATIONS_ORIGIN="https://ops.hopehub.in"
DEV_OTP=""
DISABLE_DEV_DEMO="true"
SMTP_FROM="${SMTP_FROM}"
AWS_SES_SMTP_HOST="${SES_SMTP_HOST}"
AWS_SES_SMTP_PORT="${SES_SMTP_PORT}"
AWS_SES_SMTP_USERNAME="${SES_SMTP_USER}"
AWS_SES_SMTP_PASSWORD="${SES_SMTP_PASS}"
CONTACT_MAIL_BUCKET="hopehub-contact-inbox"
CONTACT_MAIL_PREFIX="contact/"
CONTACT_MAIL_REGION="us-east-1"
CONTACT_REPLY_FROM="contact@hopehub.in"
DOSE_OVERDUE_SWEEP_ENABLED="true"
DOSE_OVERDUE_SWEEP_INTERVAL_MS="300000"
DOSE_REMINDER_SWEEP_ENABLED="true"
DOSE_REMINDER_WINDOW_MINUTES="30"
NOTIFICATION_CHANNELS="IN_APP,EMAIL"
TURN_URL="${TURN_URL}"
TURN_URLS="${TURN_URLS}"
TURN_USERNAME="${TURN_USERNAME}"
TURN_CREDENTIAL="${TURN_CREDENTIAL}"
TURN_SHARED_SECRET="${TURN_SHARED_SECRET}"
TURN_USERNAME_PREFIX="${TURN_USERNAME_PREFIX}"
TURN_TTL_SECONDS="${TURN_TTL_SECONDS}"
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID}"
RAZORPAY_KEY_ID="${RAZORPAY_KEY_ID_VALUE}"
RAZORPAY_KEY_SECRET="${RAZORPAY_KEY_SECRET_VALUE}"
RAZORPAY_WEBHOOK_SECRET="${RAZORPAY_WEBHOOK_SECRET_VALUE}"
ASSET_BUCKET="hopehub-assets"
ASSET_BUCKET_REGION="us-east-1"
PUBLIC_ASSET_BUCKET="hopehub-public-assets-924479393196"
PUBLIC_ASSET_BUCKET_REGION="us-east-1"
PUBLIC_ASSET_BASE_URL=""
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID_VALUE}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY_VALUE}"
OOREP_BASE_URL="https://www.oorep.com"
OOREP_TIMEOUT_MS="15000"
TELEGRAM_USER_BOT_TOKEN="${TELEGRAM_USER_BOT_TOKEN_VALUE}"
TELEGRAM_DOCTOR_BOT_TOKEN="${TELEGRAM_DOCTOR_BOT_TOKEN_VALUE}"
TELEGRAM_ADMIN_BOT_TOKEN="${TELEGRAM_ADMIN_BOT_TOKEN_VALUE}"
TELEGRAM_HOPEHUBBOT_TOKEN="${TELEGRAM_HOPEHUBBOT_TOKEN_VALUE}"
TELEGRAM_WEBHOOK_SECRET="${TELEGRAM_WEBHOOK_SECRET_VALUE}"
TELEGRAM_SETUP_SECRET="${TELEGRAM_SETUP_SECRET_VALUE}"
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

if [ -n "${TELEGRAM_USER_BOT_TOKEN_VALUE}${TELEGRAM_DOCTOR_BOT_TOKEN_VALUE}${TELEGRAM_ADMIN_BOT_TOKEN_VALUE}" ]; then
  echo "Configuring Telegram bot webhooks..."
  npm run telegram:setup -- --drop-pending
fi
