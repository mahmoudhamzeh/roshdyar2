#!/usr/bin/env bash
# TatKids / roshdyar production deploy.
#
# Usage:
#   BRANCH=main bash scripts/deploy-server.sh
#   BRANCH=cursor/review-structure-db-ui-ab9f bash scripts/deploy-server.sh
#   bash scripts/deploy-server.sh /tmp/tatkids.zip
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/roshdyar}"
REPO_URL="${REPO_URL:-https://github.com/mahmoudhamzeh/roshdyar2.git}"
BRANCH="${BRANCH:-main}"
TMP_DIR="/tmp/tatkids-deploy-$$"
PACKAGE="${1:-}"
STAMP="$(date +%Y%m%d-%H%M%S)"

echo "==> App: $APP_DIR"
echo "==> Branch: $BRANCH"

if [ ! -d "$APP_DIR" ]; then
  echo "App directory not found: $APP_DIR" >&2
  exit 1
fi

mkdir -p "$TMP_DIR/src"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

echo "==> Backup $APP_DIR -> ${APP_DIR}.bak-$STAMP"
cp -a "$APP_DIR" "${APP_DIR}.bak-$STAMP"

SRC=""
if [ -n "$PACKAGE" ]; then
  echo "==> Unpack local package $PACKAGE"
  mkdir -p "$TMP_DIR/pkg"
  case "$PACKAGE" in
    *.zip) unzip -q "$PACKAGE" -d "$TMP_DIR/pkg" ;;
    *.tar.gz|*.tgz) tar -xzf "$PACKAGE" -C "$TMP_DIR/pkg" ;;
    *) echo "Unsupported package: $PACKAGE" >&2; exit 1 ;;
  esac
  SRC="$(find "$TMP_DIR/pkg" -mindepth 1 -maxdepth 3 -type d \( -name client -o -name server \) -printf '%h\n' | head -n 1)"
  SRC="${SRC:-$TMP_DIR/pkg}"
else
  echo "==> Clone $REPO_URL ($BRANCH)"
  if GIT_TERMINAL_PROMPT=0 git clone --depth 1 -b "$BRANCH" "$REPO_URL" "$TMP_DIR/repo"; then
    SRC="$TMP_DIR/repo"
  else
    echo "Git clone failed. Download zip and retry:"
    echo "  https://github.com/mahmoudhamzeh/roshdyar2/archive/refs/heads/${BRANCH}.zip"
    exit 1
  fi
fi

echo "==> Sync code (keep .env, server/data, uploads, node_modules)"
rsync -a --delete \
  --exclude '.env' \
  --exclude 'server/.env' \
  --exclude 'server/data/' \
  --exclude 'uploads/' \
  --exclude 'server/uploads/' \
  --exclude 'node_modules/' \
  --exclude 'client/node_modules/' \
  --exclude 'server/node_modules/' \
  --exclude 'client/build/' \
  "$SRC/" "$APP_DIR/"

echo "==> Install server"
npm install --prefix "$APP_DIR/server" --production

echo "==> Install + build client"
npm install --prefix "$APP_DIR/client"
npm run build --prefix "$APP_DIR/client"

if command -v pm2 >/dev/null 2>&1; then
  echo "==> Restart pm2"
  if [ -f "$APP_DIR/ecosystem.config.js" ]; then
    pm2 startOrReload "$APP_DIR/ecosystem.config.js" --update-env || pm2 restart roshdyar || pm2 restart all
  else
    pm2 restart roshdyar || pm2 restart all
  fi
  pm2 list
else
  echo "pm2 not found – restart Node manually if needed"
fi

echo "==> Health"
curl -sS --max-time 8 http://127.0.0.1:5000/api/health || true
echo
echo "Put JWT_SECRET, DATABASE_URL, and Idekavan SMS_* values in $APP_DIR/server/.env."
echo "SMS check: node $APP_DIR/server/sms-check.js"
echo "Postgres migrate: bash $APP_DIR/scripts/migrate-postgres.sh"
echo "https://tatkids.com/  → app home"
echo "/register            → SMS login"
echo "/login               → Amin / admin"
echo "==> Done"
