# Single Sign-On (SSO) - Ροή Αυθεντικοποίησης

## Διαγράμματα

### Mermaid (GitHub/VS Code)
Βλέπε **[DIAGRAMS_MERMAID.md](diagrams/DIAGRAMS_MERMAID.md)** - εμφανίζονται αυτόματα στο GitHub και VS Code.

### Excalidraw (Editable)
Τα παρακάτω διαγράμματα βρίσκονται στον φάκελο `docs/diagrams/` και μπορούν να ανοιχτούν με:
- [excalidraw.com](https://excalidraw.com) (drag & drop το αρχείο)
- VS Code με το Excalidraw extension

| Διάγραμμα | Αρχείο |
|-----------|--------|
| Αρχιτεκτονική SSO | `01-sso-architecture.excalidraw` |
| Πρώτη Σύνδεση (Local IdP) | `02-first-login-flow.excalidraw` |
| SSO Auto-Login (App B) | `03-sso-auto-login.excalidraw` |
| Google Federation | `04-google-federation.excalidraw` |

---

## Επισκόπηση

Το SSO (Single Sign-On) επιτρέπει στους χρήστες να συνδεθούν μία φορά και να έχουν πρόσβαση σε πολλαπλές εφαρμογές χωρίς να χρειάζεται να εισάγουν ξανά τα διαπιστευτήριά τους.

---

## Αρχιτεκτονική Συστήματος

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ΧΡΗΣΤΗΣ (Browser)                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
             ┌──────────┐    ┌──────────┐    ┌──────────────┐
             │  App A   │    │  App B   │    │    Google    │
             │ TaskFlow │    │ DocVault │    │   OAuth 2.0  │
             │ :3001    │    │ :3002    │    │              │
             └────┬─────┘    └────┬─────┘    └──────┬───────┘
                  │               │                  │
                  └───────────────┼──────────────────┘
                                  ▼
                        ┌─────────────────┐
                        │   Local IdP     │
                        │   (Broker)      │
                        │   :3000         │
                        └─────────────────┘
                                  │
                                  ▼
                        ┌─────────────────┐
                        │  PostgreSQL DB  │
                        │  (Users, Tokens │
                        │   Sessions)     │
                        └─────────────────┘
```

---

## Πώς Λειτουργεί το SSO

### Βασική Αρχή

Το SSO βασίζεται σε ένα **κεντρικό Session Cookie** που διατηρείται στον IdP (Identity Provider). Όταν ο χρήστης επισκέπτεται οποιαδήποτε εφαρμογή:

1. Αν δεν έχει token → Ανακατευθύνεται στον IdP
2. Αν ο IdP έχει ενεργό session → Επιστρέφει αυτόματα authorization code
3. Αν δεν υπάρχει session → Εμφανίζει login form

---

## Ροή 1: Πρώτη Σύνδεση (Local IdP)

```
┌──────────┐          ┌──────────┐          ┌──────────┐
│  User    │          │  App A   │          │   IdP    │
│ Browser  │          │ TaskFlow │          │  :3000   │
└────┬─────┘          └────┬─────┘          └────┬─────┘
     │                     │                     │
     │  1. Επισκέπτεται    │                     │
     │─────────────────────>                     │
     │                     │                     │
     │  2. Δεν έχει token  │                     │
     │     Redirect με     │                     │
     │     PKCE params     │                     │
     │<────────────────────│                     │
     │                     │                     │
     │  3. GET /authorize  │                     │
     │     + client_id     │                     │
     │     + code_challenge│                     │
     │     + state         │                     │
     │─────────────────────────────────────────>│
     │                     │                     │
     │  4. Εμφάνιση Login  │                     │
     │<─────────────────────────────────────────│
     │                     │                     │
     │  5. POST credentials│                     │
     │─────────────────────────────────────────>│
     │                     │                     │
     │  6. Επιτυχής login: │                     │
     │     - Δημιουργία    │                     │
     │       session_id    │                     │
     │       cookie        │                     │
     │     - Redirect με   │                     │
     │       auth code     │                     │
     │<─────────────────────────────────────────│
     │                     │                     │
     │  7. Callback με code│                     │
     │─────────────────────>                     │
     │                     │                     │
     │                     │  8. POST /token     │
     │                     │     + code          │
     │                     │     + code_verifier │
     │                     │─────────────────────>
     │                     │                     │
     │                     │  9. Tokens Response │
     │                     │     (access, id,    │
     │                     │      refresh)       │
     │                     │<────────────────────│
     │                     │                     │
     │  10. Authenticated! │                     │
     │<────────────────────│                     │
     │                     │                     │
```

### Τι Αποθηκεύεται

| Τοποθεσία | Δεδομένα | Σκοπός |
|-----------|----------|--------|
| IdP Cookie | `session_id` | Αναγνώριση ενεργού session |
| App localStorage | `access_token` | API κλήσεις |
| App localStorage | `refresh_token` | Ανανέωση tokens |
| App localStorage | `id_token` | Πληροφορίες χρήστη |

---

## Ροή 2: SSO - Αυτόματη Σύνδεση στο App B

Μετά τη σύνδεση στο App A, ο χρήστης επισκέπτεται το App B:

```
┌──────────┐          ┌──────────┐          ┌──────────┐
│  User    │          │  App B   │          │   IdP    │
│ Browser  │          │ DocVault │          │  :3000   │
└────┬─────┘          └────┬─────┘          └────┬─────┘
     │                     │                     │
     │  1. Επισκέπτεται    │                     │
     │─────────────────────>                     │
     │                     │                     │
     │  2. Δεν έχει token  │                     │
     │     Redirect με     │                     │
     │     PKCE params     │                     │
     │<────────────────────│                     │
     │                     │                     │
     │  3. GET /authorize  │                     │
     │     + session_id    │  ← Cookie από       │
     │       cookie        │    προηγούμενη      │
     │                     │    σύνδεση!         │
     │─────────────────────────────────────────>│
     │                     │                     │
     │  4. Ο IdP βρίσκει   │                     │
     │     ενεργό session  │                     │
     │     → ΧΩΡΙΣ LOGIN   │                     │
     │     → Άμεσο redirect│                     │
     │       με auth code  │                     │
     │<─────────────────────────────────────────│
     │                     │                     │
     │  5. Callback με code│                     │
     │─────────────────────>                     │
     │                     │                     │
     │                     │  6. Token exchange  │
     │                     │─────────────────────>
     │                     │                     │
     │                     │  7. Tokens          │
     │                     │<────────────────────│
     │                     │                     │
     │  8. Authenticated!  │                     │
     │     ΧΩΡΙΣ να δώσει  │                     │
     │     κωδικό!         │                     │
     │<────────────────────│                     │
```

### Γιατί Λειτουργεί

1. **Κοινό Domain για Cookies**: Ο IdP (localhost:3000) θέτει ένα `session_id` cookie
2. **Browser στέλνει cookies**: Όταν το App B ανακατευθύνει στον IdP, ο browser στέλνει αυτόματα το cookie
3. **Session Recognition**: Ο IdP αναγνωρίζει το session και παραλείπει το login

---

## Ροή 3: Federation με Google OAuth 2.0

```
┌────────┐      ┌────────┐      ┌────────┐      ┌───────────┐
│ User   │      │ App A  │      │  IdP   │      │  Google   │
│Browser │      │:3001   │      │ :3000  │      │  OAuth    │
└───┬────┘      └───┬────┘      └───┬────┘      └─────┬─────┘
    │               │               │                  │
    │ 1. Click      │               │                  │
    │ "Google"      │               │                  │
    │───────────────>               │                  │
    │               │               │                  │
    │ 2. Redirect   │               │                  │
    │    με PKCE    │               │                  │
    │<──────────────│               │                  │
    │               │               │                  │
    │ 3. GET /auth/federated/google/start             │
    │───────────────────────────────>                  │
    │               │               │                  │
    │               │  4. IdP generates               │
    │               │     νέο PKCE για                │
    │               │     Google                      │
    │               │               │                  │
    │ 5. Redirect to Google                           │
    │<──────────────────────────────│                  │
    │               │               │                  │
    │ 6. GET /auth (Google)                           │
    │─────────────────────────────────────────────────>
    │               │               │                  │
    │ 7. Google Login Page                            │
    │<─────────────────────────────────────────────────
    │               │               │                  │
    │ 8. Enter Google credentials                     │
    │─────────────────────────────────────────────────>
    │               │               │                  │
    │ 9. Redirect με code                             │
    │<─────────────────────────────────────────────────
    │               │               │                  │
    │ 10. GET /auth/federated/google/callback         │
    │───────────────────────────────>                  │
    │               │               │                  │
    │               │  11. Exchange code              │
    │               │      με Google                  │
    │               │───────────────────────────────────>
    │               │               │                  │
    │               │  12. Tokens + UserInfo          │
    │               │<──────────────────────────────────
    │               │               │                  │
    │               │  13. Create/Link user           │
    │               │      Create session             │
    │               │      Generate code              │
    │               │               │                  │
    │ 14. Redirect to App A με code                   │
    │<──────────────────────────────│                  │
    │               │               │                  │
    │ 15. Token exchange            │                  │
    │───────────────>───────────────>                  │
    │               │               │                  │
    │ 16. Authenticated!            │                  │
    │<──────────────│               │                  │
```

### Federation - Τι Συμβαίνει

1. **Double PKCE**:
   - App → IdP: Πρώτο PKCE ζεύγος
   - IdP → Google: Δεύτερο PKCE ζεύγος

2. **User Linking**: Ο IdP δημιουργεί/συνδέει τον Google χρήστη με τοπικό account

3. **Session Creation**: Μετά το Google login, ο IdP δημιουργεί δικό του session

---

## Μηχανισμοί Ασφαλείας

### 1. PKCE (Proof Key for Code Exchange)

```
┌─────────────────────────────────────────────────────┐
│                    PKCE Flow                         │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. Client generates:                                │
│     code_verifier = random(32 bytes)                │
│     code_challenge = SHA256(code_verifier)          │
│                                                      │
│  2. Authorization Request:                           │
│     /authorize?code_challenge=ABC123...             │
│                                                      │
│  3. Token Exchange:                                  │
│     POST /token                                      │
│     code_verifier=original_random_value             │
│                                                      │
│  4. Server verifies:                                 │
│     SHA256(code_verifier) == stored_challenge       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Γιατί είναι σημαντικό**: Ακόμα κι αν κάποιος υποκλέψει το authorization code, δεν μπορεί να το χρησιμοποιήσει χωρίς το `code_verifier`.

### 2. State Parameter (CSRF Protection)

```
App generates: state = random_uuid()
Stores locally: sessionStorage['auth_state'] = state

Request:  /authorize?state=abc-123
Response: /callback?code=xyz&state=abc-123

App verifies: response.state === stored_state
```

### 3. Token Expiration

| Token | Διάρκεια | Χρήση |
|-------|----------|-------|
| Access Token | 2 λεπτά | API calls |
| Refresh Token | 7 ημέρες | Ανανέωση access token |
| ID Token | 1 ώρα | Πληροφορίες χρήστη |
| Session | 24 ώρες | SSO across apps |

### 4. Automatic Token Refresh

```
┌─────────────────────────────────────────┐
│         Token Refresh Flow              │
├─────────────────────────────────────────┤
│                                         │
│  Every 30 seconds:                      │
│                                         │
│  if (token expires in < 60s) {          │
│    POST /token                          │
│      grant_type=refresh_token           │
│      refresh_token=xxx                  │
│                                         │
│    → New access_token                   │
│    → New refresh_token (rotation)       │
│  }                                      │
│                                         │
└─────────────────────────────────────────┘
```

---

## Logout Flow

```
┌──────────┐          ┌──────────┐          ┌──────────┐
│  User    │          │   App    │          │   IdP    │
└────┬─────┘          └────┬─────┘          └────┬─────┘
     │                     │                     │
     │  1. Click Logout    │                     │
     │─────────────────────>                     │
     │                     │                     │
     │                     │  2. POST /logout    │
     │                     │     refresh_token   │
     │                     │─────────────────────>
     │                     │                     │
     │                     │  3. Revoke token    │
     │                     │     Clear session   │
     │                     │<────────────────────│
     │                     │                     │
     │  4. Clear local     │                     │
     │     tokens          │                     │
     │<────────────────────│                     │
     │                     │                     │
     │  ✓ Logged out from  │                     │
     │    this app         │                     │
     │                     │                     │
     │  ⚠ Other apps may   │                     │
     │    still have valid │                     │
     │    tokens until     │                     │
     │    they expire      │                     │
```

---

## Συνοπτικά

| Χαρακτηριστικό | Περιγραφή |
|----------------|-----------|
| **SSO** | Ένα login για όλες τις εφαρμογές μέσω κοινού session |
| **PKCE** | Προστασία από υποκλοπή authorization code |
| **State** | Προστασία από CSRF επιθέσεις |
| **Token Refresh** | Αυτόματη ανανέωση χωρίς re-login |
| **Federation** | Σύνδεση μέσω εξωτερικού provider (Google OAuth 2.0) |
| **Account Linking** | OAuth χρήστες μπορούν να ορίσουν τοπικό κωδικό |
