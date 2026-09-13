#!/usr/bin/env bash
# Widen magazine/news integer ids so Date.now() millisecond keys fit in Postgres.
# Usage on the server:
#   bash /var/www/roshdyar/scripts/fix-magazine-pg-ids.sh
set -euo pipefail
APP_DIR="${APP_DIR:-/var/www/roshdyar}"
ENV_FILE="${ENV_FILE:-$APP_DIR/server/.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set in $ENV_FILE" >&2
  exit 1
fi

psql "$DATABASE_URL" <<'SQL'
ALTER TABLE magazine_posts ALTER COLUMN source_id TYPE BIGINT USING source_id::bigint;
ALTER TABLE news ALTER COLUMN id TYPE BIGINT USING id::bigint;
ALTER TABLE videos ALTER COLUMN id TYPE BIGINT USING id::bigint;
ALTER TABLE podcasts ALTER COLUMN id TYPE BIGINT USING id::bigint;
SQL

echo "==> magazine_posts.source_id is now BIGINT"
psql "$DATABASE_URL" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='magazine_posts' AND column_name IN ('id','source_id');"

if command -v pm2 >/dev/null 2>&1; then
  pm2 restart roshdyar
  sleep 3
fi
curl -sfS --max-time 8 http://127.0.0.1:5000/api/health || true
echo
