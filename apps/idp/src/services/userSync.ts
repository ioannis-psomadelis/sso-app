// User sync service for OAuth federation
// Auto-creates local user records for OAuth users (e.g., Google)

import { db, users } from '@repo/db';
import { eq } from 'drizzle-orm';
import type { TokenVerificationResult } from './tokenVerification.js';
import { OAUTH_USER_NO_PASSWORD } from '../constants.js';

/**
 * Ensures a user exists in the local database
 * Creates a placeholder user for external OAuth providers if needed
 */
export async function ensureUserExists(tokenResult: TokenVerificationResult): Promise<string> {
  const { sub, email, name, provider } = tokenResult;

  // Check if user already exists
  const results = await db.select().from(users).where(eq(users.id, sub));
  const existingUser = results[0];

  if (existingUser) {
    return existingUser.id;
  }

  // For external providers (Google), create a placeholder user
  if (provider !== 'local') {
    await db.insert(users).values({
      id: sub,
      email: email || `${sub}@${provider}.oauth`,
      passwordHash: OAUTH_USER_NO_PASSWORD,
      name: name || `${provider} User`,
    });
    return sub;
  }

  // For local provider, the user should already exist
  throw new Error('Local user not found');
}
