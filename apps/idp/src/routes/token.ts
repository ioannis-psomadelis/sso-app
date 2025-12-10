import { FastifyPluginAsync } from 'fastify';
import { db, users, authorizationCodes, refreshTokens } from '@repo/db';
import { eq } from 'drizzle-orm';
import { verifyPKCE } from '../services/pkce.js';
import { generateAccessToken, generateIdToken, generateRefreshToken } from '../services/jwt.js';
import { REFRESH_TOKEN_EXPIRY_MS, ACCESS_TOKEN_EXPIRY_SECONDS } from '../constants.js';

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

  // Use transaction to prevent race conditions on authorization code reuse
  // This ensures the code can only be used once even with concurrent requests
  try {
    const result = await db.transaction(async (tx) => {
      // Find auth code within transaction
      const authCodes = await tx
        .select()
        .from(authorizationCodes)
        .where(eq(authorizationCodes.code, code));
      const authCode = authCodes[0];

      if (!authCode) {
        throw new Error('invalid_grant:Invalid authorization code');
      }

      // Delete immediately to prevent reuse (within same transaction)
      await tx.delete(authorizationCodes).where(eq(authorizationCodes.code, code));

      // Check expiry after deletion
      if (authCode.expiresAt < new Date()) {
        throw new Error('invalid_grant:Authorization code expired');
      }

      if (authCode.clientId !== client_id || authCode.redirectUri !== redirect_uri) {
        throw new Error('invalid_grant:Client or redirect URI mismatch');
      }

      // Verify PKCE
      const pkceValid = await verifyPKCE(code_verifier, authCode.codeChallenge, authCode.codeChallengeMethod);
      if (!pkceValid) {
        throw new Error('invalid_grant:PKCE verification failed');
      }

      // Get user
      const userResults = await tx.select().from(users).where(eq(users.id, authCode.userId));
      const user = userResults[0];
      if (!user) {
        throw new Error('invalid_grant:User not found');
      }

      return { user, authCode };
    });

    // Generate tokens outside of transaction
    const accessToken = await generateAccessToken(result.user, client_id, result.authCode.scope);
    // Include nonce in ID token if it was provided in the authorization request
    const idToken = await generateIdToken(result.user, client_id, result.authCode.nonce || undefined);
    const refreshToken = await generateRefreshToken();

    // Store refresh token
    await db.insert(refreshTokens).values({
      token: refreshToken,
      userId: result.user.id,
      clientId: client_id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_EXPIRY_SECONDS,
      refresh_token: refreshToken,
      id_token: idToken,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const [errorCode, errorDescription] = message.includes(':')
      ? message.split(':')
      : ['invalid_grant', message];

    return reply.status(400).send({
      error: errorCode,
      error_description: errorDescription,
    });
  }
}

async function handleRefreshToken(body: Record<string, string>, reply: any) {
  const { refresh_token, client_id } = body;

  if (!refresh_token || !client_id) {
    return reply.status(400).send({ error: 'invalid_request' });
  }

  // Use transaction to prevent race conditions on refresh token rotation
  try {
    const result = await db.transaction(async (tx) => {
      const storedTokens = await tx
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.token, refresh_token));
      const storedToken = storedTokens[0];

      if (!storedToken || storedToken.clientId !== client_id) {
        throw new Error('invalid_grant:Invalid refresh token');
      }

      // Delete immediately to prevent reuse
      await tx.delete(refreshTokens).where(eq(refreshTokens.token, refresh_token));

      if (storedToken.expiresAt < new Date()) {
        throw new Error('invalid_grant:Refresh token expired');
      }

      // Get user
      const userResults = await tx.select().from(users).where(eq(users.id, storedToken.userId));
      const user = userResults[0];
      if (!user) {
        throw new Error('invalid_grant:User not found');
      }

      return { user, storedToken };
    });

    // Generate new tokens
    const accessToken = await generateAccessToken(result.user, client_id, 'openid profile email');
    const idToken = await generateIdToken(result.user, client_id);
    const newRefreshToken = await generateRefreshToken();

    // Store new refresh token
    await db.insert(refreshTokens).values({
      token: newRefreshToken,
      userId: result.user.id,
      clientId: client_id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_EXPIRY_SECONDS,
      refresh_token: newRefreshToken,
      id_token: idToken,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const [errorCode, errorDescription] = message.includes(':')
      ? message.split(':')
      : ['invalid_grant', message];

    return reply.status(400).send({
      error: errorCode,
      error_description: errorDescription,
    });
  }
}
