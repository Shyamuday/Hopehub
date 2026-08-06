#!/usr/bin/env bash
set -euo pipefail

readonly APP_DIR="/opt/hopehub/apps/api"
readonly BACKUP_DIR="/var/backups/hopehub/postgres"
readonly DB_PASSWORD_FILE="/etc/hopehub-db-pass"

set -a
. "${APP_DIR}/.env"
. /etc/hopehub-db-backup.env
set +a
cd "${APP_DIR}"

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
tier="daily"
if [[ "$(date -u +%d)" == "01" ]]; then tier="monthly"; fi
database="${DATABASE_NAME:-hopehub_clinic}"
backup_prefix="${DATABASE_BACKUP_PREFIX:-private-backups/postgres}"
backup_file="${BACKUP_DIR}/${database}-${timestamp}.dump"

cleanup() { rm -f "${backup_file}"; }
trap cleanup EXIT

PGPASSWORD="$(<"${DB_PASSWORD_FILE}")" /usr/bin/pg_dump \
  --host=127.0.0.1 \
  --username="${DATABASE_USER:-hopehub_app}" \
  --dbname="${database}" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="${backup_file}"

/usr/bin/node --import tsx "${APP_DIR}/scripts/upload-db-backup-to-s3.ts" \
  --file "${backup_file}" \
  --key "${backup_prefix}/${tier}/${database}-${timestamp}.dump"
