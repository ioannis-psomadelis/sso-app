import { FastifyPluginAsync } from 'fastify';
import { db, users, authorizationCodes, refreshTokens } from '@repo/db';
import { eq } from 'drizzle-orm';
import { verifyPKCE } from '../services/pkce.js';
import { generateAccessToken, generateIdToken, generateRefreshToken } from '../services/jwt.js';

export const tokenRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post('/token', async (request, reply) => {
    const body = request.body as Record<string, string>;
    const grantType = body.grant_type;

    if (grantType === 'authorization_code') {
      return handleAuthorizationCode(body, reply);
    } else if (grantType === 'refresh_token') {
      return handleRefreshToken(body, reply);
    }

    return reply.status(400).send({ error: 'unsupported_grant_type' });
  });

  // Dedicated refresh endpoint for educational clarity
  fastify.post('/token/refresh', async (request, reply) => {
    const body = request.body as Record<string, string>;
    return handleRefreshToken({ ...body, grant_type: 'refresh_token' }, reply);
  });
};

async function handleAuthorizationCode(body: Record<string, string>, reply: any) {
  const { code, code_verifier, client_id, redirect_uri } = body;

  if (!code || !code_verifier || !client_id || !redirect_uri) {
    return reply.status(400).send({ error: 'invalid_request' });
  }

  // Find and validate auth code
  const authCode = db.select().from(authorizationCodes).where(eq(authorizationCodes.code, code)).get();
  if (!authCode) {
    return reply.status(400).send({ error: 'invalid_grant', error_description: 'Invalid authorization code' });
  }

  if (authCode.expiresAt < new Date()) {
    db.delete(authorizationCodes).where(eq(authorizationCodes.code, code)).run();
    return reply.status(400).send({ error: 'invalid_grant', error_description: 'Authorization code expired' });
  }

  if (authCode.clientId !== client_id || authCode.redirectUri !== redirect_uri) {
    return reply.status(400).send({ error: 'invalid_grant' });
  }

  // Verify PKCE
  const pkceValid = await verifyPKCE(code_verifier, authCode.codeChallenge, authCode.codeChallengeMethod);
  if (!pkceValid) {
    return reply.status(400).send({ error: 'invalid_grant', error_description: 'PKCE verification failed' });
  }

  // Delete used auth code
  db.delete(authorizationCodes).where(eq(authorizationCodes.code, code)).run();

  // Get user
  const user = db.select().from(users).where(eq(users.id, authCode.userId)).get();
  if (!user) {
    return reply.status(400).send({ error: 'invalid_grant' });
  }

  // Generate tokens
  const accessToken = await generateAccessToken(user, client_id, authCode.scope);
  const idToken = await generateIdToken(user, client_id);
  const refreshToken = await generateRefreshToken();

  // Store refresh token
  db.insert(refreshTokens).values({
    token: refreshToken,
    userId: user.id,
    clientId: client_id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  }).run();

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 120, // 2 minutes for educational purposes
    refresh_token: refreshToken,
    id_token: idToken,
  };
}

async function handleRefreshToken(body: Record<string, string>, reply: any) {
  const { refresh_token, client_id } = body;

  if (!refresh_token || !client_id) {
    return reply.status(400).send({ error: 'invalid_request' });
  }

  const storedToken = db.select().from(refreshTokens).where(eq(refreshTokens.token, refresh_token)).get();
  if (!storedToken || storedToken.clientId !== client_id) {
    return reply.status(400).send({ error: 'invalid_grant' });
  }

  if (storedToken.expiresAt < new Date()) {
    db.delete(refreshTokens).where(eq(refreshTokens.token, refresh_token)).run();
    return reply.status(400).send({ error: 'invalid_grant', error_description: 'Refresh token expired' });
  }

  // Get user
  const user = db.select().from(users).where(eq(users.id, storedToken.userId)).get();
  if (!user) {
    return reply.status(400).send({ error: 'invalid_grant' });
  }

  // Generate new tokens
  const accessToken = await generateAccessToken(user, client_id, 'openid profile email');
  const idToken = await generateIdToken(user, client_id);
  const newRefreshToken = await generateRefreshToken();

  // Rotate refresh token
  db.delete(refreshTokens).where(eq(refreshTokens.token, refresh_token)).run();
  db.insert(refreshTokens).values({
    token: newRefreshToken,
    userId: user.id,
    clientId: client_id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  }).run();

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 120, // 2 minutes for educational purposes
    refresh_token: newRefreshToken,
    id_token: idToken,
  };
}
