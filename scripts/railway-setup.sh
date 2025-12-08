#!/bin/bash

# Railway Deployment Setup Script for SSO App
# This script helps set up and deploy the 3-service architecture

set -e

echo "=================================="
echo "SSO App Railway Deployment Setup"
echo "=================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if logged in
echo "Checking Railway authentication..."
railway whoami || {
    echo "Please log in to Railway:"
    railway login
}

echo ""
echo "Current project status:"
railway status || true

echo ""
echo "=================================="
echo "MANUAL STEPS REQUIRED:"
echo "=================================="
echo ""
echo "1. Go to Railway dashboard: https://railway.app/dashboard"
echo ""
echo "2. In your 'sso-app' project, create 3 services:"
echo "   - idp (Identity Provider backend)"
echo "   - app-a (TaskFlow frontend)"
echo "   - app-b (DocVault frontend)"
echo ""
echo "3. For each service, configure:"
echo ""
echo "   === IDP Service ==="
echo "   Root Directory: apps/idp"
echo "   Dockerfile Path: apps/idp/Dockerfile"
echo "   Environment Variables:"
echo "     - NODE_ENV=production"
echo "     - JWT_SECRET=<generate with: openssl rand -base64 32>"
echo "     - COOKIE_SECRET=<generate with: openssl rand -base64 32>"
echo "     - GOOGLE_CLIENT_ID=<your google client id>"
echo "     - GOOGLE_CLIENT_SECRET=<your google client secret>"
echo "     - IDP_URL=https://<idp-service>.railway.app"
echo "     - APP_A_URL=https://<app-a-service>.railway.app"
echo "     - APP_B_URL=https://<app-b-service>.railway.app"
echo "     - CORS_ORIGINS=https://<app-a-service>.railway.app,https://<app-b-service>.railway.app"
echo "   Add a Railway Volume for SQLite persistence (mount at /app/packages/db)"
echo ""
echo "   === App-A Service (TaskFlow) ==="
echo "   Root Directory: / (root of monorepo)"
echo "   Dockerfile Path: apps/app-a/Dockerfile"
echo "   Build Arguments:"
echo "     - VITE_IDP_URL=https://<idp-service>.railway.app"
echo "     - VITE_APP_URL=https://<app-a-service>.railway.app"
echo "     - VITE_OTHER_APP_URL=https://<app-b-service>.railway.app"
echo ""
echo "   === App-B Service (DocVault) ==="
echo "   Root Directory: / (root of monorepo)"
echo "   Dockerfile Path: apps/app-b/Dockerfile"
echo "   Build Arguments:"
echo "     - VITE_IDP_URL=https://<idp-service>.railway.app"
echo "     - VITE_APP_URL=https://<app-b-service>.railway.app"
echo "     - VITE_OTHER_APP_URL=https://<app-a-service>.railway.app"
echo ""
echo "4. Generate public domains for each service in Railway"
echo ""
echo "5. After deployment, update Google OAuth redirect URI:"
echo "   https://<idp-service>.railway.app/auth/federated/google/callback"
echo ""
echo "=================================="
echo "Quick secrets generation:"
echo "=================================="
echo ""
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "COOKIE_SECRET=$(openssl rand -base64 32)"
echo ""
