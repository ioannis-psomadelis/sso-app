import { FastifyPluginAsync } from 'fastify';
import { db, documents, tasks, users } from '@repo/db';
import { eq } from 'drizzle-orm';
import authMiddleware from '../../middleware/auth.js';

/**
 * Admin-only API routes
 * These endpoints require the 'admin' role to access
 */
export const adminRoute: FastifyPluginAsync = async (fastify) => {
  // Register auth middleware for this route
  await fastify.register(authMiddleware);

  // Admin role check hook - runs after auth middleware
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.userRole !== 'admin') {
      return reply.status(403).send({
        error: 'forbidden',
        message: 'Admin access required',
      });
    }
  });

  // GET /api/admin/documents - Get ALL documents from ALL users
  fastify.get('/api/admin/documents', async (request, reply) => {
    try {
      const allDocs = await db
        .select({
          id: documents.id,
          name: documents.name,
          size: documents.size,
          mimeType: documents.mimeType,
          createdAt: documents.createdAt,
          userId: documents.userId,
          userName: users.name,
          userEmail: users.email,
        })
        .from(documents)
        .leftJoin(users, eq(documents.userId, users.id));

      return {
        documents: allDocs.map((doc) => ({
          id: doc.id,
          name: doc.name,
          size: doc.size,
          mimeType: doc.mimeType,
          createdAt: doc.createdAt?.toISOString(),
          owner: {
            id: doc.userId,
            name: doc.userName,
            email: doc.userEmail,
          },
        })),
      };
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to fetch all documents');
      return reply.status(500).send({ error: 'internal_error', message: 'Failed to fetch documents' });
    }
  });

  // GET /api/admin/tasks - Get ALL tasks from ALL users
  fastify.get('/api/admin/tasks', async (request, reply) => {
    try {
      const allTasks = await db
        .select({
          id: tasks.id,
          text: tasks.text,
          completed: tasks.completed,
          createdAt: tasks.createdAt,
          userId: tasks.userId,
          userName: users.name,
          userEmail: users.email,
        })
        .from(tasks)
        .leftJoin(users, eq(tasks.userId, users.id));

      return {
        tasks: allTasks.map((task) => ({
          id: task.id,
          text: task.text,
          completed: task.completed,
          createdAt: task.createdAt?.toISOString(),
          owner: {
            id: task.userId,
            name: task.userName,
            email: task.userEmail,
          },
        })),
      };
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to fetch all tasks');
      return reply.status(500).send({ error: 'internal_error', message: 'Failed to fetch tasks' });
    }
  });

  // GET /api/admin/users - Get all users
  fastify.get('/api/admin/users', async (request, reply) => {
    try {
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      }).from(users);

      return {
        users: allUsers.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt?.toISOString(),
        })),
      };
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to fetch users');
      return reply.status(500).send({ error: 'internal_error', message: 'Failed to fetch users' });
    }
  });
};
