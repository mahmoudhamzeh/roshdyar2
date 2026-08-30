#!/usr/bin/env bash
# Load server/.env and copy SQLite -> PostgreSQL.
# Usage:
#   bash scripts/migrate-postgres.sh
#   APP_DIR=/var/www/roshdyar bash scripts/migrate-postgres.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/roshdyar}"
ENV_FILE="${ENV_FILE:-$APP_DIR/server/.env}"
SQLITE_DEFAULT="$APP_DIR/server/data/roshdyar.db"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
else
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set in $ENV_FILE" >&2
  echo "Add a line like:" >&2
  echo "  DATABASE_URL=postgres://roshdyar:ASCII_PASSWORD@127.0.0.1:5432/roshdyar" >&2
  echo "Use English letters/numbers only in the password." >&2
  exit 1
fi

export SQLITE_PATH="${SQLITE_PATH:-$SQLITE_DEFAULT}"
cd "$APP_DIR/server"
exec node migrate-to-postgres.js
