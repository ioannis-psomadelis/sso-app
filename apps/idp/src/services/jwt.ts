import { SignJWT, jwtVerify } from 'jose';
import type { User } from '@repo/db';
import { ACCESS_TOKEN_EXPIRY, ID_TOKEN_EXPIRY } from '../constants.js';

// Warn if using default JWT_SECRET in production
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: Using default JWT_SECRET in production is insecure!');
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production'
);
const ISSUER = process.env.IDP_URL || 'http://localhost:3000';

export async function generateAccessToken(user: User, clientId: string, scope: string): Promise<string> {
  return new SignJWT({
    sub: user.id,
    aud: clientId,
    scope,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

/**
 * Generate an ID token following OIDC spec
 * @param user - The authenticated user
 * @param clientId - The OAuth client requesting the token
 * @param nonce - Optional nonce from the authorization request (for replay attack prevention)
 */
export async function generateIdToken(user: User, clientId: string, nonce?: string): Promise<string> {
  const payload: Record<string, unknown> = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role, // RBAC: Include user role in ID token
  };

  // Include nonce if provided (OIDC requirement for implicit/hybrid flows, optional for auth code)
  if (nonce) {
    payload.nonce = nonce;
  }

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(clientId)
    .setExpirationTime(ID_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function generateRefreshToken(): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyAccessToken(token: string): Promise<{ sub: string; aud: string; scope: string }> {
  const { payload } = await jwtVerify(token, JWT_SECRET, {
    issuer: ISSUER,
    algorithms: ['HS256'], // Explicitly require HS256 to prevent algorithm confusion attacks
  });
  return payload as { sub: string; aud: string; scope: string };
}
