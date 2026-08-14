#!/usr/bin/env bash
# Retire old standalone polling workers after hopehub-api configures their webhooks.
# Credentials remain in /etc and are now consumed by the API process.
set -euo pipefail

for process_name in hopehub-contact-bot hopehub-confession-bot hopehub-rules-bot; do
  if pm2 describe "$process_name" >/dev/null 2>&1; then
    echo "Removing retired polling worker: $process_name"
    pm2 delete "$process_name"
  fi
done

pm2 save
pm2 ls
