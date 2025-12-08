# Τεχνική Υλοποίηση SSO Demo

## Διαγράμματα

### Mermaid (auto-render)
Βλέπε **[DIAGRAMS_MERMAID.md](diagrams/DIAGRAMS_MERMAID.md)** - renders στο GitHub/VS Code.

### Excalidraw (editable)
- `01-sso-architecture.excalidraw` - Αρχιτεκτονική
- `02-first-login-flow.excalidraw` - Ροή πρώτης σύνδεσης
- `03-sso-auto-login.excalidraw` - SSO αυτόματη σύνδεση
- `04-google-federation.excalidraw` - Google OAuth 2.0 federation

---

## Δομή Project

```
sso-app/
├── apps/
│   ├── idp/                 # Identity Provider (Fastify)
│   │   ├── src/
│   │   │   ├── index.ts           # Entry point
│   │   │   ├── routes/
│   │   │   │   ├── authorize.ts   # OAuth authorization
│   │   │   │   ├── token.ts       # Token exchange
│   │   │   │   ├── logout.ts      # Session termination
│   │   │   │   ├── federated.ts   # Google OAuth 2.0 federation
│   │   │   │   └── api/
│   │   │   │       ├── tasks.ts     # Protected tasks API
│   │   │   │       ├── documents.ts # Protected documents API
│   │   │   │       └── profile.ts   # User profile API (GET/PATCH)
│   │   │   └── services/
│   │   │       ├── session.ts     # Session management
│   │   │       └── jwt.ts         # Token signing
│   │   └── .env                   # Google OAuth config
│   │
│   ├── app-a/               # TaskFlow (React + Vite)
│   │   └── src/
│   │       ├── context/
│   │       │   └── AuthContext.tsx   # Auth state
│   │       └── pages/
│   │           ├── Home.tsx          # Main page
│   │           ├── Callback.tsx      # OAuth callback
│   │           └── Settings.tsx      # Token viewer
│   │
│   └── app-b/               # DocVault (React + Vite)
│       └── src/             # Ίδια δομή με app-a
│
├── packages/
│   ├── auth-client/         # Shared auth utilities
│   │   └── src/
│   │       ├── pkce.ts            # PKCE generation
│   │       ├── tokens.ts          # Token storage
│   │       ├── oauth.ts           # State management
│   │       ├── api.ts             # API client
│   │       └── debug.ts           # Event logging
│   │
│   ├── db/                  # Database (Drizzle + PostgreSQL)
│   │   └── src/
│   │       └── schema.ts          # Tables definition
│   │
│   └── ui/                  # Shared UI components
│       └── src/components/
```

---

## 1. Identity Provider (IdP)

### 1.1 OAuth Authorization Endpoint

**Αρχείο**: `apps/idp/src/routes/authorize.ts`

```typescript
// GET /authorize
// Δέχεται OAuth authorization requests

interface AuthorizeParams {
  client_id: string;        // 'app-a' ή 'app-b'
  redirect_uri: string;     // callback URL
  response_type: 'code';    // authorization code flow
  scope: string;            // 'openid profile email'
  code_challenge: string;   // PKCE challenge
  code_challenge_method: 'S256';
  state?: string;           // CSRF protection
}
```

**Ροή Λειτουργίας**:

```
┌─────────────────────────────────────────────────────────────┐
│                    /authorize endpoint                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Validate client_id exists in database                   │
│     → SELECT * FROM oauth_clients WHERE id = ?              │
│                                                              │
│  2. Validate redirect_uri is registered                     │
│     → client.redirectUris.includes(redirect_uri)            │
│                                                              │
│  3. Check for existing session                              │
│     → cookies['session_id']                                  │
│     → SELECT * FROM sessions WHERE id = ?                   │
│                                                              │
│  4a. If valid session exists:                               │
│      → Generate authorization code                          │
│      → Store code with PKCE data                            │
│      → Redirect to callback with code                       │
│                                                              │
│  4b. If no session:                                         │
│      → Store request params in cookie                       │
│      → Show login page                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Token Endpoint

**Αρχείο**: `apps/idp/src/routes/token.ts`

```typescript
// POST /token
// Ανταλλαγή code → tokens

// Grant Type: authorization_code
interface TokenRequest {
  grant_type: 'authorization_code';
  code: string;
  code_verifier: string;    // PKCE verifier
  client_id: string;
  redirect_uri: string;
}

// Grant Type: refresh_token
interface RefreshRequest {
  grant_type: 'refresh_token';
  refresh_token: string;
  client_id: string;
}
```

**Ροή Token Exchange**:

```
┌─────────────────────────────────────────────────────────────┐
│                    /token endpoint                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Authorization Code Flow:                                    │
│  ─────────────────────────                                   │
│  1. Find code in database                                   │
│     → SELECT * FROM authorization_codes WHERE code = ?      │
│                                                              │
│  2. Verify PKCE                                             │
│     → SHA256(code_verifier) === stored_code_challenge       │
│                                                              │
│  3. Verify not expired (10 minutes)                         │
│     → code.expiresAt > now                                  │
│                                                              │
│  4. Delete used code (one-time use)                         │
│     → DELETE FROM authorization_codes WHERE code = ?        │
│                                                              │
│  5. Generate tokens:                                        │
│     → access_token  (JWT, 5 min)                            │
│     → refresh_token (opaque, 24h)                           │
│     → id_token      (JWT with user claims)                  │
│                                                              │
│  6. Store refresh_token                                     │
│     → INSERT INTO refresh_tokens (...)                      │
│                                                              │
│  7. Return tokens                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Federation Endpoint (Google OAuth 2.0)

**Αρχείο**: `apps/idp/src/routes/federated.ts`

```typescript
// Configuration
const GOOGLE_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  // Google OAuth endpoints
  authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userinfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
};
```

**Federation State (Cookie)**:

```typescript
interface FederationState {
  client_id: string;           // Original app's client_id
  redirect_uri: string;        // Original app's callback
  code_challenge: string;      // Original PKCE challenge
  code_challenge_method: string;
  state?: string;              // Original state
  scope: string;
  pkceVerifier: string;        // NEW PKCE for Google
}
```

**Ροή Federation**:

```
┌─────────────────────────────────────────────────────────────┐
│           /auth/federated/google/start                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Validate client and redirect_uri                        │
│                                                              │
│  2. Generate NEW PKCE for IdP → Google                      │
│     const pkce = generatePKCE()                             │
│                                                              │
│  3. Store federation state in HTTP-only cookie              │
│     → Expires in 10 minutes                                 │
│     → Contains original request + new PKCE verifier         │
│                                                              │
│  4. Redirect to Google:                                     │
│     https://accounts.google.com/o/oauth2/v2/auth            │
│     ?client_id=your-client-id                               │
│     &redirect_uri=http://localhost:3000/.../callback        │
│     &code_challenge=NEW_CHALLENGE                           │
│     &response_type=code                                     │
│     &scope=openid email profile                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│           /auth/federated/google/callback                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Read federation state from cookie                       │
│                                                              │
│  2. Exchange Google code for tokens                         │
│     POST https://oauth2.googleapis.com/token                │
│     → code + code_verifier (from federation state)          │
│                                                              │
│  3. Fetch user info from Google                             │
│     GET https://www.googleapis.com/oauth2/v2/userinfo       │
│     → Authorization: Bearer {access_token}                  │
│                                                              │
│  4. Create or find local user                               │
│     → Match by email                                        │
│     → Create if not exists                                  │
│                                                              │
│  5. Link federated identity                                 │
│     → INSERT INTO federated_identities                      │
│       (userId, provider='google', providerSub)              │
│                                                              │
│  6. Create IdP session                                      │
│     → session_id cookie                                     │
│                                                              │
│  7. Generate authorization code for original app            │
│     → Use ORIGINAL PKCE from federation state               │
│                                                              │
│  8. Redirect to original app's callback                     │
│     → original_redirect_uri?code=XXX&state=YYY              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Client Applications (React)

### 2.1 Auth Context

**Αρχείο**: `apps/app-a/src/context/AuthContext.tsx`

```typescript
interface AuthContextType {
  user: User | null;
  tokens: {
    accessToken: string | null;
    refreshToken: string | null;
    idToken: string | null;
  };
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;              // Local IdP
  loginWithGoogle: () => void;    // Google Federation
  logout: () => Promise<void>;
  handleCallback: (code: string, state: string) => Promise<void>;
}
```

### 2.2 Login Flow Implementation

```typescript
const login = useCallback(async () => {
  // 1. Generate PKCE
  const pkce = await generatePKCE();
  storeCodeVerifier(pkce.codeVerifier);  // localStorage

  // 2. Generate state for CSRF protection
  const state = crypto.randomUUID();
  storeAuthState('local', state);  // localStorage

  // 3. Build authorization URL
  const url = new URL('/authorize', IDP_URL);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid profile email');
  url.searchParams.set('code_challenge', pkce.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);

  // 4. Redirect
  window.location.href = url.toString();
}, []);
```

### 2.3 Callback Handler

```typescript
const handleCallback = useCallback(async (code: string, state: string) => {
  // 1. Verify state
  const authState = getAuthState();
  if (!authState || authState.state !== state) {
    throw new Error('Invalid state parameter');
  }

  // 2. Get PKCE verifier
  const codeVerifier = getCodeVerifier();
  if (!codeVerifier) {
    throw new Error('No code verifier found');
  }

  // 3. Exchange code for tokens
  const response = await fetch(`${IDP_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const tokenResponse = await response.json();

  // 4. Clean up and store
  clearCodeVerifier();
  clearAuthState();
  storeTokens({
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    idToken: tokenResponse.id_token,
  });

  // 5. Decode and set user
  const decodedId = decodeToken(tokenResponse.id_token);
  setUser({
    sub: decodedId.payload.sub,
    email: decodedId.payload.email,
    name: decodedId.payload.name,
  });
}, []);
```

### 2.4 Token Refresh

```typescript
useEffect(() => {
  const checkAndRefreshToken = async () => {
    if (!tokens.accessToken || !tokens.refreshToken) return;

    // Check expiration
    const decoded = decodeToken(tokens.accessToken);
    const exp = decoded.payload.exp as number;
    const secondsLeft = Math.floor((exp * 1000 - Date.now()) / 1000);

    // Refresh if expiring in < 60 seconds
    if (secondsLeft <= 60 && secondsLeft > 0) {
      const response = await fetch(`${IDP_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: tokens.refreshToken,
          client_id: CLIENT_ID,
        }),
      });

      const newTokens = await response.json();
      storeTokens(newTokens);
      setTokens(newTokens);
    }
  };

  // Check every 30 seconds
  const interval = setInterval(checkAndRefreshToken, 30000);
  checkAndRefreshToken();

  return () => clearInterval(interval);
}, [tokens.accessToken, tokens.refreshToken]);
```

---

## 3. Shared Auth Client Package

### 3.1 PKCE Generation

**Αρχείο**: `packages/auth-client/src/pkce.ts`

```typescript
export async function generatePKCE(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  // Generate 32 random bytes
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);

  // Base64URL encode
  const codeVerifier = base64URLEncode(array);

  // SHA-256 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);

  // Base64URL encode the hash
  const codeChallenge = base64URLEncode(new Uint8Array(digest));

  return { codeVerifier, codeChallenge };
}
```

### 3.2 Token Storage

**Αρχείο**: `packages/auth-client/src/tokens.ts`

```typescript
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'sso_access_token',
  REFRESH_TOKEN: 'sso_refresh_token',
  ID_TOKEN: 'sso_id_token',
};

export function storeTokens(tokens: Tokens): void {
  if (tokens.accessToken) {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
  }
  if (tokens.refreshToken) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
  }
  if (tokens.idToken) {
    localStorage.setItem(STORAGE_KEYS.ID_TOKEN, tokens.idToken);
  }
}

export function getStoredTokens(): Tokens {
  return {
    accessToken: localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
    refreshToken: localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
    idToken: localStorage.getItem(STORAGE_KEYS.ID_TOKEN),
  };
}

export function clearTokens(): void {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.ID_TOKEN);
}
```

### 3.3 JWT Decoding (Client-side)

```typescript
export function decodeToken(token: string): DecodedToken {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const header = JSON.parse(atob(parts[0]));
  const payload = JSON.parse(atob(parts[1]));

  return { header, payload };
}
```

---

## 4. Database Schema

**Αρχείο**: `packages/db/src/schema.ts`

```typescript
// Users table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// OAuth Clients (registered apps)
export const oauthClients = pgTable('oauth_clients', {
  id: text('id').primaryKey(),           // 'app-a', 'app-b'
  secret: text('secret'),                 // For confidential clients
  name: text('name').notNull(),
  redirectUris: text('redirect_uris').notNull(), // JSON array
  createdAt: timestamp('created_at').defaultNow(),
});

// Authorization Codes (temporary, 10 min)
export const authorizationCodes = pgTable('authorization_codes', {
  code: text('code').primaryKey(),
  clientId: text('client_id').notNull(),
  userId: text('user_id').notNull(),
  codeChallenge: text('code_challenge').notNull(),
  codeChallengeMethod: text('code_challenge_method').notNull(),
  scope: text('scope'),
  redirectUri: text('redirect_uri').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

// Refresh Tokens
export const refreshTokens = pgTable('refresh_tokens', {
  token: text('token').primaryKey(),
  userId: text('user_id').notNull(),
  clientId: text('client_id').notNull(),
  scope: text('scope'),
  expiresAt: timestamp('expires_at').notNull(),
});

// Sessions (for SSO)
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

// Federated Identities (Google linking)
export const federatedIdentities = pgTable('federated_identities', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  provider: text('provider').notNull(),        // 'google'
  providerSub: text('provider_sub').notNull(), // Google user ID
  email: text('email'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## 5. JWT Token Structure

### Access Token

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-uuid",
    "iss": "http://localhost:3000",
    "aud": "app-a",
    "exp": 1234567890,
    "iat": 1234567590,
    "scope": "openid profile email"
  }
}
```

### ID Token

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-uuid",
    "iss": "http://localhost:3000",
    "aud": "app-a",
    "exp": 1234567890,
    "iat": 1234567590,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

---

## 6. Environment Configuration

### IdP (.env)

```bash
# Google OAuth 2.0 Federation
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### App Configuration

```typescript
// apps/app-a/src/context/AuthContext.tsx
const IDP_URL = 'http://localhost:3000';
const CLIENT_ID = 'app-a';
const REDIRECT_URI = 'http://localhost:3001/callback';

// apps/app-b/src/context/AuthContext.tsx
const IDP_URL = 'http://localhost:3000';
const CLIENT_ID = 'app-b';
const REDIRECT_URI = 'http://localhost:3002/callback';
```

---

## 7. Εκτέλεση

```bash
# 1. Install dependencies
pnpm install

# 2. Initialize database (requires DATABASE_URL env var)
pnpm db:push
pnpm db:seed

# 3. Start all apps
pnpm dev

# Apps:
# - IdP:      http://localhost:3000
# - TaskFlow: http://localhost:3001
# - DocVault: http://localhost:3002
```

---

## 8. Διάγραμμα Βάσης Δεδομένων

```
┌─────────────────┐       ┌─────────────────────┐
│     users       │       │   oauth_clients     │
├─────────────────┤       ├─────────────────────┤
│ id (PK)         │       │ id (PK)             │
│ email           │       │ secret              │
│ password_hash   │       │ name                │
│ name            │       │ redirect_uris       │
│ created_at      │       │ created_at          │
└────────┬────────┘       └──────────┬──────────┘
         │                           │
         │    ┌──────────────────────┼────────────────┐
         │    │                      │                │
         ▼    ▼                      ▼                ▼
┌─────────────────────┐   ┌───────────────────┐  ┌─────────────────┐
│ authorization_codes │   │  refresh_tokens   │  │    sessions     │
├─────────────────────┤   ├───────────────────┤  ├─────────────────┤
│ code (PK)           │   │ token (PK)        │  │ id (PK)         │
│ client_id (FK)      │   │ user_id (FK)      │  │ user_id (FK)    │
│ user_id (FK)        │   │ client_id (FK)    │  │ expires_at      │
│ code_challenge      │   │ scope             │  └─────────────────┘
│ redirect_uri        │   │ expires_at        │
│ expires_at          │   └───────────────────┘
└─────────────────────┘
         │
         │
         ▼
┌─────────────────────────┐
│  federated_identities   │
├─────────────────────────┤
│ id (PK)                 │
│ user_id (FK → users)    │
│ provider                │
│ provider_sub            │
│ email                   │
│ created_at              │
└─────────────────────────┘
```

---

## 9. Profile API

### GET /api/profile

**Αρχείο**: `apps/idp/src/routes/api/profile.ts`

Επιστρέφει το προφίλ του τρέχοντος χρήστη.

```typescript
// Request
GET /api/profile
Authorization: Bearer {access_token}

// Response
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "hasLocalPassword": true  // false για OAuth-only χρήστες
  }
}
```

### PATCH /api/profile

Ενημερώνει το προφίλ του χρήστη (όνομα, email, κωδικό).

```typescript
// Request - Ενημέρωση ονόματος/email
PATCH /api/profile
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "New Name",
  "email": "new@example.com"
}

// Request - Αλλαγή κωδικού (για χρήστες με τοπικό κωδικό)
{
  "currentPassword": "oldPassword123",
  "newPassword": "NewPassword123"
}

// Request - Ορισμός κωδικού για OAuth χρήστες
// (δεν απαιτείται currentPassword)
{
  "newPassword": "NewPassword123"
}

// Response
{
  "user": {
    "id": "user-uuid",
    "email": "new@example.com",
    "name": "New Name",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Απαιτήσεις κωδικού**:
- Ελάχιστο 10 χαρακτήρες
- Τουλάχιστον ένα κεφαλαίο γράμμα
- Τουλάχιστον ένα μικρό γράμμα
- Τουλάχιστον ένας αριθμός

---

## 10. Account Linking

Οι χρήστες που εγγράφονται μέσω Google OAuth δημιουργούνται με:
```typescript
passwordHash: 'OAUTH_USER_NO_LOCAL_PASSWORD'
```

Αυτό τους επιτρέπει να:
1. Συνδεθούν μέσω Google OAuth
2. Ορίσουν τοπικό κωδικό (χωρίς να απαιτείται τρέχων κωδικός)
3. Χρησιμοποιούν και τις δύο μεθόδους σύνδεσης

**Ροή Account Linking**:

```
┌─────────────────────────────────────────────────────────────┐
│                    Account Linking                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Χρήστης εγγράφεται με Google OAuth                      │
│     → passwordHash = 'OAUTH_USER_NO_LOCAL_PASSWORD'         │
│     → hasLocalPassword = false                              │
│                                                              │
│  2. Στο Settings, εμφανίζεται "Set Local Password"          │
│                                                              │
│  3. Χρήστης ορίζει νέο κωδικό                               │
│     → PATCH /api/profile { newPassword: "xxx" }             │
│     → Δεν απαιτείται currentPassword                        │
│                                                              │
│  4. passwordHash ενημερώνεται με bcrypt hash                │
│     → hasLocalPassword = true                               │
│                                                              │
│  5. Χρήστης μπορεί να συνδεθεί με:                          │
│     → Google OAuth                                          │
│     → Email + Password                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Συμπέρασμα

Η υλοποίηση ακολουθεί τα πρότυπα:

- **OAuth 2.0** με Authorization Code Flow
- **PKCE** για ασφάλεια public clients
- **OpenID Connect** για identity tokens
- **Federation/Broker Pattern** για εξωτερικούς providers (Google OAuth 2.0)

Ο κώδικας είναι οργανωμένος σε monorepo με shared packages για επαναχρησιμοποίηση μεταξύ εφαρμογών.
