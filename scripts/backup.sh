#!/usr/bin/env bash
# Daily backup of TatKids database + uploads.
#
# Cron example (03:15 server time):
#   15 3 * * * APP_DIR=/var/www/roshdyar /var/www/roshdyar/scripts/backup.sh >> /var/log/roshdyar-backup.log 2>&1
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/roshdyar}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/roshdyar}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="${BACKUP_ROOT}/${STAMP}"

mkdir -p "$DEST"

if [ -f "$APP_DIR/server/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$APP_DIR/server/.env"
  set +a
fi

if [ -n "${DATABASE_URL:-}" ] && command -v pg_dump >/dev/null 2>&1; then
  echo "==> pg_dump"
  pg_dump --no-owner --format=custom "$DATABASE_URL" > "$DEST/postgres.dump"
elif [ -d "$APP_DIR/server/data" ]; then
  echo "==> SQLite copy"
  cp -a "$APP_DIR/server/data" "$DEST/data"
else
  echo "No database source found" >&2
fi

if [ -d "$APP_DIR/server/uploads" ]; then
  echo "==> uploads"
  tar -czf "$DEST/uploads.tar.gz" -C "$APP_DIR/server" uploads
elif [ -d "$APP_DIR/uploads" ]; then
  tar -czf "$DEST/uploads.tar.gz" -C "$APP_DIR" uploads
fi

if [ -f "$APP_DIR/server/.env" ]; then
  cp "$APP_DIR/server/.env" "$DEST/env.backup"
  chmod 600 "$DEST/env.backup"
fi

echo "==> prune backups older than ${KEEP_DAYS} days"
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime "+${KEEP_DAYS}" -exec rm -rf {} +

echo "==> done $DEST"
ls -lah "$DEST"
