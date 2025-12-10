import { db, sessions, authorizationCodes, refreshTokens } from '@repo/db';
import { lt } from 'drizzle-orm';

/**
 * Cleanup expired data from the database
 * This should be run periodically to prevent database bloat
 */
export async function cleanupExpiredData(): Promise<{
  sessions: number;
  authCodes: number;
  refreshTokens: number;
}> {
  const now = new Date();

  // Delete expired sessions
  const sessionsResult = await db.delete(sessions).where(lt(sessions.expiresAt, now));

  // Delete expired authorization codes
  const authCodesResult = await db.delete(authorizationCodes).where(lt(authorizationCodes.expiresAt, now));

  // Delete expired refresh tokens
  const refreshTokensResult = await db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, now));

  return {
    sessions: sessionsResult.rowCount || 0,
    authCodes: authCodesResult.rowCount || 0,
    refreshTokens: refreshTokensResult.rowCount || 0,
  };
}

let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Start the cleanup job that runs every hour
 */
export function startCleanupJob(): void {
  // Run immediately on startup
  cleanupExpiredData()
    .then((result) => {
      console.log('Initial cleanup completed:', result);
    })
    .catch((err) => {
      console.error('Cleanup error:', err);
    });

  // Then run every hour
  cleanupInterval = setInterval(
    () => {
      cleanupExpiredData()
        .then((result) => {
          if (result.sessions > 0 || result.authCodes > 0 || result.refreshTokens > 0) {
            console.log('Cleanup completed:', result);
          }
        })
        .catch((err) => {
          console.error('Cleanup error:', err);
        });
    },
    60 * 60 * 1000 // 1 hour
  );
}

/**
 * Stop the cleanup job
 */
export function stopCleanupJob(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
