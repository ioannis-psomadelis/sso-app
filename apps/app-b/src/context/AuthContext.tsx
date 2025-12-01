import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from '@repo/ui';
import {
  getStoredTokens,
  storeTokens,
  clearTokens,
  generatePKCE,
  storeCodeVerifier,
  getCodeVerifier,
  clearCodeVerifier,
  storeAuthState,
  getAuthState,
  clearAuthState,
  decodeToken,
  debugEmitter,
} from '@repo/auth-client';

const IDP_URL = 'http://localhost:3000';
const CLIENT_ID = 'app-b';
const REDIRECT_URI = 'http://localhost:3002/callback';

interface User {
  sub: string;
  email: string;
  name: string;
}

interface Tokens {
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
}

interface DecodedTokens {
  accessToken: any | null;
  idToken: any | null;
}

interface AuthContextType {
  user: User | null;
  tokens: Tokens;
  decodedTokens: DecodedTokens;
  accessTokenExpiry: Date | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  loginWithKeycloak: () => void;
  logout: () => Promise<void>;
  handleCallback: (code: string, state: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<Tokens>({ accessToken: null, refreshToken: null, idToken: null });
  const [decodedTokens, setDecodedTokens] = useState<DecodedTokens>({ accessToken: null, idToken: null });
  const [accessTokenExpiry, setAccessTokenExpiry] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const stored = getStoredTokens();

      let hasValidSession = false;
      if (stored.accessToken) {
        try {
          const decoded = decodeToken(stored.accessToken);
          const exp = decoded.payload.exp as number;
          hasValidSession = exp * 1000 > Date.now();
        } catch {
          hasValidSession = false;
        }
      }

      if (hasValidSession && stored.accessToken) {
        debugEmitter.emit('session_check', 'Valid session restored from storage');
        setTokens(stored);
        try {
          const decodedAccess = decodeToken(stored.accessToken);
          const decodedId = stored.idToken ? decodeToken(stored.idToken) : null;
          setDecodedTokens({ accessToken: decodedAccess, idToken: decodedId });
          const exp = decodedAccess.payload.exp as number;
          setAccessTokenExpiry(new Date(exp * 1000));
          if (decodedId) {
            setUser({
              sub: decodedId.payload.sub as string,
              email: (decodedId.payload.email as string) || '',
              name: (decodedId.payload.name as string) || '',
            });
          }
        } catch {
          // Token decode failed
        }
      } else {
        debugEmitter.emit('session_check', 'No valid session found');
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  useEffect(() => {
    const checkAndRefreshToken = async () => {
      if (!tokens.accessToken || !tokens.refreshToken) return;

      let isExpired = false;
      let secondsLeft: number | null = null;

      try {
        const decoded = decodeToken(tokens.accessToken);
        const exp = decoded.payload.exp as number;
        const expiry = new Date(exp * 1000);
        secondsLeft = Math.floor((expiry.getTime() - Date.now()) / 1000);
        isExpired = secondsLeft <= 0;
      } catch {
        isExpired = true;
      }

      if (isExpired) {
        debugEmitter.emit('token_refresh_error', 'Access token expired, logging out');
        await logout();
        return;
      }

      if (secondsLeft !== null && secondsLeft <= 60 && secondsLeft > 0) {
        debugEmitter.emit('token_refresh_start', `Token expiring in ${secondsLeft}s, refreshing...`);

        try {
          const response = await fetch(`${IDP_URL}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              grant_type: 'refresh_token',
              refresh_token: tokens.refreshToken,
              client_id: CLIENT_ID,
            }),
          });

          if (!response.ok) {
            throw new Error('Token refresh failed');
          }

          const tokenResponse = await response.json();

          const newTokens = {
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token || tokens.refreshToken,
            idToken: tokenResponse.id_token || tokens.idToken,
          };

          storeTokens(newTokens);
          setTokens(newTokens);

          const decodedAccess = decodeToken(tokenResponse.access_token);
          const decodedId = tokenResponse.id_token ? decodeToken(tokenResponse.id_token) : null;
          setDecodedTokens({ accessToken: decodedAccess, idToken: decodedId });
          const exp = decodedAccess.payload.exp as number;
          setAccessTokenExpiry(new Date(exp * 1000));

          debugEmitter.emit('token_refresh_success', 'Tokens refreshed successfully');
          toast.success('Session refreshed');
        } catch {
          debugEmitter.emit('token_refresh_error', 'Token refresh failed');
          toast.error('Session expired, please sign in again');
          await logout();
        }
      }
    };

    const interval = setInterval(checkAndRefreshToken, 30000);
    checkAndRefreshToken();

    return () => clearInterval(interval);
  }, [tokens.accessToken, tokens.refreshToken]);

  const login = useCallback(async () => {
    const pkce = await generatePKCE();
    storeCodeVerifier(pkce.codeVerifier);
    debugEmitter.emit('pkce_generated', 'PKCE challenge generated', { codeChallenge: pkce.codeChallenge.slice(0, 20) + '...' });

    const state = crypto.randomUUID();
    storeAuthState('local', state);

    const url = new URL('/authorize', IDP_URL);
    url.searchParams.set('client_id', CLIENT_ID);
    url.searchParams.set('redirect_uri', REDIRECT_URI);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid profile email');
    url.searchParams.set('code_challenge', pkce.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('state', state);

    debugEmitter.emit('redirect_to_idp', 'Redirecting to Local IdP');
    window.location.href = url.toString();
  }, []);

  const loginWithKeycloak = useCallback(async () => {
    const pkce = await generatePKCE();
    storeCodeVerifier(pkce.codeVerifier);
    debugEmitter.emit('pkce_generated', 'PKCE challenge generated', { codeChallenge: pkce.codeChallenge.slice(0, 20) + '...' });

    const state = crypto.randomUUID();
    storeAuthState('keycloak', state);

    const url = new URL('/auth/federated/keycloak/start', IDP_URL);
    url.searchParams.set('client_id', CLIENT_ID);
    url.searchParams.set('redirect_uri', REDIRECT_URI);
    url.searchParams.set('code_challenge', pkce.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('state', state);
    url.searchParams.set('scope', 'openid profile email');

    debugEmitter.emit('redirect_to_idp', 'Redirecting to Keycloak via IdP');
    window.location.href = url.toString();
  }, []);

  const handleCallback = useCallback(async (code: string, state: string) => {
    const authState = getAuthState();
    if (!authState || authState.state !== state) {
      throw new Error('Invalid state parameter');
    }

    const codeVerifier = getCodeVerifier();
    if (!codeVerifier) {
      throw new Error('No code verifier found');
    }

    debugEmitter.emit('token_exchange_start', 'Exchanging authorization code for tokens');

    try {
      const response = await fetch(`${IDP_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          code_verifier: codeVerifier,
          client_id: CLIENT_ID,
          redirect_uri: REDIRECT_URI,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error_description || 'Token exchange failed');
      }

      const tokenResponse = await response.json();

      clearCodeVerifier();
      clearAuthState();

      const newTokens = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || '',
        idToken: tokenResponse.id_token || '',
      };

      storeTokens(newTokens);
      setTokens(newTokens);

      const decodedAccess = decodeToken(tokenResponse.access_token);
      const decodedId = tokenResponse.id_token ? decodeToken(tokenResponse.id_token) : null;
      setDecodedTokens({ accessToken: decodedAccess, idToken: decodedId });
      const exp = decodedAccess.payload.exp as number;
      setAccessTokenExpiry(new Date(exp * 1000));

      if (decodedId) {
        setUser({
          sub: decodedId.payload.sub as string,
          email: (decodedId.payload.email as string) || '',
          name: (decodedId.payload.name as string) || '',
        });
      }

      const providerName = authState.providerId === 'local' ? 'Local IdP' : 'Keycloak';
      debugEmitter.emit('token_exchange_success', `Authenticated with ${providerName}`, { tokens: ['access_token', 'id_token', 'refresh_token'] });
      toast.success(`Signed in with ${providerName}`);
    } catch (error) {
      debugEmitter.emit('token_exchange_error', 'Token exchange failed');
      toast.error('Sign in failed: ' + (error as Error).message);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    if (tokens.refreshToken) {
      try {
        await fetch(`${IDP_URL}/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refresh_token: tokens.refreshToken,
            client_id: CLIENT_ID,
          }),
        });
      } catch {
        // Logout request failed silently
      }
    }

    clearTokens();
    setTokens({ accessToken: null, refreshToken: null, idToken: null });
    setDecodedTokens({ accessToken: null, idToken: null });
    setUser(null);
    setAccessTokenExpiry(null);
    debugEmitter.emit('logout', 'User logged out, tokens cleared');
    toast.success('Signed out');
  }, [tokens.refreshToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        decodedTokens,
        accessTokenExpiry,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithKeycloak,
        logout,
        handleCallback,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
