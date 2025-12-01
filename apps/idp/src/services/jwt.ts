import { SignJWT, jwtVerify } from 'jose';
import type { User } from '@repo/db';

const JWT_SECRET = new TextEncoder().encode('your-256-bit-secret-key-here');
const ISSUER = 'http://localhost:3000';

export async function generateAccessToken(user: User, clientId: string, scope: string): Promise<string> {
  return new SignJWT({
    sub: user.id,
    aud: clientId,
    scope,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setExpirationTime('2m') // 2 minutes for educational purposes (was 15m)
    .sign(JWT_SECRET);
}

export async function generateIdToken(user: User, clientId: string): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(clientId)
    .setExpirationTime('1h')
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
  const { payload } = await jwtVerify(token, JWT_SECRET, { issuer: ISSUER });
  return payload as { sub: string; aud: string; scope: string };
}
