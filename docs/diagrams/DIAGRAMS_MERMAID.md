# SSO Διαγράμματα (Mermaid)

Τα παρακάτω διαγράμματα εμφανίζονται αυτόματα στο GitHub και VS Code.

---

## 1. Αρχιτεκτονική SSO

```mermaid
flowchart TB
    subgraph Browser["Browser (User)"]
        U[User]
    end

    subgraph Apps["Client Applications"]
        A[App A<br/>TaskFlow<br/>:3001]
        B[App B<br/>DocVault<br/>:3002]
    end

    subgraph IdP["Identity Provider"]
        IDP[Local IdP<br/>Broker<br/>:3000]
        DB[(SQLite DB<br/>Users, Sessions<br/>Tokens)]
    end

    subgraph External["External Provider"]
        KC[Keycloak<br/>University]
    end

    U --> A
    U --> B
    A -->|OAuth 2.0 + PKCE| IDP
    B -->|OAuth 2.0 + PKCE| IDP
    IDP -->|Federation| KC
    IDP --> DB

    style A fill:#b2f2bb,stroke:#2f9e44
    style B fill:#ffc9c9,stroke:#e8590c
    style IDP fill:#eebefa,stroke:#9c36b5
    style KC fill:#74c0fc,stroke:#1864ab
    style DB fill:#dee2e6,stroke:#495057
```

---

## 2. Πρώτη Σύνδεση (Local IdP)

```mermaid
sequenceDiagram
    participant U as Browser
    participant A as App A
    participant IDP as IdP

    U->>A: 1. Visit App (no token)

    Note over A: Generate PKCE<br/>code_verifier + code_challenge

    A->>U: 2. Redirect to IdP
    U->>IDP: 3. GET /authorize<br/>+ code_challenge + state

    Note over IDP: No session found

    IDP->>U: 4. Show Login Page
    U->>IDP: 5. POST credentials

    Note over IDP: Validate credentials<br/>Create session<br/>Set session_id cookie

    IDP->>U: 6. Redirect with auth code
    U->>A: 7. Callback with code + state

    Note over A: Verify state parameter

    A->>IDP: 8. POST /token<br/>+ code + code_verifier

    Note over IDP: Verify PKCE:<br/>SHA256(verifier) == challenge

    IDP->>A: 9. Tokens (access, id, refresh)

    Note over A: Store tokens in localStorage

    A->>U: 10. Authenticated!
```

---

## 3. SSO Auto-Login (App B μετά από App A)

```mermaid
sequenceDiagram
    participant U as Browser
    participant B as App B
    participant IDP as IdP

    Note over U: Already logged in to App A<br/>Has session_id cookie for IdP

    U->>B: 1. Visit App B (no token)

    Note over B: Generate PKCE

    B->>U: 2. Redirect to IdP
    U->>IDP: 3. GET /authorize<br/>+ session_id cookie (automatic!)

    Note over IDP: Session found!<br/>User already authenticated<br/>NO LOGIN NEEDED

    IDP->>U: 4. Immediate redirect with auth code
    U->>B: 5. Callback with code
    B->>IDP: 6. POST /token + code_verifier
    IDP->>B: 7. Tokens
    B->>U: 8. Authenticated!<br/>(User never saw login page)

    Note over U,IDP: SSO Magic: Same session_id cookie<br/>sent to IdP from any app!
```

---

## 4. Keycloak Federation Flow

```mermaid
sequenceDiagram
    participant U as Browser
    participant A as App
    participant IDP as Local IdP
    participant KC as Keycloak

    U->>A: 1. Click "Sign in with Keycloak"

    Note over A: Generate PKCE #1<br/>(App ↔ IdP)

    A->>U: 2. Redirect to IdP federation
    U->>IDP: 3. GET /auth/federated/keycloak/start<br/>+ PKCE #1 challenge

    Note over IDP: Validate client<br/>Generate PKCE #2<br/>(IdP ↔ Keycloak)<br/>Store state in cookie

    IDP->>U: 4. Redirect to Keycloak
    U->>KC: 5. GET Keycloak /auth<br/>+ PKCE #2 challenge
    KC->>U: 6. University Login Page
    U->>KC: 7. Enter university credentials

    Note over KC: Authenticate user

    KC->>U: 8. Redirect with KC auth code
    U->>IDP: 9. GET /federated/keycloak/callback

    IDP->>KC: 10. Exchange KC code<br/>+ PKCE #2 verifier
    KC->>IDP: 11. KC Tokens + UserInfo

    Note over IDP: Create/link local user<br/>Create IdP session<br/>Generate new auth code

    IDP->>U: 12. Redirect to App<br/>+ new auth code
    U->>A: 13. Callback with code
    A->>IDP: 14. Exchange code<br/>+ PKCE #1 verifier
    IDP->>A: 15. IdP Tokens
    A->>U: 16. Authenticated!
```

---

## 5. Token Refresh Flow

```mermaid
sequenceDiagram
    participant A as App
    participant IDP as IdP

    Note over A: Every 30 seconds:<br/>Check token expiration

    alt Token expires in < 60s
        A->>IDP: POST /token<br/>grant_type=refresh_token<br/>refresh_token=xxx

        Note over IDP: Validate refresh token<br/>Generate new tokens<br/>Rotate refresh token

        IDP->>A: New tokens<br/>(access + refresh + id)

        Note over A: Update localStorage
    else Token still valid
        Note over A: Do nothing
    end
```

---

## 6. Logout Flow

```mermaid
sequenceDiagram
    participant U as Browser
    participant A as App
    participant IDP as IdP

    U->>A: 1. Click Logout
    A->>IDP: 2. POST /logout<br/>+ refresh_token

    Note over IDP: Revoke refresh token<br/>Delete session

    IDP->>A: 3. Success

    Note over A: Clear localStorage<br/>(access, refresh, id tokens)

    A->>U: 4. Logged out

    Note over U: Other apps may still<br/>have valid tokens until<br/>they expire (5 min)
```

---

## 7. PKCE Flow Detail

```mermaid
flowchart LR
    subgraph Client["Client (App)"]
        V[code_verifier<br/>random 32 bytes]
        C[code_challenge<br/>SHA256 of verifier]
    end

    subgraph Auth["Authorization"]
        REQ["/authorize request<br/>sends challenge only"]
    end

    subgraph Token["Token Exchange"]
        TOK["/token request<br/>sends verifier"]
        VER{Server verifies:<br/>SHA256 verifier<br/>== stored challenge}
    end

    V -->|SHA256| C
    C --> REQ
    V --> TOK
    TOK --> VER

    VER -->|Match| OK[Tokens Issued]
    VER -->|No Match| FAIL[Rejected]

    style V fill:#ffc9c9
    style C fill:#b2f2bb
    style OK fill:#b2f2bb
    style FAIL fill:#ffc9c9
```

---

## 8. Database Schema

```mermaid
erDiagram
    users ||--o{ sessions : has
    users ||--o{ refresh_tokens : has
    users ||--o{ federated_identities : has
    users ||--o{ authorization_codes : has
    oauth_clients ||--o{ authorization_codes : issues
    oauth_clients ||--o{ refresh_tokens : issues

    users {
        text id PK
        text email UK
        text password_hash
        text name
        timestamp created_at
    }

    oauth_clients {
        text id PK
        text secret
        text name
        text redirect_uris
        timestamp created_at
    }

    sessions {
        text id PK
        text user_id FK
        timestamp expires_at
    }

    authorization_codes {
        text code PK
        text client_id FK
        text user_id FK
        text code_challenge
        text redirect_uri
        timestamp expires_at
    }

    refresh_tokens {
        text token PK
        text user_id FK
        text client_id FK
        text scope
        timestamp expires_at
    }

    federated_identities {
        text id PK
        text user_id FK
        text provider
        text provider_sub
        text email
        timestamp created_at
    }
```
