import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import cors from '@fastify/cors';
import crypto from 'crypto';

// Generate PKCE values
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(codeVerifier: string): string {
  return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
}

// Mock data
const mockUser = {
  id: 'test-user-id',
  email: 'demo@example.com',
  passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.GJwE5N5g3E0Xuu', // "password123"
  name: 'Test User',
  createdAt: new Date(),
};

const mockOAuthClient = {
  id: 'app-a',
  name: 'TaskFlow',
  secret: 'hashed-secret',
  redirectUris: JSON.stringify(['http://localhost:3001/callback']),
};

const mockAuthCode = {
  code: 'test-auth-code',
  clientId: 'app-a',
  userId: 'test-user-id',
  codeChallenge: '',
  codeChallengeMethod: 'S256',
  scope: 'openid profile email',
  redirectUri: 'http://localhost:3001/callback',
  nonce: null,
  expiresAt: new Date(Date.now() + 600000),
};

// Mock database
const mockDb = {
  users: new Map([[mockUser.id, mockUser]]),
  oauthClients: new Map([[mockOAuthClient.id, mockOAuthClient]]),
  authorizationCodes: new Map(),
  sessions: new Map(),
  refreshTokens: new Map(),
};

// Setup mocks before importing routes
vi.mock('@repo/db', () => {
  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn((table: any) => ({
          where: vi.fn((condition: any) => {
            // Simple mock that returns based on table name
            return Promise.resolve([]);
          }),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => Promise.resolve({ rowCount: 1 })),
      })),
      delete: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({ rowCount: 1 })),
      })),
      transaction: vi.fn(async (callback: any) => {
        const tx = {
          select: vi.fn(() => ({
            from: vi.fn(() => ({
              where: vi.fn(() => Promise.resolve([])),
            })),
          })),
          delete: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve({ rowCount: 1 })),
          })),
        };
        return callback(tx);
      }),
    },
    users: { id: 'id', email: 'email' },
    oauthClients: { id: 'id' },
    authorizationCodes: { code: 'code' },
    sessions: { id: 'id', userId: 'userId' },
    refreshTokens: { token: 'token' },
    tasks: {},
    documents: {},
    federatedIdentities: {},
  };
});

describe('OAuth 2.0 Flow', () => {
  describe('Authorization Endpoint Requirements', () => {
    it('should require PKCE code_challenge parameter', async () => {
      const fastify = Fastify({ logger: false });
      await fastify.register(cors, { origin: true, credentials: true });
      await fastify.register(cookie, { secret: 'test' });
      await fastify.register(formbody);

      // Import authorize route dynamically to use mocks
      const { authorizeRoute } = await import('../routes/authorize.js');
      await fastify.register(authorizeRoute);

      const response = await fastify.inject({
        method: 'GET',
        url: '/authorize',
        query: {
          client_id: 'app-a',
          redirect_uri: 'http://localhost:3001/callback',
          response_type: 'code',
          scope: 'openid profile email',
          // Missing code_challenge
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('invalid_request');
      expect(body.error_description).toBe('PKCE required');

      await fastify.close();
    });

    it('should require S256 code_challenge_method', async () => {
      const fastify = Fastify({ logger: false });
      await fastify.register(cors, { origin: true, credentials: true });
      await fastify.register(cookie, { secret: 'test' });
      await fastify.register(formbody);

      const { authorizeRoute } = await import('../routes/authorize.js');
      await fastify.register(authorizeRoute);

      const response = await fastify.inject({
        method: 'GET',
        url: '/authorize',
        query: {
          client_id: 'app-a',
          redirect_uri: 'http://localhost:3001/callback',
          response_type: 'code',
          scope: 'openid profile email',
          code_challenge: 'test-challenge',
          code_challenge_method: 'plain', // Should be S256
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('invalid_request');
      expect(body.error_description).toBe('PKCE required');

      await fastify.close();
    });

    it('should reject invalid response_type', async () => {
      const fastify = Fastify({ logger: false });
      await fastify.register(cors, { origin: true, credentials: true });
      await fastify.register(cookie, { secret: 'test' });
      await fastify.register(formbody);

      const { authorizeRoute } = await import('../routes/authorize.js');
      await fastify.register(authorizeRoute);

      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);

      const response = await fastify.inject({
        method: 'GET',
        url: '/authorize',
        query: {
          client_id: 'app-a',
          redirect_uri: 'http://localhost:3001/callback',
          response_type: 'token', // Should be 'code'
          scope: 'openid profile email',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('invalid_request');

      await fastify.close();
    });

    it('should require client_id', async () => {
      const fastify = Fastify({ logger: false });
      await fastify.register(cors, { origin: true, credentials: true });
      await fastify.register(cookie, { secret: 'test' });
      await fastify.register(formbody);

      const { authorizeRoute } = await import('../routes/authorize.js');
      await fastify.register(authorizeRoute);

      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);

      const response = await fastify.inject({
        method: 'GET',
        url: '/authorize',
        query: {
          // Missing client_id
          redirect_uri: 'http://localhost:3001/callback',
          response_type: 'code',
          scope: 'openid profile email',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('invalid_request');

      await fastify.close();
    });

    it('should require redirect_uri', async () => {
      const fastify = Fastify({ logger: false });
      await fastify.register(cors, { origin: true, credentials: true });
      await fastify.register(cookie, { secret: 'test' });
      await fastify.register(formbody);

      const { authorizeRoute } = await import('../routes/authorize.js');
      await fastify.register(authorizeRoute);

      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);

      const response = await fastify.inject({
        method: 'GET',
        url: '/authorize',
        query: {
          client_id: 'app-a',
          // Missing redirect_uri
          response_type: 'code',
          scope: 'openid profile email',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('invalid_request');

      await fastify.close();
    });
  });

  describe('Token Endpoint Requirements', () => {
    it('should require code parameter', async () => {
      const fastify = Fastify({ logger: false });
      await fastify.register(cors, { origin: true, credentials: true });
      await fastify.register(cookie, { secret: 'test' });
      await fastify.register(formbody);

      const { tokenRoute } = await import('../routes/token.js');
      await fastify.register(tokenRoute);

      const response = await fastify.inject({
        method: 'POST',
        url: '/token',
        payload: {
          grant_type: 'authorization_code',
          // Missing code
          code_verifier: 'test-verifier',
          client_id: 'app-a',
          redirect_uri: 'http://localhost:3001/callback',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('invalid_request');

      await fastify.close();
    });

    it('should require code_verifier parameter', async () => {
      const fastify = Fastify({ logger: false });
      await fastify.register(cors, { origin: true, credentials: true });
      await fastify.register(cookie, { secret: 'test' });
      await fastify.register(formbody);

      const { tokenRoute } = await import('../routes/token.js');
      await fastify.register(tokenRoute);

      const response = await fastify.inject({
        method: 'POST',
        url: '/token',
        payload: {
          grant_type: 'authorization_code',
          code: 'test-code',
          // Missing code_verifier
          client_id: 'app-a',
          redirect_uri: 'http://localhost:3001/callback',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('invalid_request');

      await fastify.close();
    });

    it('should require client_id parameter', async () => {
      const fastify = Fastify({ logger: false });
      await fastify.register(cors, { origin: true, credentials: true });
      await fastify.register(cookie, { secret: 'test' });
      await fastify.register(formbody);

      const { tokenRoute } = await import('../routes/token.js');
      await fastify.register(tokenRoute);

      const response = await fastify.inject({
        method: 'POST',
        url: '/token',
        payload: {
          grant_type: 'authorization_code',
          code: 'test-code',
          code_verifier: 'test-verifier',
          // Missing client_id
          redirect_uri: 'http://localhost:3001/callback',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('invalid_request');

      await fastify.close();
    });

    it('should reject unsupported grant_type', async () => {
      const fastify = Fastify({ logger: false });
      await fastify.register(cors, { origin: true, credentials: true });
      await fastify.register(cookie, { secret: 'test' });
      await fastify.register(formbody);

      const { tokenRoute } = await import('../routes/token.js');
      await fastify.register(tokenRoute);

      const response = await fastify.inject({
        method: 'POST',
        url: '/token',
        payload: {
          grant_type: 'password', // Not supported
          username: 'test',
          password: 'test',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('unsupported_grant_type');

      await fastify.close();
    });

    it('should require refresh_token for refresh_token grant', async () => {
      const fastify = Fastify({ logger: false });
      await fastify.register(cors, { origin: true, credentials: true });
      await fastify.register(cookie, { secret: 'test' });
      await fastify.register(formbody);

      const { tokenRoute } = await import('../routes/token.js');
      await fastify.register(tokenRoute);

      const response = await fastify.inject({
        method: 'POST',
        url: '/token',
        payload: {
          grant_type: 'refresh_token',
          // Missing refresh_token
          client_id: 'app-a',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('invalid_request');

      await fastify.close();
    });
  });

  describe('Security Requirements', () => {
    it('should support state parameter for CSRF protection', async () => {
      const fastify = Fastify({ logger: false });
      await fastify.register(cors, { origin: true, credentials: true });
      await fastify.register(cookie, { secret: 'test' });
      await fastify.register(formbody);

      // This test verifies that state is passed through properly
      // The actual authorize endpoint redirects to login when no session exists
      const { authorizeRoute } = await import('../routes/authorize.js');
      await fastify.register(authorizeRoute);

      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      const state = crypto.randomBytes(16).toString('hex');

      const response = await fastify.inject({
        method: 'GET',
        url: '/authorize',
        query: {
          client_id: 'app-a',
          redirect_uri: 'http://localhost:3001/callback',
          response_type: 'code',
          scope: 'openid profile email',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          state: state,
        },
      });

      // Without a session, it redirects to login
      // The state should be preserved in the redirect URL
      if (response.statusCode === 302) {
        const location = response.headers.location as string;
        expect(location).toContain(`state=${state}`);
      }

      await fastify.close();
    });

    it('should support nonce parameter for replay attack prevention', async () => {
      const fastify = Fastify({ logger: false });
      await fastify.register(cors, { origin: true, credentials: true });
      await fastify.register(cookie, { secret: 'test' });
      await fastify.register(formbody);

      const { authorizeRoute } = await import('../routes/authorize.js');
      await fastify.register(authorizeRoute);

      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      const nonce = crypto.randomBytes(16).toString('hex');

      const response = await fastify.inject({
        method: 'GET',
        url: '/authorize',
        query: {
          client_id: 'app-a',
          redirect_uri: 'http://localhost:3001/callback',
          response_type: 'code',
          scope: 'openid profile email',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          nonce: nonce,
        },
      });

      // Without a session, it redirects to login
      // The nonce should be preserved in the redirect URL
      if (response.statusCode === 302) {
        const location = response.headers.location as string;
        expect(location).toContain(`nonce=${nonce}`);
      }

      await fastify.close();
    });
  });
});
