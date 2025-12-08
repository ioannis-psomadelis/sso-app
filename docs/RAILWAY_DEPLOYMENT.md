# Railway Deployment Guide

This guide explains how to deploy the SSO App to Railway with 3 separate services.

## Architecture on Railway

```
┌─────────────────────────────────────────────────────────────┐
│                    Railway Project: sso-app                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │     idp      │  │    app-a     │  │    app-b     │       │
│  │  (Fastify)   │  │   (React)    │  │   (React)    │       │
│  │              │  │              │  │              │       │
│  │ Port: 3000   │  │ Port: 80     │  │ Port: 80     │       │
│  │ + SQLite Vol │  │ nginx        │  │ nginx        │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                   Railway Networking                         │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. Railway account (railway.app)
2. Railway CLI installed: `npm install -g @railway/cli`
3. Railway CLI authenticated: `railway login`

## Step 1: Create Railway Project

```bash
# In the project root
railway init
# Select "Empty Project" and name it "sso-app"
```

## Step 2: Create Services

In the Railway dashboard (https://railway.app/dashboard):

1. Open your `sso-app` project
2. Click **"+ New"** → **"Empty Service"** three times to create:
   - `idp`
   - `app-a`
   - `app-b`

## Step 3: Configure Each Service

### IDP Service (Identity Provider)

**Settings → Build:**
- **Watch Paths:** `apps/idp/**`, `packages/db/**`
- **Root Directory:** (leave empty - use monorepo root)
- **Dockerfile Path:** `apps/idp/Dockerfile`

**Settings → Networking:**
- Generate a public domain (e.g., `sso-idp-production.up.railway.app`)

**Settings → Volumes:**
- Add volume mounted at `/app/packages/db` for SQLite persistence

**Variables:**
```
NODE_ENV=production
PORT=3000
JWT_SECRET=<run: openssl rand -base64 32>
COOKIE_SECRET=<run: openssl rand -base64 32>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
IDP_URL=https://sso-idp-production.up.railway.app
APP_A_URL=https://sso-app-a-production.up.railway.app
APP_B_URL=https://sso-app-b-production.up.railway.app
CORS_ORIGINS=https://sso-app-a-production.up.railway.app,https://sso-app-b-production.up.railway.app
```

### App-A Service (TaskFlow)

**Settings → Build:**
- **Watch Paths:** `apps/app-a/**`, `packages/ui/**`, `packages/auth-client/**`
- **Root Directory:** (leave empty - use monorepo root)
- **Dockerfile Path:** `apps/app-a/Dockerfile`

**Build Arguments (in Settings → Build → Advanced):**
```
VITE_IDP_URL=https://sso-idp-production.up.railway.app
VITE_APP_URL=https://sso-app-a-production.up.railway.app
VITE_OTHER_APP_URL=https://sso-app-b-production.up.railway.app
```

**Settings → Networking:**
- Generate a public domain

### App-B Service (DocVault)

**Settings → Build:**
- **Watch Paths:** `apps/app-b/**`, `packages/ui/**`, `packages/auth-client/**`
- **Root Directory:** (leave empty - use monorepo root)
- **Dockerfile Path:** `apps/app-b/Dockerfile`

**Build Arguments (in Settings → Build → Advanced):**
```
VITE_IDP_URL=https://sso-idp-production.up.railway.app
VITE_APP_URL=https://sso-app-b-production.up.railway.app
VITE_OTHER_APP_URL=https://sso-app-a-production.up.railway.app
```

**Settings → Networking:**
- Generate a public domain

## Step 4: Update Google OAuth

After deployment, update your Google Cloud Console OAuth settings:

1. Go to https://console.cloud.google.com/apis/credentials
2. Edit your OAuth 2.0 Client ID
3. Add authorized redirect URI:
   ```
   https://sso-idp-production.up.railway.app/auth/federated/google/callback
   ```
4. Add authorized JavaScript origins:
   ```
   https://sso-idp-production.up.railway.app
   https://sso-app-a-production.up.railway.app
   https://sso-app-b-production.up.railway.app
   ```

## Step 5: Deploy

Push your code to trigger deployment:

```bash
git add .
git commit -m "Add Railway deployment configuration"
git push origin main
```

Or manually deploy via Railway CLI:

```bash
railway up
```

## Step 6: Initialize Database

After first deployment, the database will be seeded automatically via `start:prod` script.

Demo credentials:
- Email: `demo@example.com`
- Password: `password123`

## Troubleshooting

### CORS Errors
- Verify `CORS_ORIGINS` includes both app URLs
- Check the URLs don't have trailing slashes

### OAuth Redirect Errors
- Verify Google OAuth redirect URI matches exactly
- Check `IDP_URL` env var is correct

### Database Issues
- Ensure volume is mounted at `/app/packages/db`
- Check Railway logs: `railway logs`

### Build Failures
- Check Dockerfile paths are correct
- Verify all env vars are set before build (especially VITE_* vars)

## Local Testing with Production URLs

To test locally with production-like setup:

```bash
# Terminal 1 - IdP
IDP_URL=http://localhost:3000 \
CORS_ORIGINS=http://localhost:3001,http://localhost:3002 \
pnpm --filter @repo/idp dev

# Terminal 2 - App A
VITE_IDP_URL=http://localhost:3000 \
VITE_APP_URL=http://localhost:3001 \
VITE_OTHER_APP_URL=http://localhost:3002 \
pnpm --filter @repo/app-a dev

# Terminal 3 - App B
VITE_IDP_URL=http://localhost:3000 \
VITE_APP_URL=http://localhost:3002 \
VITE_OTHER_APP_URL=http://localhost:3001 \
pnpm --filter @repo/app-b dev
```
