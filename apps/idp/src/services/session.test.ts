import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to mock the database before importing the session module
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockSelect = vi.fn();

vi.mock('@repo/db', () => ({
  db: {
    insert: () => ({ values: mockInsert }),
    delete: () => ({ where: mockDelete }),
    select: () => ({
      from: () => ({
        where: mockSelect,
      }),
    }),
  },
  sessions: {
    id: 'id',
    userId: 'userId',
    expiresAt: 'expiresAt',
  },
}));

// Import after mocking
import { createSession, getSession, deleteSession } from './session.js';

describe('Session Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ rowCount: 1 });
    mockDelete.mockResolvedValue({ rowCount: 1 });
  });

  describe('createSession', () => {
    it('should create a session and return session ID', async () => {
      const userId = 'test-user-id';

      const sessionId = await createSession(userId);

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      // UUID v4 format
      expect(sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should insert session into database with correct values', async () => {
      const userId = 'test-user-id';

      await createSession(userId);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          id: expect.any(String),
          expiresAt: expect.any(Date),
        })
      );
    });

    it('should set expiration to 24 hours from now', async () => {
      const userId = 'test-user-id';
      const beforeCreate = Date.now();

      await createSession(userId);

      const insertCall = mockInsert.mock.calls[0][0];
      const expiresAt = insertCall.expiresAt.getTime();
      const expectedExpiry = beforeCreate + 24 * 60 * 60 * 1000;

      // Allow 1 second tolerance
      expect(expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(expiresAt).toBeLessThanOrEqual(expectedExpiry + 1000);
    });

    it('should generate unique session IDs', async () => {
      const userId = 'test-user-id';

      const sessionId1 = await createSession(userId);
      const sessionId2 = await createSession(userId);
      const sessionId3 = await createSession(userId);

      expect(sessionId1).not.toBe(sessionId2);
      expect(sessionId2).not.toBe(sessionId3);
      expect(sessionId1).not.toBe(sessionId3);
    });
  });

  describe('getSession', () => {
    it('should return session data for valid session', async () => {
      const mockSession = {
        id: 'test-session-id',
        userId: 'test-user-id',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      };
      mockSelect.mockResolvedValue([mockSession]);

      const result = await getSession('test-session-id');

      expect(result).toEqual({ userId: 'test-user-id' });
    });

    it('should return null for non-existent session', async () => {
      mockSelect.mockResolvedValue([]);

      const result = await getSession('non-existent-session');

      expect(result).toBeNull();
    });

    it('should return null and delete expired session', async () => {
      const mockSession = {
        id: 'test-session-id',
        userId: 'test-user-id',
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago (expired)
      };
      mockSelect.mockResolvedValue([mockSession]);

      const result = await getSession('test-session-id');

      expect(result).toBeNull();
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should not delete valid session', async () => {
      const mockSession = {
        id: 'test-session-id',
        userId: 'test-user-id',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      };
      mockSelect.mockResolvedValue([mockSession]);

      await getSession('test-session-id');

      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  describe('deleteSession', () => {
    it('should delete session from database', async () => {
      await deleteSession('test-session-id');

      expect(mockDelete).toHaveBeenCalled();
    });

    it('should not throw if session does not exist', async () => {
      mockDelete.mockResolvedValue({ rowCount: 0 });

      await expect(deleteSession('non-existent-session')).resolves.not.toThrow();
    });
  });
});
