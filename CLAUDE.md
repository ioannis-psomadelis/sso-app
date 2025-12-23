# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SSO demonstration app for university thesis - implements OAuth 2.0 Authorization Code Flow with PKCE. Features a custom Identity Provider (IdP) and two client applications (TaskFlow, DocVault) that share SSO sessions.

## Commands

```bash
# Install dependencies
pnpm install

# Start all services (IdP + both client apps)
pnpm dev

# Database operations (requires DATABASE_URL env var)
pnpm db:push         # Push schema changes to PostgreSQL
pnpm db:seed         # Seed demo data (demo@example.com / password123)

# Seed with custom production URLs (for Railway)
APP_A_URL=https://... APP_B_URL=https://... pnpm db:seed

# Run individual services
pnpm --filter @repo/idp dev      # IdP at localhost:3000
pnpm --filter @repo/app-a dev    # TaskFlow at localhost:3001
pnpm --filter @repo/app-b dev    # DocVault at localhost:3002

# Build
pnpm build

# Run tests
pnpm --filter @repo/idp test        # Run IdP tests
pnpm --filter @repo/idp test:watch  # Watch mode

# Database studio (Drizzle)
pnpm --filter @repo/db db:studio
```

## Architecture

### Monorepo Structure (Turborepo + pnpm)

**Apps:**
- `apps/idp` - Identity Provider (Fastify server, OAuth 2.0 endpoints)
- `apps/app-a` - TaskFlow client (React + Vite, port 3001)
- `apps/app-b` - DocVault client (React + Vite, port 3002)

**Packages:**
- `packages/db` - Railway PostgreSQL database with Drizzle ORM (schema, migrations, seed)
- `packages/auth-client` - Client-side OAuth utilities (PKCE, token management, API helpers)
- `packages/ui` - Shared React components (Shadcn/ui style with Radix primitives)

### OAuth 2.0 Flow

1. Client generates PKCE pair (code_verifier + code_challenge)
2. Redirects to IdP `/authorize` with code_challenge
3. User authenticates at IdP login page (local or via Google)
4. IdP redirects back with authorization code
5. Client exchanges code + code_verifier at `/token`
6. IdP validates PKCE, returns tokens (access, ID, refresh)
7. SSO session cookie enables auto-login for other apps

### IdP Routes (`apps/idp/src/routes/`)
- `authorize.ts` - OAuth authorization endpoint
- `token.ts` - Token exchange (code → tokens)
- `login.ts` - User authentication UI
- `logout.ts` - Session termination
- `userinfo.ts` - Protected user info endpoint
- `well-known.ts` - OIDC discovery
- `federated.ts` - External IdP federation (Google OAuth 2.0)
- `api/tasks.ts`, `api/documents.ts` - Protected resource APIs
- `api/profile.ts` - User profile management (GET/PATCH)
- `api/admin.ts` - Admin-only APIs (requires admin role)

### Database Schema (`packages/db/src/schema.ts`)
- `users` - User accounts
- `sessions` - IdP sessions (SSO cookies reference these)
- `oauthClients` - Registered OAuth clients (app-a, app-b)
- `authorizationCodes` - Temporary codes with PKCE challenge and optional nonce
- `refreshTokens` - Long-lived tokens for refresh
- `tasks`, `documents` - App-specific data
- `federatedIdentities` - External IdP user mappings (Google accounts)

Database indexes are defined on frequently queried columns (userId, expiresAt, clientId) for performance.

### API Endpoints
- `GET /api/profile` - Get current user's profile information (requires access token)
  - Returns `hasLocalPassword` field indicating if user can use local login
- `PATCH /api/profile` - Update user profile (requires access token)
  - Update name, email
  - Change password (requires `currentPassword` for local users)
  - Set password for OAuth users (no `currentPassword` required)
  - Password requirements: 10+ chars, uppercase, lowercase, number
- `GET /api/tasks` - Get user's tasks (TaskFlow app data)
- `GET /api/documents` - Get user's documents (DocVault app data)

### Admin API Endpoints (RBAC)
Admin endpoints require `role: 'admin'` in the user record:
- `GET /api/admin/users` - Get all users (admin only)
- `GET /api/admin/tasks` - Get ALL tasks from ALL users (admin only)
- `GET /api/admin/documents` - Get ALL documents from ALL users (admin only)

### Role-Based Access Control (RBAC)
- Users have a `role` field: `'user'` (default) or `'admin'`
- Role is included in the ID token as a claim
- Admin middleware checks role before allowing access to admin endpoints
- Demo users:
  - `demo@example.com / password123` (role: user)
  - `admin@example.com / admin123` (role: admin)

### Account Linking
OAuth users (Google) are created with `passwordHash: 'OAUTH_USER_NO_LOCAL_PASSWORD'`.
They can set a local password via Settings to enable both login methods.
This demonstrates the "account linking" pattern for federated identity.

### Token Configuration
- Access Token: 2 minutes (short for demo purposes - production should use 15-60 minutes)
- ID Token: 1 hour
- Refresh Token: 7 days
- JWT signed with HS256

### Security Design Decisions

**Public Client Architecture:**
- OAuth clients are treated as public clients (no client secret required)
- PKCE (Proof Key for Code Exchange) is mandatory for all authorization flows
- This is appropriate for SPAs where secrets cannot be safely stored
- PKCE provides protection against authorization code interception attacks

**Token Security:**
- Short access token lifetime (2 minutes in demo) demonstrates token rotation best practices
- Refresh tokens enable seamless UX while maintaining security through token expiration
- In production, access tokens should be 15-60 minutes depending on security requirements
- JWT verification uses explicit HS256 algorithm to prevent algorithm confusion attacks

**OIDC Nonce Support:**
- Optional `nonce` parameter supported in authorization requests
- Nonce is stored with authorization code and included in ID token
- Provides replay attack prevention for ID tokens

**Session Security:**
- Session fixation prevention: old sessions deleted on new login
- Password changes invalidate all refresh tokens and other sessions
- Expired data cleanup runs hourly (sessions, auth codes, refresh tokens)

**Rate Limiting:**
- Global: 100 requests/minute per IP
- Login endpoint: 10 requests/minute (brute-force protection)
- Token endpoint: 30 requests/minute

**Security Headers:**
- Helmet middleware adds security headers (CSP, X-Frame-Options, etc.)

**Environment Validation:**
- Startup validation ensures required environment variables are set
- Production mode requires JWT_SECRET, COOKIE_SECRET, CORS_ORIGINS, and all URLs

**External IdP Federation:**
- Google OAuth 2.0 integration available
- Federated identities support account linking pattern

## Key Files

- `apps/idp/src/services/jwt.ts` - Token generation/verification (with nonce support)
- `apps/idp/src/services/pkce.ts` - PKCE validation
- `apps/idp/src/services/session.ts` - SSO session management
- `apps/idp/src/services/cleanup.ts` - Expired data cleanup job
- `apps/idp/src/config/validate.ts` - Environment variable validation
- `apps/idp/src/middleware/auth.ts` - Authentication middleware
- `apps/idp/src/constants.ts` - Configuration constants
- `packages/auth-client/src/oauth.ts` - Client OAuth helpers
- `packages/auth-client/src/pkce.ts` - PKCE generation
- `apps/app-*/src/context/AuthContext.tsx` - React auth state
- `apps/app-*/src/pages/Callback.tsx` - OAuth callback handler
- `apps/app-*/src/pages/Settings.tsx` - Profile editing & password management

## Environment Variables

### IdP Required Variables
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT token signing (HS256)
- `COOKIE_SECRET` - Secret for session cookie encryption
- `IDP_URL` - IdP base URL (e.g., http://localhost:3000)
- `APP_A_URL` - TaskFlow client URL
- `APP_B_URL` - DocVault client URL

### IdP Optional Variables
- `CORS_ORIGINS` - Comma-separated list of allowed origins (required in production, defaults to APP_A_URL and APP_B_URL in development)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID for Google Sign-In
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

### Client App Variables (Vite)
- `VITE_IDP_URL` - IdP URL for OAuth flows
- `VITE_APP_URL` - Current app's URL
- `VITE_OTHER_APP_URL` - Other app's URL (for cross-app SSO demo)

## Railway Deployment

### Live URLs
- **IdP**: https://idp-fed.up.railway.app
- **TaskFlow (app-a)**: https://a-app.up.railway.app
- **DocVault (app-b)**: https://b-app.up.railway.app
- **Dashboard**: https://railway.com/project/c2bea5d9-e113-494c-802e-581a9f1c9fe0

### Deployment Architecture
This is a "Shared Monorepo" deployment - all services share the root `package.json` and build context.

**Key Configuration:**
- Do NOT set Root Directory for any service (keep at repo root)
- Use `RAILWAY_DOCKERFILE_PATH` env var to specify each service's Dockerfile

### Service Environment Variables

**IdP Service:**
```
RAILWAY_DOCKERFILE_PATH=apps/idp/Dockerfile
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<production-secret>
COOKIE_SECRET=<production-secret>
NODE_ENV=production
IDP_URL=https://idp-fed.up.railway.app
APP_A_URL=https://a-app.up.railway.app
APP_B_URL=https://b-app.up.railway.app
CORS_ORIGINS=https://a-app.up.railway.app,https://b-app.up.railway.app
```

**App-A Service:**
```
RAILWAY_DOCKERFILE_PATH=apps/app-a/Dockerfile
VITE_IDP_URL=https://idp-fed.up.railway.app
VITE_APP_URL=https://a-app.up.railway.app
VITE_OTHER_APP_URL=https://b-app.up.railway.app
```

**App-B Service:**
```
RAILWAY_DOCKERFILE_PATH=apps/app-b/Dockerfile
VITE_IDP_URL=https://idp-fed.up.railway.app
VITE_APP_URL=https://b-app.up.railway.app
VITE_OTHER_APP_URL=https://a-app.up.railway.app
```

### Deployment Commands
```bash
# Deploy via Railway CLI (from repo root)
railway up --service idp
railway up --service app-a
railway up --service app-b

# Or use Railway MCP tools
mcp__Railway__deploy --service idp
```

### Local Development with Railway Database
The local `.env` files are configured to use the Railway PostgreSQL database.
This allows sharing data between local development and production (requires DATABASE_URL env var).

```bash
# Start local development (uses Railway PostgreSQL)
pnpm dev
```

### Dockerfiles
Each service has its own Dockerfile that expects repo root as build context:
- `apps/idp/Dockerfile` - Node.js server with tsx
- `apps/app-a/Dockerfile` - Multi-stage build: Vite → nginx
- `apps/app-b/Dockerfile` - Multi-stage build: Vite → nginx

Frontend apps use Docker ARG for build-time env vars (VITE_* variables).
