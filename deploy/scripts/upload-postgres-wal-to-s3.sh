#!/usr/bin/env bash
set -euo pipefail

readonly APP_DIR="/opt/hopehub/apps/api"
readonly WAL_DIR="/var/backups/hopehub/postgres-wal"

set -a
. "${APP_DIR}/.env"
. /etc/hopehub-db-backup.env
set +a
cd "${APP_DIR}"

backup_prefix="${DATABASE_BACKUP_PREFIX:-private-backups/postgres}"

shopt -s nullglob
for wal_file in "${WAL_DIR}"/*; do
  filename="$(basename "${wal_file}")"
  /usr/bin/node --import tsx "${APP_DIR}/scripts/upload-db-backup-to-s3.ts" \
    --file "${wal_file}" \
    --key "${backup_prefix}/wal/${filename}"
  rm -f "${wal_file}"
done
