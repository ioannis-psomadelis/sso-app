import { FastifyPluginAsync } from 'fastify';
import { db, tasks, type Task, type NewTask } from '@repo/db';
import { eq, and } from 'drizzle-orm';
import { verifyMultiProviderToken } from '../../services/tokenVerification.js';
import { ensureUserExists } from '../../services/userSync.js';

export const tasksApiRoute: FastifyPluginAsync = async (fastify) => {
  // Middleware to verify access token from any supported provider
  const verifyToken = async (request: any, reply: any) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'unauthorized', message: 'Missing or invalid authorization header' });
    }

    const token = authHeader.slice(7);

    try {
      const result = await verifyMultiProviderToken(token);
      // Ensure user exists in local DB (creates placeholder for OAuth users)
      await ensureUserExists(result);
      request.userId = result.sub;
      request.provider = result.provider;
    } catch (error) {
      fastify.log.error({ err: error }, 'Token verification failed');
      return reply.status(401).send({ error: 'invalid_token', message: 'Invalid or expired access token' });
    }
  };

  // GET /api/tasks - Returns tasks for the authenticated user
  fastify.get('/api/tasks', { preHandler: verifyToken }, async (request, reply) => {
    const userId = (request as any).userId;

    try {
      const userTasks = db
        .select()
        .from(tasks)
        .where(eq(tasks.userId, userId))
        .orderBy(tasks.createdAt)
        .all();

      return { tasks: userTasks };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'internal_error', message: 'Failed to fetch tasks' });
    }
  });

  // POST /api/tasks - Creates a new task
  fastify.post('/api/tasks', { preHandler: verifyToken }, async (request, reply) => {
    const userId = (request as any).userId;
    const body = request.body as { text: string };

    if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
      return reply.status(400).send({ error: 'invalid_request', message: 'Task text is required' });
    }

    try {
      const newTask: NewTask = {
        id: crypto.randomUUID(),
        userId,
        text: body.text.trim(),
        completed: false,
        createdAt: new Date(),
      };

      db.insert(tasks).values(newTask).run();

      const task = db.select().from(tasks).where(eq(tasks.id, newTask.id)).get();

      return reply.status(201).send({ task });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'internal_error', message: 'Failed to create task' });
    }
  });

  // PATCH /api/tasks/:id - Toggles task completion
  fastify.patch('/api/tasks/:id', { preHandler: verifyToken }, async (request, reply) => {
    const userId = (request as any).userId;
    const { id } = request.params as { id: string };

    try {
      // First check if the task exists and belongs to the user
      const task = db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
        .get();

      if (!task) {
        return reply.status(404).send({ error: 'not_found', message: 'Task not found' });
      }

      // Toggle the completion status
      db.update(tasks)
        .set({ completed: !task.completed })
        .where(eq(tasks.id, id))
        .run();

      const updatedTask = db.select().from(tasks).where(eq(tasks.id, id)).get();

      return { task: updatedTask };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'internal_error', message: 'Failed to update task' });
    }
  });

  // DELETE /api/tasks/:id - Deletes a task
  fastify.delete('/api/tasks/:id', { preHandler: verifyToken }, async (request, reply) => {
    const userId = (request as any).userId;
    const { id } = request.params as { id: string };

    try {
      // First check if the task exists and belongs to the user
      const task = db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
        .get();

      if (!task) {
        return reply.status(404).send({ error: 'not_found', message: 'Task not found' });
      }

      db.delete(tasks).where(eq(tasks.id, id)).run();

      return reply.status(204).send();
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'internal_error', message: 'Failed to delete task' });
    }
  });
};
