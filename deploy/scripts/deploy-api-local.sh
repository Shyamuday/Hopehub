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
TURN_CREDENTIAL_MODE="$(sudo cat /etc/hopehub-turn-credential-mode 2>/dev/null || { if [ -n "$TURN_USERNAME$TURN_CREDENTIAL" ]; then echo static; elif [ -n "$TURN_SHARED_SECRET" ]; then echo temporary; fi; })"
TURN_USERNAME_PREFIX="$(sudo cat /etc/hopehub-turn-username-prefix 2>/dev/null || echo hopehub)"
TURN_TTL_SECONDS="$(sudo cat /etc/hopehub-turn-ttl-seconds 2>/dev/null || echo 3600)"
WEB_PUSH_VAPID_PUBLIC_KEY="$(sudo cat /etc/hopehub-web-push-vapid-public-key 2>/dev/null || true)"
WEB_PUSH_VAPID_PRIVATE_KEY="$(sudo cat /etc/hopehub-web-push-vapid-private-key 2>/dev/null || true)"
WEB_PUSH_VAPID_SUBJECT="$(sudo cat /etc/hopehub-web-push-vapid-subject 2>/dev/null || echo mailto:contact@hopehub.in)"

if [ -z "$WEB_PUSH_VAPID_PUBLIC_KEY" ] || [ -z "$WEB_PUSH_VAPID_PRIVATE_KEY" ]; then
  echo "Generating persistent Web Push VAPID keys on the server..."
  mapfile -t VAPID_KEYS < <(node -e 'const { createECDH } = require("node:crypto"); const key = createECDH("prime256v1"); key.generateKeys(); console.log(key.getPublicKey().toString("base64url")); console.log(key.getPrivateKey().toString("base64url"));')
  if [ "${#VAPID_KEYS[@]}" -ne 2 ] || [ -z "${VAPID_KEYS[0]}" ] || [ -z "${VAPID_KEYS[1]}" ]; then
    echo "Could not generate VAPID keys"
    exit 1
  fi
  WEB_PUSH_VAPID_PUBLIC_KEY="${VAPID_KEYS[0]}"
  WEB_PUSH_VAPID_PRIVATE_KEY="${VAPID_KEYS[1]}"
  printf '%s\n' "$WEB_PUSH_VAPID_PUBLIC_KEY" | sudo tee /etc/hopehub-web-push-vapid-public-key >/dev/null
  printf '%s\n' "$WEB_PUSH_VAPID_PRIVATE_KEY" | sudo tee /etc/hopehub-web-push-vapid-private-key >/dev/null
  printf '%s\n' "$WEB_PUSH_VAPID_SUBJECT" | sudo tee /etc/hopehub-web-push-vapid-subject >/dev/null
  sudo chmod 644 /etc/hopehub-web-push-vapid-public-key /etc/hopehub-web-push-vapid-subject
  sudo chmod 600 /etc/hopehub-web-push-vapid-private-key
fi

# TURN is required whenever users are behind mobile-carrier NAT. Keep an installed
# coturn service enabled across reboots without failing environments that do not run it.
if sudo systemctl cat coturn.service >/dev/null 2>&1; then
  sudo systemctl enable coturn.service
fi

GOOGLE_CLIENT_ID="$(sudo cat /etc/hopehub-google-client-id 2>/dev/null || echo "${GOOGLE_CLIENT_ID:-}")"
RAZORPAY_KEY_ID_VALUE="$(sudo cat /etc/hopehub-razorpay-key-id 2>/dev/null || echo "${RAZORPAY_KEY_ID:-}")"
RAZORPAY_KEY_SECRET_VALUE="$(sudo cat /etc/hopehub-razorpay-key-secret 2>/dev/null || echo "${RAZORPAY_KEY_SECRET:-}")"
RAZORPAY_WEBHOOK_SECRET_VALUE="$(sudo cat /etc/hopehub-razorpay-webhook-secret 2>/dev/null || echo "${RAZORPAY_WEBHOOK_SECRET:-}")"
AWS_ACCESS_KEY_ID_VALUE="$(sudo cat /etc/hopehub-aws-access-key-id 2>/dev/null || echo "${AWS_ACCESS_KEY_ID:-}")"
AWS_SECRET_ACCESS_KEY_VALUE="$(sudo cat /etc/hopehub-aws-secret-access-key 2>/dev/null || echo "${AWS_SECRET_ACCESS_KEY:-}")"
TELEGRAM_USER_BOT_TOKEN_VALUE="$(sudo cat /etc/hopehub-telegram-user-bot-token 2>/dev/null || echo "${TELEGRAM_USER_BOT_TOKEN:-}")"
TELEGRAM_DOCTOR_BOT_TOKEN_VALUE="$(sudo cat /etc/hopehub-telegram-doctor-bot-token 2>/dev/null || echo "${TELEGRAM_DOCTOR_BOT_TOKEN:-}")"
TELEGRAM_ADMIN_BOT_TOKEN_VALUE="$(sudo cat /etc/hopehub-telegram-admin-bot-token 2>/dev/null || echo "${TELEGRAM_ADMIN_BOT_TOKEN:-}")"
# A production secret explicitly supplied by the deployment workflow replaces a
# retired community-bot token. Otherwise preserve the server's current token.
TELEGRAM_HOPEHUBBOT_TOKEN_VALUE="${TELEGRAM_HOPEHUBBOT_TOKEN:-$(sudo cat /etc/hopehub-telegram-hopehubbot-token 2>/dev/null || sudo cat /etc/hopehub-telegram-group-help-bot-token 2>/dev/null || echo "${TELEGRAM_GROUP_HELP_BOT_TOKEN:-}")}" # deployment secret takes priority
if [ -n "${TELEGRAM_HOPEHUBBOT_TOKEN:-}" ]; then
  printf '%s\n' "$TELEGRAM_HOPEHUBBOT_TOKEN_VALUE" | sudo tee /etc/hopehub-telegram-hopehubbot-token >/dev/null
  sudo chmod 600 /etc/hopehub-telegram-hopehubbot-token
fi
TELEGRAM_WEBHOOK_SECRET_VALUE="$(sudo cat /etc/hopehub-telegram-webhook-secret 2>/dev/null || echo "${TELEGRAM_WEBHOOK_SECRET:-}")"
TELEGRAM_SETUP_SECRET_VALUE="$(sudo cat /etc/hopehub-telegram-setup-secret 2>/dev/null || echo "${TELEGRAM_SETUP_SECRET:-}")"
TELEGRAM_CONTACT_BOT_TOKEN_VALUE="$(sudo cat /etc/hopehub-contact-bot-token 2>/dev/null || echo "${TELEGRAM_CONTACT_BOT_TOKEN:-}")"
LEGACY_CONTACT_ENV="$APP_DIR/apps/contact-bot/.env"
legacy_contact_value() {
  local key="$1"
  if [ ! -f "$LEGACY_CONTACT_ENV" ]; then
    return 0
  fi
  sed -n "s/^${key}=//p" "$LEGACY_CONTACT_ENV" | tail -n 1 | tr -d '\r' | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}
LEGACY_CONTACT_ADMIN_CHAT_ID="$(legacy_contact_value ADMIN_CHAT_ID)"
LEGACY_CONTACT_SUPPORT_GROUP_ID="$(legacy_contact_value SUPPORT_GROUP_ID)"
TELEGRAM_CONTACT_ADMIN_CHAT_ID_VALUE="$(sudo cat /etc/hopehub-contact-admin-chat-id 2>/dev/null || echo "${TELEGRAM_CONTACT_ADMIN_CHAT_ID:-${LEGACY_CONTACT_ADMIN_CHAT_ID}}")"
TELEGRAM_CONTACT_SUPPORT_GROUP_ID_VALUE="$(sudo cat /etc/hopehub-contact-support-group-id 2>/dev/null || echo "${TELEGRAM_CONTACT_SUPPORT_GROUP_ID:-${LEGACY_CONTACT_SUPPORT_GROUP_ID}}")"

if [ -n "$TELEGRAM_CONTACT_ADMIN_CHAT_ID_VALUE" ] && [ ! -f /etc/hopehub-contact-admin-chat-id ]; then
  printf '%s\n' "$TELEGRAM_CONTACT_ADMIN_CHAT_ID_VALUE" | sudo tee /etc/hopehub-contact-admin-chat-id >/dev/null
  sudo chmod 600 /etc/hopehub-contact-admin-chat-id
fi
if [ -n "$TELEGRAM_CONTACT_SUPPORT_GROUP_ID_VALUE" ] && [ ! -f /etc/hopehub-contact-support-group-id ]; then
  printf '%s\n' "$TELEGRAM_CONTACT_SUPPORT_GROUP_ID_VALUE" | sudo tee /etc/hopehub-contact-support-group-id >/dev/null
  sudo chmod 600 /etc/hopehub-contact-support-group-id
fi
if [ -n "$TELEGRAM_CONTACT_BOT_TOKEN_VALUE" ] && [ -z "$TELEGRAM_CONTACT_SUPPORT_GROUP_ID_VALUE" ]; then
  echo "WARNING: Contact bot is configured, but its private support group ID is missing."
fi
TELEGRAM_CONFESSION_BOT_TOKEN_VALUE="$(sudo cat /etc/hopehub-confession-bot-token 2>/dev/null || echo "${TELEGRAM_CONFESSION_BOT_TOKEN:-}")"
TELEGRAM_CONFESSION_ADMIN_CHAT_ID_VALUE="$(sudo cat /etc/hopehub-confession-admin-chat-id 2>/dev/null || echo "${TELEGRAM_CONFESSION_ADMIN_CHAT_ID:-}")"
TELEGRAM_CONFESSION_CHANNEL_ID_VALUE="$(sudo cat /etc/hopehub-confession-channel-id 2>/dev/null || echo "${TELEGRAM_CONFESSION_CHANNEL_ID:-}")"
TELEGRAM_CONFESSION_APPROVAL_GROUP_ID_VALUE="$(sudo cat /etc/hopehub-confession-approval-group-id 2>/dev/null || echo "${TELEGRAM_CONFESSION_APPROVAL_GROUP_ID:-}")"
TELEGRAM_CONFESSION_START_NUMBER_VALUE="$(sudo cat /etc/hopehub-confession-start-number 2>/dev/null || echo "${TELEGRAM_CONFESSION_START_NUMBER:-1000}")"
TELEGRAM_RULES_BOT_TOKEN_VALUE="$(sudo cat /etc/hopehub-rules-bot-token 2>/dev/null || echo "${TELEGRAM_RULES_BOT_TOKEN:-}")"

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
TURN_CREDENTIAL_MODE="${TURN_CREDENTIAL_MODE}"
TURN_USERNAME_PREFIX="${TURN_USERNAME_PREFIX}"
TURN_TTL_SECONDS="${TURN_TTL_SECONDS}"
WEB_PUSH_VAPID_PUBLIC_KEY="${WEB_PUSH_VAPID_PUBLIC_KEY}"
WEB_PUSH_VAPID_PRIVATE_KEY="${WEB_PUSH_VAPID_PRIVATE_KEY}"
WEB_PUSH_VAPID_SUBJECT="${WEB_PUSH_VAPID_SUBJECT}"
CALL_MAINTENANCE_INTERVAL_MS="300000"
CALL_METADATA_RETENTION_DAYS="30"
CALL_QUALITY_RETENTION_DAYS="180"
PUSH_DEVICE_RETENTION_DAYS="90"
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
TELEGRAM_CONTACT_BOT_TOKEN="${TELEGRAM_CONTACT_BOT_TOKEN_VALUE}"
TELEGRAM_CONTACT_ADMIN_CHAT_ID="${TELEGRAM_CONTACT_ADMIN_CHAT_ID_VALUE}"
TELEGRAM_CONTACT_SUPPORT_GROUP_ID="${TELEGRAM_CONTACT_SUPPORT_GROUP_ID_VALUE}"
TELEGRAM_CONFESSION_BOT_TOKEN="${TELEGRAM_CONFESSION_BOT_TOKEN_VALUE}"
TELEGRAM_CONFESSION_ADMIN_CHAT_ID="${TELEGRAM_CONFESSION_ADMIN_CHAT_ID_VALUE}"
TELEGRAM_CONFESSION_CHANNEL_ID="${TELEGRAM_CONFESSION_CHANNEL_ID_VALUE}"
TELEGRAM_CONFESSION_APPROVAL_GROUP_ID="${TELEGRAM_CONFESSION_APPROVAL_GROUP_ID_VALUE}"
TELEGRAM_CONFESSION_START_NUMBER="${TELEGRAM_CONFESSION_START_NUMBER_VALUE}"
TELEGRAM_RULES_BOT_TOKEN="${TELEGRAM_RULES_BOT_TOKEN_VALUE}"
ENV
chmod 600 .env

npm install --no-audit --no-fund
npm run prisma:generate
# Production runs the API through tsx, and the repository CI performs the
# TypeScript validation. Compiling the full monorepo API on this 911 MB host
# exhausts V8's heap and prevents an otherwise valid deployment from reaching
# migrations, scheduler setup, and the process restart.
npm run prisma:deploy
npm run release:verify

# Telegram's native scheduled voice chats use a separate user-account session.
# Keep that session isolated from the API process and only enable the timer once
# an administrator has completed the one-time OTP login on this server.
sudo install -m 644 "$APP_DIR/deploy/systemd/hopehub-telegram-voice-scheduler.service" /etc/systemd/system/hopehub-telegram-voice-scheduler.service
sudo install -m 644 "$APP_DIR/deploy/systemd/hopehub-telegram-voice-scheduler.timer" /etc/systemd/system/hopehub-telegram-voice-scheduler.timer
sudo systemctl daemon-reload
if sudo test -s /etc/hopehub-telegram-user-session; then
  sudo systemctl enable --now hopehub-telegram-voice-scheduler.timer
else
  sudo systemctl disable --now hopehub-telegram-voice-scheduler.timer >/dev/null 2>&1 || true
  echo "Telegram native voice scheduler is awaiting its one-time user login."
fi
# Explicitly pass server-resolved production credentials to PM2. GitHub Actions
# may expose older repository secrets in the runner environment, and PM2 keeps
# inherited values ahead of dotenv unless they are replaced during restart.
RAZORPAY_KEY_ID="$RAZORPAY_KEY_ID_VALUE" \
RAZORPAY_KEY_SECRET="$RAZORPAY_KEY_SECRET_VALUE" \
RAZORPAY_WEBHOOK_SECRET="$RAZORPAY_WEBHOOK_SECRET_VALUE" \
GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
WEB_PUSH_VAPID_PUBLIC_KEY="$WEB_PUSH_VAPID_PUBLIC_KEY" \
WEB_PUSH_VAPID_PRIVATE_KEY="$WEB_PUSH_VAPID_PRIVATE_KEY" \
WEB_PUSH_VAPID_SUBJECT="$WEB_PUSH_VAPID_SUBJECT" \
AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID_VALUE" \
AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY_VALUE" \
TELEGRAM_USER_BOT_TOKEN="$TELEGRAM_USER_BOT_TOKEN_VALUE" \
TELEGRAM_DOCTOR_BOT_TOKEN="$TELEGRAM_DOCTOR_BOT_TOKEN_VALUE" \
TELEGRAM_ADMIN_BOT_TOKEN="$TELEGRAM_ADMIN_BOT_TOKEN_VALUE" \
TELEGRAM_HOPEHUBBOT_TOKEN="$TELEGRAM_HOPEHUBBOT_TOKEN_VALUE" \
TELEGRAM_WEBHOOK_SECRET="$TELEGRAM_WEBHOOK_SECRET_VALUE" \
TELEGRAM_SETUP_SECRET="$TELEGRAM_SETUP_SECRET_VALUE" \
TELEGRAM_CONTACT_BOT_TOKEN="$TELEGRAM_CONTACT_BOT_TOKEN_VALUE" \
TELEGRAM_CONTACT_ADMIN_CHAT_ID="$TELEGRAM_CONTACT_ADMIN_CHAT_ID_VALUE" \
TELEGRAM_CONTACT_SUPPORT_GROUP_ID="$TELEGRAM_CONTACT_SUPPORT_GROUP_ID_VALUE" \
TELEGRAM_CONFESSION_BOT_TOKEN="$TELEGRAM_CONFESSION_BOT_TOKEN_VALUE" \
TELEGRAM_CONFESSION_ADMIN_CHAT_ID="$TELEGRAM_CONFESSION_ADMIN_CHAT_ID_VALUE" \
TELEGRAM_CONFESSION_CHANNEL_ID="$TELEGRAM_CONFESSION_CHANNEL_ID_VALUE" \
TELEGRAM_CONFESSION_APPROVAL_GROUP_ID="$TELEGRAM_CONFESSION_APPROVAL_GROUP_ID_VALUE" \
TELEGRAM_CONFESSION_START_NUMBER="$TELEGRAM_CONFESSION_START_NUMBER_VALUE" \
TELEGRAM_RULES_BOT_TOKEN="$TELEGRAM_RULES_BOT_TOKEN_VALUE" \
pm2 delete hopehub-api >/dev/null 2>&1 || true
pm2 start "$APP_DIR/node_modules/tsx/dist/cli.mjs" --name hopehub-api -- src/index.ts
pm2 save

echo "Waiting for API to be ready..."
for i in $(seq 1 15); do
  if curl -fsS http://127.0.0.1:4000/health/ready > /dev/null 2>&1; then
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

if [ -n "${TELEGRAM_USER_BOT_TOKEN_VALUE}${TELEGRAM_DOCTOR_BOT_TOKEN_VALUE}${TELEGRAM_ADMIN_BOT_TOKEN_VALUE}${TELEGRAM_CONTACT_BOT_TOKEN_VALUE}${TELEGRAM_CONFESSION_BOT_TOKEN_VALUE}${TELEGRAM_RULES_BOT_TOKEN_VALUE}${TELEGRAM_HOPEHUBBOT_TOKEN_VALUE}" ]; then
  echo "Configuring Telegram bot webhooks..."
  npm run telegram:setup -- --drop-pending
fi

if [ -n "${TELEGRAM_HOPEHUBBOT_TOKEN_VALUE}" ]; then
  echo "Seeding Telegram community settings and automated campaigns..."
  TELEGRAM_RULES_BOT_TOKEN="${TELEGRAM_RULES_BOT_TOKEN_VALUE}" \
  TELEGRAM_HOPEHUBBOT_TOKEN="${TELEGRAM_HOPEHUBBOT_TOKEN_VALUE}" \
  npm run telegram:seed
fi

bash "$APP_DIR/deploy/scripts/deploy-telegram-bots-local.sh"
