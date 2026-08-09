#!/usr/bin/env bash
# Deploy TatKids from GitHub onto this server.
# Run as root on the server:
#   bash scripts/deploy-server.sh
# Or after downloading just this script:
#   curl -fsSL https://raw.githubusercontent.com/mahmoudhamzeh/roshdyar2/main/scripts/deploy-server.sh | bash

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/roshdyar}"
REPO_URL="${REPO_URL:-https://github.com/mahmoudhamzeh/roshdyar2.git}"
BRANCH="${BRANCH:-main}"
TMP_DIR="/tmp/tatkids-deploy-$$"

echo "==> App dir: $APP_DIR"
echo "==> Branch:  $BRANCH"

if [[ ! -d "$APP_DIR" ]]; then
  echo "ERROR: $APP_DIR does not exist"
  exit 1
fi

echo "==> Backup"
BACKUP="/var/www/roshdyar.bak-$(date +%Y%m%d-%H%M%S)"
cp -a "$APP_DIR" "$BACKUP"
echo "    saved to $BACKUP"

echo "==> Shallow clone from GitHub"
rm -rf "$TMP_DIR"
GIT_TERMINAL_PROMPT=0 git clone --depth 1 -b "$BRANCH" "$REPO_URL" "$TMP_DIR"

echo "==> Sync code (keep .env, database, uploads, node_modules)"
rsync -a --delete \
  --exclude .git \
  --exclude node_modules \
  --exclude client/node_modules \
  --exclude server/node_modules \
  --exclude server/.env \
  --exclude server/data \
  --exclude uploads \
  --exclude server/uploads \
  --exclude client/build \
  "$TMP_DIR"/ "$APP_DIR"/

rm -rf "$TMP_DIR"

echo "==> Install dependencies"
cd "$APP_DIR"
npm install --prefix server
npm install --prefix client

echo "==> Build frontend"
npm run build --prefix client

echo "==> Restart process"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart all || pm2 resurrect || true
  pm2 list || true
elif systemctl list-units --type=service --all 2>/dev/null | grep -qi tatkids; then
  systemctl restart tatkids || true
else
  echo "    No pm2/systemd service auto-detected. Restart Node manually if needed."
fi

echo "==> Done"
echo "    Open https://tatkids.com/  (should open app dashboard)"
echo "    SMS login: /register"
echo "    Admin login: /login  (Amin / admin)"
