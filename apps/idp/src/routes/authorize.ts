import { FastifyPluginAsync } from 'fastify';
import { db, oauthClients, authorizationCodes } from '@repo/db';
import { eq } from 'drizzle-orm';
import { getSession } from '../services/session.js';
import { v4 as uuid } from 'uuid';
import { AUTH_CODE_EXPIRY_MS } from '../constants.js';

const IDP_URL = process.env.IDP_URL || 'http://localhost:3000';

export const authorizeRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/authorize', async (request, reply) => {
    const {
      client_id,
      redirect_uri,
      response_type,
      scope,
      code_challenge,
      code_challenge_method,
      state,
      prompt,
    } = request.query as Record<string, string>;

    // Validate required params
    if (!client_id || !redirect_uri || response_type !== 'code') {
      return reply.status(400).send({ error: 'invalid_request' });
    }

    if (!code_challenge || code_challenge_method !== 'S256') {
      return reply.status(400).send({ error: 'invalid_request', error_description: 'PKCE required' });
    }

    // Validate client
    const clients = await db.select().from(oauthClients).where(eq(oauthClients.id, client_id));
    const client = clients[0];
    if (!client) {
      return reply.status(400).send({ error: 'invalid_client' });
    }

    const redirectUris = JSON.parse(client.redirectUris) as string[];
    if (!redirectUris.includes(redirect_uri)) {
      return reply.status(400).send({ error: 'invalid_redirect_uri' });
    }

    // Check for existing session
    const sessionId = request.cookies.session_id;
    const session = sessionId ? await getSession(sessionId) : null;

    if (session) {
      // User already logged in - generate auth code
      const code = uuid();
      await db.insert(authorizationCodes).values({
        code,
        clientId: client_id,
        userId: session.userId,
        codeChallenge: code_challenge,
        codeChallengeMethod: code_challenge_method,
        scope: scope || 'openid profile email',
        redirectUri: redirect_uri,
        expiresAt: new Date(Date.now() + AUTH_CODE_EXPIRY_MS),
      });

      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.set('code', code);
      if (state) redirectUrl.searchParams.set('state', state);

      return reply.redirect(redirectUrl.toString());
    }

    // No session - check if silent auth (prompt=none)
    if (prompt === 'none') {
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.set('error', 'login_required');
      if (state) redirectUrl.searchParams.set('state', state);
      return reply.redirect(redirectUrl.toString());
    }

    // No session - show login page
    const loginUrl = new URL('/login', IDP_URL);
    loginUrl.searchParams.set('client_id', client_id);
    loginUrl.searchParams.set('redirect_uri', redirect_uri);
    loginUrl.searchParams.set('scope', scope || 'openid profile email');
    loginUrl.searchParams.set('code_challenge', code_challenge);
    loginUrl.searchParams.set('code_challenge_method', code_challenge_method);
    if (state) loginUrl.searchParams.set('state', state);

    return reply.redirect(loginUrl.toString());
  });
};
