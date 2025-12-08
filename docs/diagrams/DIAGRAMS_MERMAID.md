# SSO Διαγράμματα (Mermaid)

---

## 1. Αρχιτεκτονική SSO

```mermaid
flowchart TB
    subgraph USER["BROWSER"]
        U["User"]
    end

    subgraph APPS["CLIENT APPS"]
        direction LR
        A["App A<br/><b>TaskFlow</b><br/>localhost:3001"]
        B["App B<br/><b>DocVault</b><br/>localhost:3002"]
    end

    subgraph IDP_LAYER["IDENTITY LAYER"]
        IDP["Local IdP<br/><b>Auth Broker</b><br/>localhost:3000"]
        DB[("PostgreSQL<br/>Users | Sessions<br/>Tokens")]
    end

    subgraph EXTERNAL["EXTERNAL"]
        GG["Google<br/><b>OAuth 2.0</b>"]
    end

    U ==>|"visits"| A
    U ==>|"visits"| B
    A <-->|"OAuth 2.0<br/>+ PKCE"| IDP
    B <-->|"OAuth 2.0<br/>+ PKCE"| IDP
    IDP <-->|"Federation"| GG
    IDP <-->|"Store"| DB

    style U fill:#E3F2FD,stroke:#1976D2,stroke-width:2px,color:#1976D2
    style A fill:#E8F5E9,stroke:#388E3C,stroke-width:3px,color:#1B5E20
    style B fill:#FFF3E0,stroke:#F57C00,stroke-width:3px,color:#E65100
    style IDP fill:#F3E5F5,stroke:#7B1FA2,stroke-width:3px,color:#4A148C
    style GG fill:#E3F2FD,stroke:#1565C0,stroke-width:3px,color:#0D47A1
    style DB fill:#ECEFF1,stroke:#546E7A,stroke-width:2px,color:#37474F
```

---

## 2. Πρώτη Σύνδεση (Local IdP)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'actorTextColor': '#1a1a1a', 'signalTextColor': '#1a1a1a', 'noteTextColor': '#1a1a1a', 'noteBkgColor': '#fff9c4', 'actorBkg': '#e3f2fd', 'actorBorder': '#1565c0' }}}%%
sequenceDiagram
    autonumber

    participant U as Browser
    participant A as App A
    participant IDP as IdP

    rect rgb(144, 202, 249)
        Note over U,A: User wants to login
        U->>+A: Visit App (no token)
    end

    rect rgb(165, 214, 167)
        Note over A: Generate PKCE<br/>verifier + challenge
        A-->>-U: Redirect to IdP
    end

    rect rgb(206, 147, 216)
        U->>+IDP: GET /authorize<br/>code_challenge + state
        Note over IDP: No session found
        IDP-->>U: Login Page
        U->>IDP: POST credentials
        Note over IDP: Validate credentials<br/>Create session cookie
        IDP-->>-U: Redirect + auth code
    end

    rect rgb(165, 214, 167)
        U->>+A: Callback + code
        Note over A: Verify state
        A->>+IDP: POST /token<br/>code + verifier
        Note over IDP: PKCE Check<br/>SHA256(verifier) = challenge
        IDP-->>-A: Tokens
        Note over A: Store in localStorage
        A-->>-U: Authenticated!
    end
```

---

## 3. SSO Auto-Login (Το "Μαγικό" του SSO)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'actorTextColor': '#1a1a1a', 'signalTextColor': '#1a1a1a', 'noteTextColor': '#1a1a1a', 'noteBkgColor': '#fff9c4', 'actorBkg': '#fff3e0', 'actorBorder': '#e65100' }}}%%
sequenceDiagram
    autonumber

    participant U as Browser<br/>has session cookie
    participant B as App B
    participant IDP as IdP

    rect rgb(255, 183, 77)
        Note over U: Already logged in to App A<br/>Has session_id cookie for IdP
    end

    rect rgb(255, 183, 77)
        U->>+B: Visit App B (no token)
        Note over B: Generate PKCE
        B-->>-U: Redirect to IdP
    end

    rect rgb(206, 147, 216)
        U->>+IDP: GET /authorize<br/>session_id cookie (auto!)

        Note over IDP: Session Found!<br/>User already authenticated<br/>NO LOGIN NEEDED!

        IDP-->>-U: IMMEDIATE redirect<br/>+ auth code
    end

    rect rgb(255, 183, 77)
        U->>+B: Callback + code
        B->>+IDP: POST /token
        IDP-->>-B: Tokens
        B-->>-U: Authenticated!
    end

    rect rgb(129, 199, 132)
        Note over U,IDP: SSO MAGIC: User never saw login page!<br/>Session cookie was sent automatically to IdP
    end
```

---

## 4. Google Federation (Double PKCE)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'actorTextColor': '#1a1a1a', 'signalTextColor': '#1a1a1a', 'noteTextColor': '#1a1a1a', 'noteBkgColor': '#fff9c4', 'actorBkg': '#e8f5e9', 'actorBorder': '#2e7d32' }}}%%
sequenceDiagram
    autonumber

    participant U as Browser
    participant A as App
    participant IDP as Local IdP
    participant GG as Google

    rect rgb(165, 214, 167)
        U->>+A: Click "Sign in with Google"
        Note over A: Generate PKCE #1<br/>(App - IdP)
        A-->>-U: Redirect
    end

    rect rgb(206, 147, 216)
        U->>+IDP: GET /federated/google/start<br/>PKCE #1 challenge
        Note over IDP: Validate client<br/>Generate PKCE #2<br/>(IdP - Google)<br/>Store in cookie
        IDP-->>-U: Redirect to Google
    end

    rect rgb(144, 202, 249)
        U->>+GG: GET /auth + PKCE #2
        GG-->>U: Google Login Page
        U->>GG: Enter credentials
        Note over GG: Authenticate
        GG-->>-U: Redirect + Google code
    end

    rect rgb(206, 147, 216)
        U->>+IDP: GET /callback + Google code
        IDP->>+GG: Exchange code + PKCE #2 verifier
        GG-->>-IDP: Google Tokens + UserInfo
        Note over IDP: Create/Link user<br/>Create session<br/>Generate new code
        IDP-->>-U: Redirect to App
    end

    rect rgb(165, 214, 167)
        U->>+A: Callback + new code
        A->>+IDP: Exchange + PKCE #1 verifier
        IDP-->>-A: IdP Tokens
        A-->>-U: Authenticated!
    end
```

---

## 5. Token Lifecycle

```mermaid
flowchart LR
    subgraph TOKENS["TOKEN TYPES"]
        direction TB
        AT["<b>Access Token</b><br/>5 minutes<br/>API calls"]
        RT["<b>Refresh Token</b><br/>24 hours<br/>Get new tokens"]
        IT["<b>ID Token</b><br/>User info<br/>email, name"]
    end

    subgraph STORAGE["STORAGE"]
        LS["localStorage<br/>(per app)"]
    end

    subgraph REFRESH["AUTO REFRESH"]
        direction TB
        CHECK{"Check<br/>every 30s"}
        EXP{"Expires in<br/>< 60s?"}
        REQ["POST /token<br/>refresh_token"]
        NEW["New tokens"]
    end

    AT --> LS
    RT --> LS
    IT --> LS

    CHECK --> EXP
    EXP -->|Yes| REQ
    EXP -->|No| CHECK
    REQ --> NEW
    NEW --> LS

    style AT fill:#E8F5E9,stroke:#388E3C,stroke-width:2px,color:#1B5E20
    style RT fill:#FFF3E0,stroke:#F57C00,stroke-width:2px,color:#E65100
    style IT fill:#E3F2FD,stroke:#1976D2,stroke-width:2px,color:#0D47A1
    style LS fill:#ECEFF1,stroke:#546E7A,stroke-width:2px,color:#263238
```

---

## 6. PKCE Explained

```mermaid
flowchart TB
    subgraph CLIENT["CLIENT (App)"]
        direction TB
        V["<b>code_verifier</b><br/>Random 32 bytes<br/><code>abc123xyz...</code>"]
        C["<b>code_challenge</b><br/>SHA256(verifier)<br/><code>XYZ789...</code>"]
        V -->|"SHA256 hash"| C
    end

    subgraph AUTH["AUTHORIZATION REQUEST"]
        REQ["GET /authorize<br/>Sends challenge ONLY<br/>Never sends verifier"]
    end

    subgraph TOKEN["TOKEN REQUEST"]
        TOK["POST /token<br/>Sends verifier<br/>+ authorization code"]
    end

    subgraph SERVER["SERVER (IdP)"]
        direction TB
        STORE["Stores challenge<br/>with auth code"]
        VER{"Verify:<br/>SHA256(verifier)<br/>== challenge?"}
        OK["Tokens Issued"]
        FAIL["Rejected"]
    end

    C --> REQ
    REQ --> STORE
    V --> TOK
    TOK --> VER
    STORE --> VER
    VER -->|"Match"| OK
    VER -->|"No match"| FAIL

    style V fill:#FFCDD2,stroke:#C62828,stroke-width:2px,color:#B71C1C
    style C fill:#C8E6C9,stroke:#2E7D32,stroke-width:2px,color:#1B5E20
    style OK fill:#C8E6C9,stroke:#2E7D32,stroke-width:2px,color:#1B5E20
    style FAIL fill:#FFCDD2,stroke:#C62828,stroke-width:2px,color:#B71C1C
    style STORE fill:#E1BEE7,stroke:#7B1FA2,stroke-width:2px,color:#4A148C
```

---

## 7. Logout Flow

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'actorTextColor': '#1a1a1a', 'signalTextColor': '#1a1a1a', 'noteTextColor': '#1a1a1a', 'noteBkgColor': '#fff9c4', 'actorBkg': '#ffcdd2', 'actorBorder': '#c62828' }}}%%
sequenceDiagram
    autonumber

    participant U as Browser
    participant A as App
    participant IDP as IdP

    rect rgb(239, 154, 154)
        U->>+A: Click "Logout"
        A->>+IDP: POST /logout<br/>refresh_token

        Note over IDP: Revoke refresh token<br/>Delete session

        IDP-->>-A: Success

        Note over A: Clear localStorage<br/>tokens = null

        A-->>-U: Logged out!
    end

    rect rgb(255, 183, 77)
        Note over U,IDP: Warning: Other apps may still have<br/>valid tokens until they expire (5 min)
    end
```

---

## 8. Database Schema

```mermaid
erDiagram
    USERS ||--o{ SESSIONS : "has"
    USERS ||--o{ REFRESH_TOKENS : "has"
    USERS ||--o{ FEDERATED_IDENTITIES : "linked to"
    USERS ||--o{ AUTHORIZATION_CODES : "gets"
    OAUTH_CLIENTS ||--o{ AUTHORIZATION_CODES : "issues"
    OAUTH_CLIENTS ||--o{ REFRESH_TOKENS : "for"

    USERS {
        text id PK "UUID"
        text email UK "unique"
        text password_hash "hashed"
        text name "display name"
        timestamp created_at "date"
    }

    OAUTH_CLIENTS {
        text id PK "app-a, app-b"
        text secret "optional"
        text name "App Name"
        json redirect_uris "callbacks"
        timestamp created_at "date"
    }

    SESSIONS {
        text id PK "cookie value"
        text user_id FK "user ref"
        timestamp expires_at "24h"
    }

    AUTHORIZATION_CODES {
        text code PK "one-time"
        text client_id FK "client ref"
        text user_id FK "user ref"
        text code_challenge "PKCE"
        text redirect_uri "url"
        timestamp expires_at "10min"
    }

    REFRESH_TOKENS {
        text token PK "token"
        text user_id FK "user ref"
        text client_id FK "client ref"
        text scope "scope"
        timestamp expires_at "24h"
    }

    FEDERATED_IDENTITIES {
        text id PK "id"
        text user_id FK "local user"
        text provider "google"
        text provider_sub "Google user id"
        text email "email"
        timestamp created_at "date"
    }
```

---

## 9. Security Overview

```mermaid
flowchart TB
    subgraph THREATS["THREATS"]
        T1["Code Interception"]
        T2["CSRF Attack"]
        T3["Token Theft"]
        T4["Session Hijack"]
    end

    subgraph PROTECTIONS["PROTECTIONS"]
        P1["<b>PKCE</b><br/>Code useless without verifier"]
        P2["<b>State Parameter</b><br/>Random per request"]
        P3["<b>Short Expiry</b><br/>Access: 5min"]
        P4["<b>HttpOnly Cookies</b><br/>JS can't access"]
    end

    T1 -.->|"blocked by"| P1
    T2 -.->|"blocked by"| P2
    T3 -.->|"mitigated by"| P3
    T4 -.->|"blocked by"| P4

    style T1 fill:#FFCDD2,stroke:#C62828,color:#B71C1C
    style T2 fill:#FFCDD2,stroke:#C62828,color:#B71C1C
    style T3 fill:#FFCDD2,stroke:#C62828,color:#B71C1C
    style T4 fill:#FFCDD2,stroke:#C62828,color:#B71C1C
    style P1 fill:#C8E6C9,stroke:#2E7D32,color:#1B5E20
    style P2 fill:#C8E6C9,stroke:#2E7D32,color:#1B5E20
    style P3 fill:#C8E6C9,stroke:#2E7D32,color:#1B5E20
    style P4 fill:#C8E6C9,stroke:#2E7D32,color:#1B5E20
```

---

## 10. Account Linking (OAuth → Local Password)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'actorTextColor': '#1a1a1a', 'signalTextColor': '#1a1a1a', 'noteTextColor': '#1a1a1a', 'noteBkgColor': '#fff9c4', 'actorBkg': '#e8f5e9', 'actorBorder': '#2e7d32' }}}%%
sequenceDiagram
    autonumber

    participant U as User
    participant APP as App (Settings)
    participant IDP as IdP API

    rect rgb(144, 202, 249)
        Note over U: OAuth user (Google)<br/>hasLocalPassword = false
    end

    rect rgb(165, 214, 167)
        U->>+APP: Visit Settings
        APP->>+IDP: GET /api/profile
        IDP-->>-APP: { hasLocalPassword: false }
        Note over APP: Show "Set Local Password"<br/>card
        APP-->>-U: Display form
    end

    rect rgb(255, 183, 77)
        U->>+APP: Enter new password
        APP->>+IDP: PATCH /api/profile<br/>{ newPassword: "xxx" }
        Note over IDP: OAuth user detected<br/>No currentPassword required<br/>Validate password rules<br/>Hash with bcrypt
        IDP-->>-APP: Success
        APP-->>-U: "Password set!"
    end

    rect rgb(129, 199, 132)
        Note over U,IDP: User can now login with:<br/>• Google OAuth<br/>• Email + Password
    end
```

---

## 11. Profile Management Flow

```mermaid
flowchart TB
    subgraph PROFILE["Profile API"]
        direction TB
        GET["GET /api/profile"]
        PATCH["PATCH /api/profile"]
    end

    subgraph AUTH["Authentication"]
        TOKEN{"Valid<br/>Access Token?"}
        DENY["401 Unauthorized"]
    end

    subgraph UPDATE["Update Types"]
        NAME["Update Name"]
        EMAIL["Update Email"]
        PWD["Change Password"]
        SET_PWD["Set Password<br/>(OAuth users)"]
    end

    subgraph VALIDATION["Validation"]
        CHK_EMAIL{"Email<br/>available?"}
        CHK_PWD{"Current password<br/>correct?"}
        CHK_OAUTH{"OAuth-only<br/>user?"}
        VAL_PWD{"Password rules<br/>valid?"}
    end

    subgraph RESULT["Result"]
        OK["200 Updated"]
        ERR_409["409 Email taken"]
        ERR_401["401 Wrong password"]
        ERR_400["400 Invalid password"]
    end

    GET --> TOKEN
    PATCH --> TOKEN
    TOKEN -->|No| DENY
    TOKEN -->|Yes| UPDATE

    NAME --> OK
    EMAIL --> CHK_EMAIL
    CHK_EMAIL -->|No| ERR_409
    CHK_EMAIL -->|Yes| OK

    PWD --> CHK_OAUTH
    CHK_OAUTH -->|No| CHK_PWD
    CHK_OAUTH -->|Yes| SET_PWD
    CHK_PWD -->|No| ERR_401
    CHK_PWD -->|Yes| VAL_PWD
    SET_PWD --> VAL_PWD
    VAL_PWD -->|No| ERR_400
    VAL_PWD -->|Yes| OK

    style GET fill:#E3F2FD,stroke:#1976D2,stroke-width:2px,color:#0D47A1
    style PATCH fill:#FFF3E0,stroke:#F57C00,stroke-width:2px,color:#E65100
    style OK fill:#C8E6C9,stroke:#2E7D32,stroke-width:2px,color:#1B5E20
    style ERR_409 fill:#FFCDD2,stroke:#C62828,stroke-width:2px,color:#B71C1C
    style ERR_401 fill:#FFCDD2,stroke:#C62828,stroke-width:2px,color:#B71C1C
    style ERR_400 fill:#FFCDD2,stroke:#C62828,stroke-width:2px,color:#B71C1C
```

---

## 12. Complete SSO Flow Summary

```mermaid
flowchart TB
    START(("Start"))

    subgraph APP["Any App"]
        CHECK{"Has valid<br/>access token?"}
        USE["Use App"]
        REDIRECT["Redirect to IdP<br/>+ PKCE challenge"]
    end

    subgraph IDP_FLOW["IdP"]
        SESSION{"Has<br/>session?"}
        LOGIN["Show Login"]
        AUTH["Authenticate"]
        CODE["Return code"]
    end

    subgraph TOKEN_FLOW["Token Exchange"]
        EXCHANGE["Exchange code<br/>+ PKCE verifier"]
        STORE["Store tokens"]
    end

    START --> CHECK
    CHECK -->|"Yes"| USE
    CHECK -->|"No"| REDIRECT
    REDIRECT --> SESSION
    SESSION -->|"Yes"| CODE
    SESSION -->|"No"| LOGIN
    LOGIN --> AUTH
    AUTH --> CODE
    CODE --> EXCHANGE
    EXCHANGE --> STORE
    STORE --> USE

    style START fill:#E3F2FD,stroke:#1976D2,stroke-width:3px,color:#0D47A1
    style USE fill:#C8E6C9,stroke:#2E7D32,stroke-width:3px,color:#1B5E20
    style CODE fill:#E1BEE7,stroke:#7B1FA2,stroke-width:2px,color:#4A148C
    style SESSION fill:#FFF9C4,stroke:#F9A825,stroke-width:2px,color:#E65100
```
