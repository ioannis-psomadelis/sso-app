// OAuth flow helpers

export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  idpBaseUrl: string;
  scope?: string;
}

export interface AuthorizationParams {
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  state?: string;
}

export function buildAuthorizationUrl(
  config: OAuthConfig,
  params: AuthorizationParams
): string {
  const url = new URL('/authorize', config.idpBaseUrl);

  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scope || 'openid profile email');
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', params.codeChallengeMethod);

  if (params.state) {
    url.searchParams.set('state', params.state);
  }

  return url.toString();
}

export interface TokenRequest {
  code: string;
  codeVerifier: string;
  clientId: string;
  redirectUri: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  id_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

export async function exchangeCodeForTokens(
  idpBaseUrl: string,
  request: TokenRequest
): Promise<TokenResponse> {
  const response = await fetch(`${idpBaseUrl}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: request.code,
      code_verifier: request.codeVerifier,
      client_id: request.clientId,
      redirect_uri: request.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Token exchange failed');
  }

  return response.json();
}

export async function refreshAccessToken(
  idpBaseUrl: string,
  refreshToken: string,
  clientId: string
): Promise<TokenResponse> {
  const response = await fetch(`${idpBaseUrl}/token/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Token refresh failed');
  }

  return response.json();
}

// Convenience wrapper for refreshTokens
export interface RefreshTokensRequest {
  idpUrl: string;
  refreshToken: string;
  clientId: string;
}

export async function refreshTokens(
  idpUrl: string,
  refreshToken: string,
  clientId: string
): Promise<TokenResponse> {
  return refreshAccessToken(idpUrl, refreshToken, clientId);
}
