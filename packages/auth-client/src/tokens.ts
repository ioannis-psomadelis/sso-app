// Token storage and decoding

import { decodeJwt } from 'jose';

export interface DecodedToken {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
}

export function decodeToken(token: string): DecodedToken {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
  const payload = decodeJwt(token);
  return { header, payload: payload as Record<string, unknown> };
}

export function isTokenExpired(token: string): boolean {
  try {
    const { payload } = decodeToken(token);
    const exp = payload.exp as number;
    if (!exp) return true;
    return Date.now() >= exp * 1000;
  } catch {
    return true;
  }
}

// Storage keys
const STORAGE_KEYS = {
  accessToken: 'sso_access_token',
  refreshToken: 'sso_refresh_token',
  idToken: 'sso_id_token',
  codeVerifier: 'sso_code_verifier',
  authState: 'sso_auth_state',
} as const;

export function storeTokens(tokens: {
  accessToken: string;
  refreshToken: string;
  idToken: string | null;
}): void {
  localStorage.setItem(STORAGE_KEYS.accessToken, tokens.accessToken);
  localStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refreshToken);
  if (tokens.idToken) {
    localStorage.setItem(STORAGE_KEYS.idToken, tokens.idToken);
  }
}

export function getStoredTokens(): {
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
} {
  return {
    accessToken: localStorage.getItem(STORAGE_KEYS.accessToken),
    refreshToken: localStorage.getItem(STORAGE_KEYS.refreshToken),
    idToken: localStorage.getItem(STORAGE_KEYS.idToken),
  };
}

export function clearTokens(): void {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.idToken);
  localStorage.removeItem(STORAGE_KEYS.codeVerifier);
  localStorage.removeItem(STORAGE_KEYS.authState);
}

export function storeCodeVerifier(verifier: string): void {
  localStorage.setItem(STORAGE_KEYS.codeVerifier, verifier);
}

export function getCodeVerifier(): string | null {
  return localStorage.getItem(STORAGE_KEYS.codeVerifier);
}

export function clearCodeVerifier(): void {
  localStorage.removeItem(STORAGE_KEYS.codeVerifier);
}

export function storeAuthState(providerId: string, state: string): void {
  localStorage.setItem(STORAGE_KEYS.authState, JSON.stringify({ providerId, state }));
}

export function getAuthState(): { providerId: string; state: string } | null {
  const stored = localStorage.getItem(STORAGE_KEYS.authState);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearAuthState(): void {
  localStorage.removeItem(STORAGE_KEYS.authState);
}
