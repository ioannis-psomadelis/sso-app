// Token expiration times
export const ACCESS_TOKEN_EXPIRY = '2m';  // 2 minutes
export const ACCESS_TOKEN_EXPIRY_SECONDS = 120; // 2 minutes in seconds
export const ID_TOKEN_EXPIRY = '1h';      // 1 hour
export const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

// Authorization code
export const AUTH_CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// Session
export const SESSION_DURATION_SECONDS = 24 * 60 * 60; // 24 hours
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

// Federation state cookie
export const FEDERATION_STATE_EXPIRY_SECONDS = 600; // 10 minutes

// OAuth user sentinel values
export const OAUTH_USER_NO_PASSWORD = 'OAUTH_USER_NO_LOCAL_PASSWORD';
