import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateConfig } from './validate.js';

describe('Config Validation', () => {
  // Store original env vars
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset to a valid test configuration
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_SECRET = 'test-jwt-secret-32-characters-long!!';
    process.env.COOKIE_SECRET = 'test-cookie-secret';
    process.env.IDP_URL = 'http://localhost:3000';
    process.env.APP_A_URL = 'http://localhost:3001';
    process.env.APP_B_URL = 'http://localhost:3002';
    process.env.CORS_ORIGINS = 'http://localhost:3001,http://localhost:3002';
  });

  afterEach(() => {
    // Restore original env vars
    process.env = { ...originalEnv };
  });

  describe('in development mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should return valid config with all variables set', () => {
      const config = validateConfig();

      expect(config.databaseUrl).toBe('postgresql://test:test@localhost:5432/test');
      expect(config.nodeEnv).toBe('development');
      expect(config.port).toBe(3000);
    });

    it('should use defaults when optional vars are not set', () => {
      delete process.env.JWT_SECRET;
      delete process.env.COOKIE_SECRET;
      delete process.env.CORS_ORIGINS;

      const config = validateConfig();

      expect(config.jwtSecret).toBe('dev-jwt-secret-change-in-production');
      expect(config.cookieSecret).toBe('dev-cookie-secret-change-in-production');
      expect(config.corsOrigins).toEqual(['http://localhost:3001', 'http://localhost:3002']);
    });

    it('should throw if DATABASE_URL is missing', () => {
      delete process.env.DATABASE_URL;

      expect(() => validateConfig()).toThrow('Missing required environment variables: DATABASE_URL');
    });

    it('should parse CORS_ORIGINS correctly', () => {
      process.env.CORS_ORIGINS = 'https://app1.com, https://app2.com , https://app3.com';

      const config = validateConfig();

      expect(config.corsOrigins).toEqual(['https://app1.com', 'https://app2.com', 'https://app3.com']);
    });

    it('should parse PORT correctly', () => {
      process.env.PORT = '4000';

      const config = validateConfig();

      expect(config.port).toBe(4000);
    });

    it('should use default PORT when not set', () => {
      delete process.env.PORT;

      const config = validateConfig();

      expect(config.port).toBe(3000);
    });
  });

  describe('in production mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      // Set all required production vars
      process.env.JWT_SECRET = 'production-jwt-secret-that-is-at-least-32-characters-long';
      process.env.COOKIE_SECRET = 'production-cookie-secret';
      process.env.CORS_ORIGINS = 'https://app-a.railway.app,https://app-b.railway.app';
      process.env.IDP_URL = 'https://idp.railway.app';
      process.env.APP_A_URL = 'https://app-a.railway.app';
      process.env.APP_B_URL = 'https://app-b.railway.app';
    });

    it('should return valid config with all production variables set', () => {
      const config = validateConfig();

      expect(config.nodeEnv).toBe('production');
      expect(config.idpUrl).toBe('https://idp.railway.app');
    });

    it('should throw if JWT_SECRET is missing in production', () => {
      delete process.env.JWT_SECRET;

      expect(() => validateConfig()).toThrow(/JWT_SECRET/);
    });

    it('should throw if COOKIE_SECRET is missing in production', () => {
      delete process.env.COOKIE_SECRET;

      expect(() => validateConfig()).toThrow(/COOKIE_SECRET/);
    });

    it('should throw if CORS_ORIGINS is missing in production', () => {
      delete process.env.CORS_ORIGINS;

      expect(() => validateConfig()).toThrow(/CORS_ORIGINS/);
    });

    it('should throw if IDP_URL is missing in production', () => {
      delete process.env.IDP_URL;

      expect(() => validateConfig()).toThrow(/IDP_URL/);
    });

    it('should throw if APP_A_URL is missing in production', () => {
      delete process.env.APP_A_URL;

      expect(() => validateConfig()).toThrow(/APP_A_URL/);
    });

    it('should throw if APP_B_URL is missing in production', () => {
      delete process.env.APP_B_URL;

      expect(() => validateConfig()).toThrow(/APP_B_URL/);
    });

    it('should throw if JWT_SECRET is too short in production', () => {
      process.env.JWT_SECRET = 'short'; // Less than 32 characters

      expect(() => validateConfig()).toThrow('JWT_SECRET must be at least 32 characters in production');
    });

    it('should list all missing variables in error message', () => {
      delete process.env.JWT_SECRET;
      delete process.env.COOKIE_SECRET;
      delete process.env.CORS_ORIGINS;

      expect(() => validateConfig()).toThrow(/JWT_SECRET.*COOKIE_SECRET.*CORS_ORIGINS/);
    });
  });

  describe('Google OAuth configuration', () => {
    it('should include Google credentials when set', () => {
      process.env.GOOGLE_CLIENT_ID = 'google-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';

      const config = validateConfig();

      expect(config.googleClientId).toBe('google-client-id');
      expect(config.googleClientSecret).toBe('google-client-secret');
    });

    it('should return undefined for Google credentials when not set', () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      const config = validateConfig();

      expect(config.googleClientId).toBeUndefined();
      expect(config.googleClientSecret).toBeUndefined();
    });
  });
});
