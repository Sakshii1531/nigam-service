#!/usr/bin/env bash

# ==============================================================================
# Nigam Care - Automated Server Deployment Script
# ==============================================================================
# Steps executed:
# 1. Pull latest code from GitHub (current active branch)
# 2. Install backend dependencies & restart PM2 with updated env
# 3. Install frontend dependencies & build production bundle
# 4. Clean pre-existing files in /var/www/nigamcare/
# 5. Copy new build files to /var/www/nigamcare/ and set proper permissions
# 6. Test Nginx configuration and restart Nginx
# 7. Perform verification health check
# ==============================================================================

set -eo pipefail

# Text colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Resolve script directory (repository root)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

WEB_DIR="/var/www/nigamcare"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"

# The whole deployment runs inside one { … } block: bash reads and parses it
# completely before running any of it, so the `git reset` below cannot swap
# in a different deploy.sh halfway through this run.
{
log_info "Starting deployment from repository root: $ROOT_DIR"

# ------------------------------------------------------------------------------
# 1. Pull Latest Code from GitHub
# ------------------------------------------------------------------------------
log_info "Fetching latest code from Git..."
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
log_info "Current active branch: ${CURRENT_BRANCH}"

git fetch origin "$CURRENT_BRANCH"

# Malware gate. This repository has been pushed with a hidden Node loader more
# than once (in vite.config.js, backend/api.js and init files wired into the npm
# scripts). Scan the incoming commit in a throw-away checkout BEFORE it replaces
# the working tree or anything is installed, built or restarted — and scan it
# with the scanner from the code already deployed here, so a malicious push
# cannot also disable the check.
INCOMING="$(git rev-parse "origin/$CURRENT_BRANCH")"
VERIFY_DIR="$(mktemp -d /tmp/ncc-verify.XXXXXX)"
git worktree add --detach "$VERIFY_DIR" "$INCOMING" >/dev/null 2>&1
if ! (cd "$VERIFY_DIR" && node "$ROOT_DIR/scripts/scan-malware.mjs"); then
    git worktree remove --force "$VERIFY_DIR" >/dev/null 2>&1 || true
    log_error "Malware scan FAILED for commit ${INCOMING:0:7} — deployment aborted. Nothing was changed on this server."
    exit 1
fi
git worktree remove --force "$VERIFY_DIR" >/dev/null 2>&1 || true
log_success "Malware scan passed for commit ${INCOMING:0:7}"

git reset --hard "$INCOMING"
log_success "Git repository updated to latest commit $(git rev-parse --short HEAD)"

# ------------------------------------------------------------------------------
# 2. Backend Deployment & PM2 Restart
# ------------------------------------------------------------------------------
log_info "Deploying Backend..."
cd "$BACKEND_DIR"

if [ -f "package-lock.json" ]; then
    npm ci --omit=dev --prefer-offline || npm install --omit=dev
else
    npm install --omit=dev
fi

log_info "Starting/Reloading PM2 cluster across 4 CPU cores..."
if pm2 describe nigam-backend > /dev/null 2>&1; then
    # If running in fork mode, reload won't switch to cluster, so restart with ecosystem
    pm2 restart ecosystem.config.cjs --update-env || pm2 reload ecosystem.config.cjs --update-env
else
    pm2 start ecosystem.config.cjs --update-env
fi
pm2 save
log_success "Backend PM2 cluster (4 instances of nigam-backend) running successfully"

# ------------------------------------------------------------------------------
# 3. Frontend Build
# ------------------------------------------------------------------------------
log_info "Deploying Frontend..."
cd "$FRONTEND_DIR"

if [ -f "package-lock.json" ]; then
    npm ci --prefer-offline || npm install
else
    npm install
fi

log_info "Creating production build..."
npm run build

if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    log_error "Frontend build failed or 'dist' directory is empty!"
    exit 1
fi
log_success "Frontend production build created successfully in $FRONTEND_DIR/dist"

# ------------------------------------------------------------------------------
# 4. Clean & Deploy Files to /var/www/nigamcare/
# ------------------------------------------------------------------------------
log_info "Deploying static assets to $WEB_DIR..."

sudo mkdir -p "$WEB_DIR"

log_info "Removing pre-existing files from $WEB_DIR..."
sudo rm -rf "${WEB_DIR:?}"/*

log_info "Copying new build files to $WEB_DIR..."
sudo cp -r "$FRONTEND_DIR/dist/"* "$WEB_DIR/"

log_info "Setting correct permissions for www-data..."
sudo chown -R www-data:www-data "$WEB_DIR"
sudo chmod -R 755 "$WEB_DIR"
log_success "Static assets deployed and permissions updated"

# ------------------------------------------------------------------------------
# 5. Test & Restart Nginx
# ------------------------------------------------------------------------------
log_info "Testing Nginx configuration..."
if sudo nginx -t; then
    log_success "Nginx configuration test passed"
    log_info "Restarting Nginx..."
    sudo systemctl restart nginx
    log_success "Nginx restarted successfully"
else
    log_error "Nginx configuration test failed! Aborting Nginx restart."
    exit 1
fi

# ------------------------------------------------------------------------------
# 6. Verification Health Checks
# ------------------------------------------------------------------------------
log_info "Running backend health check..."
# The backend needs ~20-30 s to connect to MongoDB and build indexes after a
# restart; the old single check after 2 s always ran too early and reported an
# empty response even when everything was fine (or wrongly said nothing when it
# was not). Poll for up to 2 minutes and fail the deploy if it never comes up.
HEALTH_CHECK=""
for _ in $(seq 1 40); do
    HEALTH_CHECK=$(curl -s -m 5 http://127.0.0.1:4000/api/v1/health || true)
    if echo "$HEALTH_CHECK" | grep -q '"status":"up"'; then break; fi
    sleep 3
done
if echo "$HEALTH_CHECK" | grep -q '"status":"up"'; then
    log_success "Backend is UP and healthy: $HEALTH_CHECK"
else
    log_error "Backend did not become healthy within 2 minutes. Last response: ${HEALTH_CHECK:-<none>}"
    pm2 status nigam-backend || true
    log_error "Check: pm2 logs nigam-backend --lines 100"
    exit 1
fi

pm2 status nigam-backend

echo ""
log_success "========================================================"
log_success " Deployment Completed Successfully!"
log_success "========================================================"
}
exit $?
