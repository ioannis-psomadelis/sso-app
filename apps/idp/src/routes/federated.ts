import { FastifyPluginAsync } from 'fastify';
import { db, oauthClients, authorizationCodes, users, federatedIdentities } from '@repo/db';
import { eq, and } from 'drizzle-orm';
import { createSession } from '../services/session.js';
import { v4 as uuid } from 'uuid';
import { createHash, randomBytes } from 'crypto';

const IDP_URL = process.env.IDP_URL || 'http://localhost:3000';

// Google OAuth 2.0 Configuration
// Set these in your .env file:
// GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
// GOOGLE_CLIENT_SECRET=your-client-secret
const GOOGLE_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userinfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
  scopes: 'openid email profile',
};

function base64URLEncode(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function generatePKCE() {
  const verifier = base64URLEncode(randomBytes(32));
  const challenge = base64URLEncode(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

interface FederationState {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  state?: string;
  scope: string;
  pkceVerifier: string;
}

interface TokenResponse {
  access_token: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
}

interface UserInfo {
  sub: string;
  email: string;
  name?: string;
  given_name?: string;
  family_name?: string;
}

export const federatedRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/auth/federated/:provider/start', async (request, reply) => {
    const { provider } = request.params as { provider: string };
    const {
      client_id,
      redirect_uri,
      code_challenge,
      code_challenge_method,
      state,
      scope,
    } = request.query as Record<string, string>;

    if (!client_id || !redirect_uri || !code_challenge || code_challenge_method !== 'S256') {
      return reply.status(400).send({ error: 'invalid_request' });
    }

    const clientResults = await db.select().from(oauthClients).where(eq(oauthClients.id, client_id));
    const client = clientResults[0];
    if (!client) {
      return reply.status(400).send({ error: 'invalid_client' });
    }

    const redirectUris = JSON.parse(client.redirectUris) as string[];
    if (!redirectUris.includes(redirect_uri)) {
      return reply.status(400).send({ error: 'invalid_redirect_uri' });
    }

    const pkce = generatePKCE();
    const federationState: FederationState = {
      client_id,
      redirect_uri,
      code_challenge,
      code_challenge_method,
      state,
      scope: scope || 'openid profile email',
      pkceVerifier: pkce.verifier,
    };

    reply.setCookie('federation_state', JSON.stringify(federationState), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });

    if (provider !== 'google') {
      return reply.status(400).send({ error: 'unsupported_provider', message: 'Only Google SSO is supported' });
    }

    if (!GOOGLE_CONFIG.clientId) {
      return reply.status(500).send({ error: 'configuration_error', message: 'Google OAuth not configured' });
    }

    const authorizeUrl = new URL(GOOGLE_CONFIG.authorizeUrl);
    authorizeUrl.searchParams.set('client_id', GOOGLE_CONFIG.clientId);
    authorizeUrl.searchParams.set('redirect_uri', `${IDP_URL}/auth/federated/${provider}/callback`);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('scope', GOOGLE_CONFIG.scopes);
    authorizeUrl.searchParams.set('code_challenge', pkce.challenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');
    authorizeUrl.searchParams.set('access_type', 'offline');
    authorizeUrl.searchParams.set('prompt', 'consent');

    return reply.redirect(authorizeUrl.toString());
  });

  fastify.get('/auth/federated/:provider/callback', async (request, reply) => {
    const { provider } = request.params as { provider: string };
    const { code, error, error_description } = request.query as Record<string, string>;

    if (error) {
      return reply.status(400).send({ error, error_description });
    }

    if (!code) {
      return reply.status(400).send({ error: 'missing_code' });
    }

    const federationStateCookie = request.cookies.federation_state;
    if (!federationStateCookie) {
      return reply.status(400).send({ error: 'missing_federation_state' });
    }

    const federationState: FederationState = JSON.parse(federationStateCookie);
    reply.clearCookie('federation_state');

    if (provider !== 'google') {
      return reply.status(400).send({ error: 'unsupported_provider' });
    }

    if (!GOOGLE_CONFIG.clientId || !GOOGLE_CONFIG.clientSecret) {
      return reply.status(500).send({ error: 'configuration_error', message: 'Google OAuth not configured' });
    }

    try {
      // Google requires client_secret even with PKCE for web applications
      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${IDP_URL}/auth/federated/${provider}/callback`,
        client_id: GOOGLE_CONFIG.clientId,
        client_secret: GOOGLE_CONFIG.clientSecret,
        code_verifier: federationState.pkceVerifier,
      });

      const tokenResponse = await fetch(GOOGLE_CONFIG.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
      });

      if (!tokenResponse.ok) {
        const errorBody = await tokenResponse.text();
        fastify.log.error({ errorBody }, 'Google token exchange failed');
        return reply.status(500).send({ error: 'token_exchange_failed' });
      }

      const tokens: TokenResponse = await tokenResponse.json();

      const userinfoResponse = await fetch(GOOGLE_CONFIG.userinfoUrl, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userinfoResponse.ok) {
        return reply.status(500).send({ error: 'userinfo_fetch_failed' });
      }

      const userInfo: UserInfo = await userinfoResponse.json();

      let userResults = await db.select().from(users).where(eq(users.email, userInfo.email));
      let user = userResults[0];

      if (!user) {
        const userId = uuid();
        const name = userInfo.name || userInfo.given_name || userInfo.email.split('@')[0];
        await db.insert(users).values({
          id: userId,
          email: userInfo.email,
          passwordHash: 'OAUTH_USER_NO_LOCAL_PASSWORD',
          name,
          createdAt: new Date(),
        });
        const newUserResults = await db.select().from(users).where(eq(users.id, userId));
        user = newUserResults[0]!;
      }

      const existingIdentityResults = await db.select()
        .from(federatedIdentities)
        .where(and(
          eq(federatedIdentities.provider, provider),
          eq(federatedIdentities.providerSub, userInfo.sub)
        ));
      const existingIdentity = existingIdentityResults[0];

      if (!existingIdentity) {
        await db.insert(federatedIdentities).values({
          id: uuid(),
          userId: user.id,
          provider,
          providerSub: userInfo.sub,
          email: userInfo.email,
          createdAt: new Date(),
        });
      }

      const sessionId = await createSession(user.id);
      reply.setCookie('session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60,
      });

      const authCode = uuid();
      await db.insert(authorizationCodes).values({
        code: authCode,
        clientId: federationState.client_id,
        userId: user.id,
        codeChallenge: federationState.code_challenge,
        codeChallengeMethod: federationState.code_challenge_method,
        scope: federationState.scope,
        redirectUri: federationState.redirect_uri,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const redirectUrl = new URL(federationState.redirect_uri);
      redirectUrl.searchParams.set('code', authCode);
      if (federationState.state) {
        redirectUrl.searchParams.set('state', federationState.state);
      }

      return reply.redirect(redirectUrl.toString());
    } catch {
      return reply.status(500).send({ error: 'internal_error' });
    }
  });
};
