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

log_info "Starting deployment from repository root: $ROOT_DIR"

# ------------------------------------------------------------------------------
# 1. Pull Latest Code from GitHub
# ------------------------------------------------------------------------------
log_info "Fetching latest code from Git..."
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
log_info "Current active branch: ${CURRENT_BRANCH}"

git fetch origin "$CURRENT_BRANCH"
git reset --hard "origin/$CURRENT_BRANCH"
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

log_info "Restarting PM2 process with updated environment..."
if pm2 describe nigam-backend > /dev/null 2>&1; then
    pm2 restart ecosystem.config.cjs --update-env
else
    pm2 start ecosystem.config.cjs --update-env
fi
pm2 save
log_success "Backend PM2 process (nigam-backend) restarted successfully"

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
sleep 2

HEALTH_CHECK=$(curl -s http://127.0.0.1:4000/api/v1/health || true)
if echo "$HEALTH_CHECK" | grep -q "up"; then
    log_success "Backend is UP and healthy: $HEALTH_CHECK"
else
    log_warning "Backend health check response: $HEALTH_CHECK"
fi

pm2 status nigam-backend

echo ""
log_success "========================================================"
log_success " Deployment Completed Successfully!"
log_success "========================================================"
