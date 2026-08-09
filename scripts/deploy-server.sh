#!/usr/bin/env bash
# Deploy TatKids onto this server.
#
# Mode A — from a local zip/tar you uploaded (recommended if GitHub is blocked):
#   bash scripts/deploy-server.sh /tmp/tatkids.zip
#
# Mode B — clone from GitHub / mirrors:
#   BRANCH=main bash scripts/deploy-server.sh
#
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/roshdyar}"
REPO_URL="${REPO_URL:-https://github.com/mahmoudhamzeh/roshdyar2.git}"
BRANCH="${BRANCH:-main}"
TMP_DIR="/tmp/tatkids-deploy-$$"
PACKAGE="${1:-}"

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

rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"

if [[ -n "$PACKAGE" ]]; then
  if [[ ! -f "$PACKAGE" ]]; then
    echo "ERROR: package not found: $PACKAGE"
    exit 1
  fi
  echo "==> Extract local package: $PACKAGE"
  case "$PACKAGE" in
    *.zip)
      unzip -q "$PACKAGE" -d "$TMP_DIR"
      ;;
    *.tar.gz|*.tgz)
      tar -xzf "$PACKAGE" -C "$TMP_DIR"
      ;;
    *)
      echo "ERROR: unsupported package type (use .zip or .tar.gz)"
      exit 1
      ;;
  esac
  # GitHub zip extracts into a single subfolder
  SRC="$(find "$TMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  if [[ -z "$SRC" ]]; then
    echo "ERROR: no folder found inside package"
    exit 1
  fi
else
  echo "==> Trying GitHub / mirrors (shallow clone)"
  CLONE_OK=0
  MIRRORS=(
    "$REPO_URL"
    "https://ghproxy.net/${REPO_URL}"
    "https://mirror.ghproxy.com/${REPO_URL}"
    "https://gitclone.com/github.com/mahmoudhamzeh/roshdyar2.git"
  )
  for url in "${MIRRORS[@]}"; do
    echo "    try: $url"
    if GIT_TERMINAL_PROMPT=0 git clone --depth 1 -b "$BRANCH" "$url" "$TMP_DIR/repo"; then
      CLONE_OK=1
      SRC="$TMP_DIR/repo"
      break
    fi
    rm -rf "$TMP_DIR/repo"
  done
  if [[ "$CLONE_OK" -ne 1 ]]; then
    echo
    echo "ERROR: could not reach GitHub from this server."
    echo "Download the zip on your PC, upload it, then run:"
    echo "  bash /tmp/deploy.sh /tmp/tatkids.zip"
    echo
    echo "PC download link:"
    echo "  https://github.com/mahmoudhamzeh/roshdyar2/archive/refs/heads/${BRANCH}.zip"
    exit 1
  fi
fi

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
  "$SRC"/ "$APP_DIR"/

rm -rf "$TMP_DIR"

echo "==> Install dependencies"
cd "$APP_DIR"
npm install --prefix server
npm install --prefix client

echo "==> Build frontend"
npm run build --prefix client

echo "==> Restart process"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart all || true
  pm2 list || true
else
  echo "    pm2 not found — restart Node manually if needed"
fi

echo "==> Done"
echo "    https://tatkids.com/  → app home (dashboard)"
echo "    /register            → SMS login"
echo "    /login               → Amin / admin"
