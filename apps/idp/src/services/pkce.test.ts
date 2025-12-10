import { describe, it, expect } from 'vitest';
import { verifyPKCE } from './pkce.js';
import crypto from 'crypto';

/**
 * Generate a valid code verifier (43-128 characters, URL-safe)
 */
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate a code challenge using S256 method
 */
function generateCodeChallenge(codeVerifier: string): string {
  return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
}

describe('PKCE Service', () => {
  describe('verifyPKCE', () => {
    it('should return true for valid code verifier and challenge pair', async () => {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);

      const result = await verifyPKCE(codeVerifier, codeChallenge, 'S256');

      expect(result).toBe(true);
    });

    it('should return false for invalid code verifier', async () => {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);

      // Use a different verifier
      const wrongVerifier = generateCodeVerifier();

      const result = await verifyPKCE(wrongVerifier, codeChallenge, 'S256');

      expect(result).toBe(false);
    });

    it('should return false for tampered code challenge', async () => {
      const codeVerifier = generateCodeVerifier();
      const tamperedChallenge = 'tampered_challenge_value_that_does_not_match';

      const result = await verifyPKCE(codeVerifier, tamperedChallenge, 'S256');

      expect(result).toBe(false);
    });

    it('should throw error for unsupported method (plain)', async () => {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = codeVerifier; // Plain method would use verifier as challenge

      await expect(verifyPKCE(codeVerifier, codeChallenge, 'plain')).rejects.toThrow(
        'Only S256 code challenge method is supported'
      );
    });

    it('should throw error for unknown method', async () => {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);

      await expect(verifyPKCE(codeVerifier, codeChallenge, 'unknown')).rejects.toThrow(
        'Only S256 code challenge method is supported'
      );
    });

    it('should handle empty code verifier', async () => {
      const codeChallenge = generateCodeChallenge('some-verifier');

      const result = await verifyPKCE('', codeChallenge, 'S256');

      expect(result).toBe(false);
    });

    it('should handle special characters in code verifier', async () => {
      // Base64url encoded values can contain -, _
      const codeVerifier = 'abc-def_ghi123ABC';
      const codeChallenge = generateCodeChallenge(codeVerifier);

      const result = await verifyPKCE(codeVerifier, codeChallenge, 'S256');

      expect(result).toBe(true);
    });

    it('should handle minimum length code verifier (43 chars)', async () => {
      // RFC 7636 specifies minimum 43 characters
      const codeVerifier = 'a'.repeat(43);
      const codeChallenge = generateCodeChallenge(codeVerifier);

      const result = await verifyPKCE(codeVerifier, codeChallenge, 'S256');

      expect(result).toBe(true);
    });

    it('should handle maximum length code verifier (128 chars)', async () => {
      // RFC 7636 specifies maximum 128 characters
      const codeVerifier = 'a'.repeat(128);
      const codeChallenge = generateCodeChallenge(codeVerifier);

      const result = await verifyPKCE(codeVerifier, codeChallenge, 'S256');

      expect(result).toBe(true);
    });

    it('should be case sensitive for method', async () => {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);

      // s256 instead of S256
      await expect(verifyPKCE(codeVerifier, codeChallenge, 's256')).rejects.toThrow(
        'Only S256 code challenge method is supported'
      );
    });
  });
});
