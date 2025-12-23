import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import cors from '@fastify/cors';

// Mock user data
const regularUserId = 'regular-user-id';
const adminUserId = 'admin-user-id';
const otherUserId = 'other-user-id';

const mockTask = {
  id: 'task-123',
  userId: otherUserId,
  text: 'Test task',
  completed: false,
  createdAt: new Date(),
};

const mockDocument = {
  id: 'doc-123',
  userId: otherUserId,
  name: 'test.pdf',
  size: 1024,
  mimeType: 'application/pdf',
  createdAt: new Date(),
};

// Track mock state
let mockTaskCompleted = false;
let mockTaskDeleted = false;
let mockDocDeleted = false;
let currentMockTaskUserId = otherUserId;
let currentMockDocUserId = otherUserId;

// Mock token verification
vi.mock('../services/tokenVerification.js', () => ({
  verifyAccessToken: vi.fn(async (token: string) => {
    if (token === 'admin-token') {
      return { sub: adminUserId, provider: 'local' };
    }
    if (token === 'regular-token') {
      return { sub: regularUserId, provider: 'local' };
    }
    throw new Error('Invalid token');
  }),
}));

// Mock user sync
vi.mock('../services/userSync.js', () => ({
  ensureUserExists: vi.fn(async () => {}),
  getUserRole: vi.fn(async (userId: string) => {
    if (userId === adminUserId) return 'admin';
    return 'user';
  }),
}));

// Track what type of resource is being queried
let mockResourceType: 'task' | 'document' = 'task';

// Mock database
vi.mock('@repo/db', () => {
  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn((table: any) => {
          // Determine resource type from table
          if (table === 'documents' || table?.id === 'id') {
            // Check table name in string representation
          }
          return {
            where: vi.fn(() => {
              // Return based on which resource type we're testing
              if (mockResourceType === 'task') {
                return Promise.resolve([{ ...mockTask, userId: currentMockTaskUserId, completed: mockTaskCompleted }]);
              } else {
                return Promise.resolve([{ ...mockDocument, userId: currentMockDocUserId }]);
              }
            }),
            orderBy: vi.fn(() => Promise.resolve([])),
          };
        }),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => Promise.resolve({ rowCount: 1 })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => {
            mockTaskCompleted = !mockTaskCompleted;
            return Promise.resolve({ rowCount: 1 });
          }),
        })),
      })),
      delete: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({ rowCount: 1 })),
      })),
    },
    tasks: { id: 'id', userId: 'userId' },
    documents: { id: 'id', userId: 'userId' },
    users: {},
    type: {} as any,
  };
});

describe('Admin Access to Tasks and Documents', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    // Reset mock state
    mockTaskCompleted = false;
    mockTaskDeleted = false;
    mockDocDeleted = false;
    currentMockTaskUserId = otherUserId;
    currentMockDocUserId = otherUserId;
    mockResourceType = 'task';
    vi.clearAllMocks();

    fastify = Fastify({ logger: false });
    await fastify.register(cors, { origin: true, credentials: true });
    await fastify.register(cookie, { secret: 'test' });
    await fastify.register(formbody);
  });

  afterEach(async () => {
    await fastify.close();
  });

  describe('PATCH /api/tasks/:id', () => {
    it('should allow admin to toggle any task', async () => {
      const { tasksApiRoute } = await import('../routes/api/tasks.js');
      await fastify.register(tasksApiRoute);

      const response = await fastify.inject({
        method: 'PATCH',
        url: '/api/tasks/task-123',
        headers: {
          Authorization: 'Bearer admin-token',
        },
      });

      // Admin should be able to toggle a task owned by another user
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.task).toBeDefined();
    });

    it('should allow regular user to toggle their own task', async () => {
      // Set task to be owned by regular user
      currentMockTaskUserId = regularUserId;

      const { tasksApiRoute } = await import('../routes/api/tasks.js');
      await fastify.register(tasksApiRoute);

      const response = await fastify.inject({
        method: 'PATCH',
        url: '/api/tasks/task-123',
        headers: {
          Authorization: 'Bearer regular-token',
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should reject regular user toggling another user task', async () => {
      // Task owned by otherUserId, not regularUserId
      currentMockTaskUserId = otherUserId;

      const { tasksApiRoute } = await import('../routes/api/tasks.js');
      await fastify.register(tasksApiRoute);

      // Mock db.select to return empty when checking with userId filter
      const { db } = await import('@repo/db');
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([])), // No task found (ownership check fails)
        })),
      } as any));

      const response = await fastify.inject({
        method: 'PATCH',
        url: '/api/tasks/task-123',
        headers: {
          Authorization: 'Bearer regular-token',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('not_found');
    });

    it('should return 401 without token', async () => {
      const { tasksApiRoute } = await import('../routes/api/tasks.js');
      await fastify.register(tasksApiRoute);

      const response = await fastify.inject({
        method: 'PATCH',
        url: '/api/tasks/task-123',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should allow admin to delete any task', async () => {
      const { tasksApiRoute } = await import('../routes/api/tasks.js');
      await fastify.register(tasksApiRoute);

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/tasks/task-123',
        headers: {
          Authorization: 'Bearer admin-token',
        },
      });

      // Admin should be able to delete a task owned by another user
      expect(response.statusCode).toBe(204);
    });

    it('should reject regular user deleting another user task', async () => {
      const { tasksApiRoute } = await import('../routes/api/tasks.js');
      await fastify.register(tasksApiRoute);

      // Mock db.select to return empty when checking with userId filter
      const { db } = await import('@repo/db');
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([])),
        })),
      } as any));

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/tasks/task-123',
        headers: {
          Authorization: 'Bearer regular-token',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/documents/:id', () => {
    it('should allow admin to delete any document', async () => {
      mockResourceType = 'document';
      const { documentsRoute } = await import('../routes/api/documents.js');
      await fastify.register(documentsRoute);

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/documents/doc-123',
        headers: {
          Authorization: 'Bearer admin-token',
        },
      });

      // Admin should be able to delete a document owned by another user
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should reject regular user deleting another user document', async () => {
      mockResourceType = 'document';
      currentMockDocUserId = otherUserId;

      const { documentsRoute } = await import('../routes/api/documents.js');
      await fastify.register(documentsRoute);

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/documents/doc-123',
        headers: {
          Authorization: 'Bearer regular-token',
        },
      });

      // Regular user should get 403 (not authorized) when trying to delete another user's doc
      expect(response.statusCode).toBe(403);
    });

    it('should allow regular user to delete their own document', async () => {
      mockResourceType = 'document';
      // Set document to be owned by regular user
      currentMockDocUserId = regularUserId;

      const { documentsRoute } = await import('../routes/api/documents.js');
      await fastify.register(documentsRoute);

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/documents/doc-123',
        headers: {
          Authorization: 'Bearer regular-token',
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
