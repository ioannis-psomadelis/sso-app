import Fastify, { FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import cors from '@fastify/cors';
import crypto from 'crypto';

/**
 * Create a test Fastify instance with basic plugins
 */
export async function createTestApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });

  await fastify.register(cors, {
    origin: ['http://localhost:3001', 'http://localhost:3002'],
    credentials: true,
  });

  await fastify.register(cookie, {
    secret: 'test-cookie-secret',
  });

  await fastify.register(formbody);

  return fastify;
}

/**
 * Generate a valid PKCE code verifier
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate a code challenge from a code verifier using S256 method
 */
export function generateCodeChallenge(codeVerifier: string): string {
  return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
}

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    passwordHash: '$2b$12$test-hash', // bcrypt hash
    name: 'Test User',
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock OAuth client for testing
 */
export function createMockOAuthClient(overrides: Partial<MockOAuthClient> = {}): MockOAuthClient {
  return {
    id: 'app-a',
    name: 'TaskFlow',
    secret: 'hashed-secret',
    redirectUris: JSON.stringify(['http://localhost:3001/callback']),
    ...overrides,
  };
}

/**
 * Create a mock authorization code for testing
 */
export function createMockAuthCode(overrides: Partial<MockAuthCode> = {}): MockAuthCode {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  return {
    code: 'test-auth-code',
    clientId: 'app-a',
    userId: 'test-user-id',
    codeChallenge,
    codeChallengeMethod: 'S256',
    scope: 'openid profile email',
    redirectUri: 'http://localhost:3001/callback',
    nonce: null,
    expiresAt: new Date(Date.now() + 600000), // 10 minutes
    _codeVerifier: codeVerifier, // Store for testing
    ...overrides,
  };
}

/**
 * Create a mock session for testing
 */
export function createMockSession(overrides: Partial<MockSession> = {}): MockSession {
  return {
    id: 'test-session-id',
    userId: 'test-user-id',
    expiresAt: new Date(Date.now() + 86400000), // 24 hours
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock refresh token for testing
 */
export function createMockRefreshToken(overrides: Partial<MockRefreshToken> = {}): MockRefreshToken {
  return {
    token: 'test-refresh-token',
    userId: 'test-user-id',
    clientId: 'app-a',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    ...overrides,
  };
}

// Type definitions for mocks
export interface MockUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
}

export interface MockOAuthClient {
  id: string;
  name: string;
  secret: string;
  redirectUris: string;
}

export interface MockAuthCode {
  code: string;
  clientId: string;
  userId: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
  redirectUri: string;
  nonce: string | null;
  expiresAt: Date;
  _codeVerifier?: string;
}

export interface MockSession {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface MockRefreshToken {
  token: string;
  userId: string;
  clientId: string;
  expiresAt: Date;
}
