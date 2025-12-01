// Token verification service - supports local JWT and Keycloak tokens

import { jwtVerify, decodeJwt } from 'jose';

const JWT_SECRET = new TextEncoder().encode('your-256-bit-secret-key-here');
const LOCAL_ISSUER = 'http://localhost:3000';

export interface TokenVerificationResult {
  sub: string;
  email?: string;
  name?: string;
  provider: 'local' | 'keycloak';
}

export async function verifyMultiProviderToken(token: string): Promise<TokenVerificationResult> {
  const decoded = decodeJwt(token);

  // Keycloak tokens have issuer containing 'realms'
  if (decoded.iss?.toString().includes('realms')) {
    const exp = decoded.exp as number;
    if (exp && Date.now() >= exp * 1000) {
      throw new Error('Token expired');
    }
    return {
      sub: decoded.sub as string,
      email: decoded.email as string | undefined,
      name: decoded.name as string | undefined,
      provider: 'keycloak',
    };
  }

  // Local JWT - verify signature
  const { payload } = await jwtVerify(token, JWT_SECRET, { issuer: LOCAL_ISSUER });
  return {
    sub: payload.sub as string,
    provider: 'local',
  };
}
