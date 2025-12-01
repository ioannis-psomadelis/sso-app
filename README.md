# SSO App

A full-stack monorepo implementing Single Sign-On (SSO) using OAuth 2.0 Authorization Code Flow with PKCE. Built for university thesis demonstration of modern authentication patterns.

## Features

- **Custom Identity Provider (IdP)** with OIDC-lite implementation
- **Two client applications** (TaskFlow & DocVault) sharing SSO session
- **Real-time debug panel** showing tokens, PKCE, and auth flow
- **Access Token + Refresh Token + ID Token** (OIDC-lite)
- **Beautiful UI** with light/dark theme support
- **Split-screen layout** for educational visibility

## Tech Stack

| Layer | Technology |
|-------|------------|
| Monorepo | Turborepo + pnpm |
| Backend | Node.js + Fastify |
| Frontend | React + Vite |
| UI Components | Shadcn/ui style |
| Database | SQLite + Drizzle ORM |
| Auth | OAuth 2.0 + PKCE + JWT |

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up database and seed demo data
pnpm --filter @repo/db db:push
pnpm --filter @repo/db db:seed

# Start all services
pnpm dev
```

## Services

| Service | URL | Description |
|---------|-----|-------------|
| IdP | http://localhost:3000 | Identity Provider (OAuth server) |
| TaskFlow | http://localhost:3001 | Client App A (task management) |
| DocVault | http://localhost:3002 | Client App B (document management) |

## Demo Credentials

- **Email:** `demo@example.com`
- **Password:** `password123`

## How to Demo SSO

1. Open **TaskFlow** at http://localhost:3001
2. Click "Sign in with SSO"
3. Enter demo credentials at the IdP login
4. Observe the debug panel showing the auth flow
5. Once logged in, click "Visit DocVault"
6. **Magic!** You're already logged in without entering credentials again

## Project Structure

```
sso-app/
├── apps/
│   ├── idp/           # Identity Provider (Fastify)
│   ├── app-a/         # TaskFlow client (React)
│   └── app-b/         # DocVault client (React)
├── packages/
│   ├── ui/            # Shared components + theme
│   ├── auth-client/   # PKCE + token logic
│   └── db/            # Drizzle schema + SQLite
└── docs/
    └── plans/         # Design documentation
```

## Auth Flow (OAuth 2.0 + PKCE)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  1. User visits App A → Not logged in                        │
│                                                              │
│  2. App generates PKCE (code_verifier + code_challenge)      │
│                                                              │
│  3. Redirect to IdP /authorize?                              │
│     - client_id=app-a                                        │
│     - code_challenge=xxx                                     │
│     - code_challenge_method=S256                             │
│                                                              │
│  4. IdP shows login → User authenticates                     │
│                                                              │
│  5. IdP redirects back with authorization code               │
│                                                              │
│  6. App exchanges code for tokens (with code_verifier)       │
│                                                              │
│  7. IdP validates PKCE and returns:                          │
│     - Access Token (15 min)                                  │
│     - ID Token (user info)                                   │
│     - Refresh Token (7 days)                                 │
│                                                              │
│  8. User visits App B → IdP recognizes session               │
│     → Auto-redirects with code → Instant login!              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Token Types

### Access Token (15 min expiry)
Used to access protected resources. Contains:
- `sub`: User ID
- `aud`: Client ID (which app)
- `scope`: Permissions

### ID Token
Contains user identity information:
- `sub`: User ID
- `email`: User email
- `name`: Display name

### Refresh Token (7 days expiry)
Opaque token used to obtain new access tokens without re-authentication.

## Debug Panel

The right side of each app shows a real-time debug panel with:
- Auth flow timeline with timestamps
- Decoded JWT tokens (header + payload)
- Access token expiry countdown
- PKCE values used in the flow

## Development

```bash
# Run individual services
pnpm --filter @repo/idp dev
pnpm --filter @repo/app-a dev
pnpm --filter @repo/app-b dev

# Database operations
pnpm --filter @repo/db db:push   # Push schema changes
pnpm --filter @repo/db db:seed   # Seed demo data
pnpm --filter @repo/db db:studio # Open Drizzle Studio
```

## License

MIT - Educational use
