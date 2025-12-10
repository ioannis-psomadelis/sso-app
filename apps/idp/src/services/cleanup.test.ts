import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Track mock results and calls
let sessionsResult = { rowCount: 0 };
let authCodesResult = { rowCount: 0 };
let refreshTokensResult = { rowCount: 0 };
let deleteCallCount = 0;

vi.mock('@repo/db', () => {
  return {
    db: {
      delete: vi.fn((table: any) => {
        return {
          where: vi.fn(() => {
            // Increment call count for tracking
            deleteCallCount++;

            // Return appropriate result based on table
            if (table.description === 'sessions') {
              return Promise.resolve(sessionsResult);
            }
            if (table.description === 'authorizationCodes') {
              return Promise.resolve(authCodesResult);
            }
            if (table.description === 'refreshTokens') {
              return Promise.resolve(refreshTokensResult);
            }
            return Promise.resolve({ rowCount: 0 });
          }),
        };
      }),
    },
    sessions: { description: 'sessions' },
    authorizationCodes: { description: 'authorizationCodes' },
    refreshTokens: { description: 'refreshTokens' },
    lt: vi.fn((a, b) => ({ op: 'lt', a, b })),
  };
});

import { cleanupExpiredData, startCleanupJob, stopCleanupJob } from './cleanup.js';

describe('Cleanup Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset mock state
    sessionsResult = { rowCount: 0 };
    authCodesResult = { rowCount: 0 };
    refreshTokensResult = { rowCount: 0 };
    deleteCallCount = 0;
  });

  afterEach(() => {
    stopCleanupJob();
    vi.useRealTimers();
  });

  describe('cleanupExpiredData', () => {
    it('should return counts of deleted records', async () => {
      sessionsResult = { rowCount: 5 };
      authCodesResult = { rowCount: 3 };
      refreshTokensResult = { rowCount: 2 };

      const result = await cleanupExpiredData();

      expect(result).toEqual({
        sessions: 5,
        authCodes: 3,
        refreshTokens: 2,
      });
    });

    it('should return zero when no records to delete', async () => {
      sessionsResult = { rowCount: 0 };
      authCodesResult = { rowCount: 0 };
      refreshTokensResult = { rowCount: 0 };

      const result = await cleanupExpiredData();

      expect(result).toEqual({
        sessions: 0,
        authCodes: 0,
        refreshTokens: 0,
      });
    });

    it('should handle null rowCount gracefully', async () => {
      sessionsResult = { rowCount: null } as any;
      authCodesResult = {} as any;
      refreshTokensResult = { rowCount: undefined } as any;

      const result = await cleanupExpiredData();

      expect(result).toEqual({
        sessions: 0,
        authCodes: 0,
        refreshTokens: 0,
      });
    });

    it('should call delete for all three tables', async () => {
      await cleanupExpiredData();

      // Should have called delete 3 times (sessions, authCodes, refreshTokens)
      expect(deleteCallCount).toBe(3);
    });
  });

  describe('startCleanupJob', () => {
    it('should run cleanup immediately on start', async () => {
      sessionsResult = { rowCount: 1 };
      authCodesResult = { rowCount: 1 };
      refreshTokensResult = { rowCount: 1 };

      startCleanupJob();

      // Wait a short time for the immediate async cleanup to run
      await vi.advanceTimersByTimeAsync(10);

      // Should have made 3 delete calls for the initial cleanup
      expect(deleteCallCount).toBe(3);
    });

    it('should schedule cleanup every hour', async () => {
      startCleanupJob();

      // Wait for initial cleanup (short time)
      await vi.advanceTimersByTimeAsync(10);
      expect(deleteCallCount).toBe(3);

      // Reset counter
      deleteCallCount = 0;

      // Fast-forward 1 hour
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

      // Should have run cleanup again (3 more delete calls)
      expect(deleteCallCount).toBe(3);
    });

    it('should continue running after multiple intervals', async () => {
      startCleanupJob();

      // Wait for initial cleanup
      await vi.advanceTimersByTimeAsync(10);
      const initialCount = deleteCallCount;

      // Fast-forward 2 hours - should run twice more
      await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1000);

      // Should have run cleanup 2 more times (6 more delete calls)
      expect(deleteCallCount).toBe(initialCount + 6);
    });
  });

  describe('stopCleanupJob', () => {
    it('should stop the cleanup interval', async () => {
      startCleanupJob();

      // Wait for initial cleanup
      await vi.advanceTimersByTimeAsync(10);
      expect(deleteCallCount).toBe(3);

      stopCleanupJob();

      // Reset counter
      deleteCallCount = 0;

      // Fast-forward 2 hours
      await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1000);

      // Should not have run again after stopping
      expect(deleteCallCount).toBe(0);
    });

    it('should be safe to call multiple times', () => {
      startCleanupJob();

      expect(() => {
        stopCleanupJob();
        stopCleanupJob();
        stopCleanupJob();
      }).not.toThrow();
    });

    it('should be safe to call when not started', () => {
      expect(() => {
        stopCleanupJob();
      }).not.toThrow();
    });
  });
});
