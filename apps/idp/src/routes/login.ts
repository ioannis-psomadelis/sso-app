import { FastifyPluginAsync } from 'fastify';
import { db, users, authorizationCodes, oauthClients, sessions } from '@repo/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { createSession, deleteSession } from '../services/session.js';
import { v4 as uuid } from 'uuid';
import { SESSION_DURATION_SECONDS, AUTH_CODE_EXPIRY_MS } from '../constants.js';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const loginRoute: FastifyPluginAsync = async (fastify) => {
  // GET /login - Show login form as HTML
  fastify.get('/login', async (request, reply) => {
    const params = request.query as Record<string, string>;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign In - Identity Provider</title>
  <style>
    :root {
      --background: #f4f4f5;
      --foreground: #18181b;
      --card: #ffffff;
      --primary: #18181b;
      --primary-foreground: #fafafa;
      --muted: #f4f4f5;
      --muted-foreground: #71717a;
      --border: #e4e4e7;
      --input: #ffffff;
      --ring: #18181b;
      --destructive: #ef4444;
      --radius: 0.5rem;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --background: #09090b;
        --foreground: #fafafa;
        --card: #18181b;
        --primary: #fafafa;
        --primary-foreground: #18181b;
        --muted: #27272a;
        --muted-foreground: #a1a1aa;
        --border: #27272a;
        --input: #27272a;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--background);
      color: var(--foreground);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      width: 100%;
      max-width: 340px;
      overflow: hidden;
    }
    .card-header {
      padding: 1.25rem 1.25rem 0;
      text-align: center;
    }
    .logo {
      width: 48px;
      height: 48px;
      background: var(--primary);
      color: var(--primary-foreground);
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 0.75rem;
      font-size: 1.25rem;
    }
    h1 { font-size: 1.125rem; font-weight: 600; }
    .subtitle { color: var(--muted-foreground); font-size: 0.8125rem; margin-top: 0.25rem; }
    .card-content { padding: 1.25rem; }
    .form-group { margin-bottom: 0.875rem; }
    label { display: block; font-size: 0.8125rem; font-weight: 500; margin-bottom: 0.375rem; }
    input[type="email"], input[type="password"] {
      width: 100%;
      height: 2.25rem;
      padding: 0 0.625rem;
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) - 2px);
      background: var(--input);
      color: var(--foreground);
      font-size: 0.8125rem;
      outline: none;
    }
    input:focus { border-color: var(--ring); box-shadow: 0 0 0 1px var(--ring); }
    .btn {
      width: 100%;
      height: 2.25rem;
      background: var(--primary);
      color: var(--primary-foreground);
      border: none;
      border-radius: calc(var(--radius) - 2px);
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .btn:hover { opacity: 0.9; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .spinner { width: 0.875rem; height: 0.875rem; border: 2px solid transparent; border-top-color: currentColor; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error { background: #fef2f2; color: var(--destructive); padding: 0.625rem; border-radius: calc(var(--radius) - 2px); font-size: 0.8125rem; margin-bottom: 0.875rem; display: none; }
    @media (prefers-color-scheme: dark) { .error { background: #450a0a; } }
    .footer { padding: 0.75rem 1.25rem; font-size: 0.75rem; color: var(--muted-foreground); border-top: 1px solid var(--border); background: var(--muted); text-align: center; }
    .footer code { background: var(--border); padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-family: monospace; }
  </style>
</head>
<body>
  <div class="card">
    <div class="card-header">
      <div class="logo">ID</div>
      <h1>Sign In</h1>
      <p class="subtitle">Identity Provider</p>
    </div>
    <div class="card-content">
      <div id="error" class="error"></div>
      <form id="loginForm">
        <input type="hidden" name="client_id" value="${escapeHtml(params.client_id || '')}">
        <input type="hidden" name="redirect_uri" value="${escapeHtml(params.redirect_uri || '')}">
        <input type="hidden" name="scope" value="${escapeHtml(params.scope || 'openid profile email')}">
        <input type="hidden" name="code_challenge" value="${escapeHtml(params.code_challenge || '')}">
        <input type="hidden" name="code_challenge_method" value="${escapeHtml(params.code_challenge_method || 'S256')}">
        <input type="hidden" name="state" value="${escapeHtml(params.state || '')}">
        <input type="hidden" name="nonce" value="${escapeHtml(params.nonce || '')}">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" value="demo@example.com" required>
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" value="password123" required>
        </div>
        <button type="submit" id="submitBtn" class="btn">Sign In</button>
      </form>
    </div>
    <div class="footer">Demo account pre-filled</div>
  </div>
  <script>
    const form = document.getElementById('loginForm');
    const errorDiv = document.getElementById('error');
    const submitBtn = document.getElementById('submitBtn');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorDiv.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span> Signing in...';
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      try {
        const response = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          credentials: 'include'
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Login failed');
        window.location.href = result.redirect_uri;
      } catch (err) {
        errorDiv.textContent = err.message === 'invalid_credentials' ? 'Invalid email or password' : err.message;
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Sign In';
      }
    });
  </script>
</body>
</html>`;

    reply.type('text/html').send(html);
  });

  // POST /login - Process login
  fastify.post('/login', async (request, reply) => {
    const {
      email,
      password,
      client_id,
      redirect_uri,
      scope,
      code_challenge,
      code_challenge_method,
      state,
      nonce,
    } = request.body as Record<string, string>;

    // Find user
    const userResults = await db.select().from(users).where(eq(users.email, email));
    const user = userResults[0];
    if (!user) {
      return reply.status(401).send({ error: 'invalid_credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return reply.status(401).send({ error: 'invalid_credentials' });
    }

    // Validate client
    const clientResults = await db.select().from(oauthClients).where(eq(oauthClients.id, client_id));
    const client = clientResults[0];
    if (!client) {
      return reply.status(400).send({ error: 'invalid_client' });
    }

    // Session fixation prevention: Delete any existing session before creating a new one
    // This ensures attackers can't fixate a session ID before login
    const existingSessionId = request.cookies.session_id;
    if (existingSessionId) {
      await deleteSession(existingSessionId);
    }

    // Create fresh session with new ID
    const sessionId = await createSession(user.id);
    reply.setCookie('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DURATION_SECONDS,
    });

    // Generate auth code
    const code = uuid();
    await db.insert(authorizationCodes).values({
      code,
      clientId: client_id,
      userId: user.id,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
      scope: scope || 'openid profile email',
      redirectUri: redirect_uri,
      nonce: nonce || null, // Store nonce for later inclusion in ID token
      expiresAt: new Date(Date.now() + AUTH_CODE_EXPIRY_MS),
    });

    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (state) redirectUrl.searchParams.set('state', state);

    return { redirect_uri: redirectUrl.toString() };
  });
};
