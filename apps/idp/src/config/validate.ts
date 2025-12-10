// Environment variable validation - must run before server starts

export interface ValidatedConfig {
  databaseUrl: string;
  jwtSecret: string;
  cookieSecret: string;
  idpUrl: string;
  appAUrl: string;
  appBUrl: string;
  corsOrigins: string[];
  nodeEnv: string;
  port: number;
  googleClientId?: string;
  googleClientSecret?: string;
}

export function validateConfig(): ValidatedConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  // Required in all environments
  const requiredVars = ['DATABASE_URL'];

  // Required in production
  if (isProduction) {
    requiredVars.push(
      'JWT_SECRET',
      'COOKIE_SECRET',
      'CORS_ORIGINS',
      'IDP_URL',
      'APP_A_URL',
      'APP_B_URL'
    );
  }

  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please set these variables before starting the server.'
    );
  }

  // Validate JWT_SECRET strength in production
  if (isProduction) {
    const jwtSecret = process.env.JWT_SECRET!;
    if (jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters in production');
    }
    if (jwtSecret.includes('dev') || jwtSecret.includes('secret') || jwtSecret.includes('change')) {
      console.warn('WARNING: JWT_SECRET appears to be a default/development value');
    }
  }

  // Parse CORS origins
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3001', 'http://localhost:3002'];

  // Validate URLs in production
  if (isProduction) {
    const urlVars = ['IDP_URL', 'APP_A_URL', 'APP_B_URL'];
    for (const varName of urlVars) {
      const url = process.env[varName];
      if (url && !url.startsWith('https://')) {
        console.warn(`WARNING: ${varName} should use HTTPS in production`);
      }
    }
  }

  return {
    databaseUrl: process.env.DATABASE_URL!,
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
    cookieSecret: process.env.COOKIE_SECRET || 'dev-cookie-secret-change-in-production',
    idpUrl: process.env.IDP_URL || 'http://localhost:3000',
    appAUrl: process.env.APP_A_URL || 'http://localhost:3001',
    appBUrl: process.env.APP_B_URL || 'http://localhost:3002',
    corsOrigins,
    nodeEnv,
    port: parseInt(process.env.PORT || '3000', 10),
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
}
