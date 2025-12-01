// User sync service for Keycloak federation
// Auto-creates local user records for Keycloak users

import { db, users } from '@repo/db';
import { eq } from 'drizzle-orm';
import type { TokenVerificationResult } from './tokenVerification.js';

/**
 * Ensures a user exists in the local database
 * Creates a placeholder user for external OAuth providers if needed
 */
export async function ensureUserExists(tokenResult: TokenVerificationResult): Promise<string> {
  const { sub, email, name, provider } = tokenResult;

  // Check if user already exists
  const existingUser = db.select().from(users).where(eq(users.id, sub)).get();

  if (existingUser) {
    return existingUser.id;
  }

  // For external providers, create a placeholder user
  if (provider !== 'local') {
    db.insert(users).values({
      id: sub,
      email: email || `${sub}@${provider}.oauth`,
      passwordHash: 'EXTERNAL_OAUTH_USER',
      name: name || `${provider} User`,
    }).run();
    return sub;
  }

  // For local provider, the user should already exist
  throw new Error('Local user not found');
}
