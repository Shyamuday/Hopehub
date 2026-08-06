#!/usr/bin/env bash
set -euo pipefail

readonly source_file="$1"
readonly wal_file="$2"
readonly WAL_DIR="/var/backups/hopehub/postgres-wal"

mkdir -p "${WAL_DIR}"
chmod 700 "${WAL_DIR}"
install -m 600 "${source_file}" "${WAL_DIR}/${wal_file}"
