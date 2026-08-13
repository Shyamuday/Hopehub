#!/usr/bin/env bash
# Install and supervise standalone Telegram polling bots on the production host.
# Credentials live in root-readable /etc files and are never stored in git.
set -euo pipefail

APP_DIR="${LIGHTSAIL_APP_DIR:-/opt/hopehub}"

read_secret() {
  local path="$1"
  sudo cat "$path" 2>/dev/null || true
}

has_secrets() {
  local path
  for path in "$@"; do
    if [ ! -s "$path" ]; then
      return 1
    fi
  done
}

install_bot() {
  local app_name="$1"
  local process_name="$2"
  local env_body="$3"
  local bot_dir="$APP_DIR/apps/$app_name"

  if [ ! -f "$bot_dir/package-lock.json" ]; then
    echo "Skipping $process_name: $bot_dir is not present."
    return
  fi

  echo "Installing $process_name..."
  cd "$bot_dir"
  npm ci --omit=dev --no-audit --no-fund
  umask 077
  printf '%s\n' "$env_body" > .env
  chmod 600 .env

  if pm2 describe "$process_name" >/dev/null 2>&1; then
    pm2 restart "$process_name" --update-env
  else
    pm2 start bot.js --name "$process_name" --cwd "$bot_dir"
  fi
}

if has_secrets \
  /etc/hopehub-confession-bot-token \
  /etc/hopehub-confession-admin-chat-id \
  /etc/hopehub-confession-channel-id; then
  install_bot "confession-bot" "hopehub-confession-bot" "$(cat <<ENV
BOT_TOKEN=$(read_secret /etc/hopehub-confession-bot-token)
ADMIN_CHAT_ID=$(read_secret /etc/hopehub-confession-admin-chat-id)
CONFESSION_CHANNEL_ID=$(read_secret /etc/hopehub-confession-channel-id)
APPROVAL_GROUP_ID=$(read_secret /etc/hopehub-confession-approval-group-id)
CONFESSION_START_NUMBER=$(read_secret /etc/hopehub-confession-start-number)
ENV
)"
else
  echo "Skipping hopehub-confession-bot: required server secrets are missing."
fi

if has_secrets \
  /etc/hopehub-contact-bot-token \
  /etc/hopehub-contact-admin-chat-id \
  /etc/hopehub-contact-support-group-id; then
  install_bot "contact-bot" "hopehub-contact-bot" "$(cat <<ENV
BOT_TOKEN=$(read_secret /etc/hopehub-contact-bot-token)
ADMIN_CHAT_ID=$(read_secret /etc/hopehub-contact-admin-chat-id)
SUPPORT_GROUP_ID=$(read_secret /etc/hopehub-contact-support-group-id)
ENV
)"
else
  echo "Skipping hopehub-contact-bot: required server secrets are missing."
fi

if has_secrets /etc/hopehub-rules-bot-token; then
  install_bot "rules-bot" "hopehub-rules-bot" "$(cat <<ENV
BOT_TOKEN=$(read_secret /etc/hopehub-rules-bot-token)
ENV
)"
else
  echo "Skipping hopehub-rules-bot: required server secret is missing."
fi

pm2 save
pm2 ls
