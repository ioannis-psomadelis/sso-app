import { FastifyPluginAsync } from 'fastify';
import { db, tasks, type Task, type NewTask } from '@repo/db';
import { eq, and } from 'drizzle-orm';
import authMiddleware from '../../middleware/auth.js';

export const tasksApiRoute: FastifyPluginAsync = async (fastify) => {
  // Register auth middleware for this route
  await fastify.register(authMiddleware);

  // GET /api/tasks - Returns tasks for the authenticated user
  fastify.get('/api/tasks', async (request, reply) => {
    // userId is guaranteed to be set by auth middleware
    const userId = request.userId!;

    try {
      const userTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.userId, userId))
        .orderBy(tasks.createdAt);

      return { tasks: userTasks };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'internal_error', message: 'Failed to fetch tasks' });
    }
  });

  // POST /api/tasks - Creates a new task
  fastify.post('/api/tasks', async (request, reply) => {
    const userId = request.userId!;
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

      await db.insert(tasks).values(newTask);

      const results = await db.select().from(tasks).where(eq(tasks.id, newTask.id));
      const task = results[0];

      return reply.status(201).send({ task });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'internal_error', message: 'Failed to create task' });
    }
  });

  // PATCH /api/tasks/:id - Toggles task completion
  fastify.patch('/api/tasks/:id', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    try {
      // First check if the task exists and belongs to the user
      const results = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
      const task = results[0];

      if (!task) {
        return reply.status(404).send({ error: 'not_found', message: 'Task not found' });
      }

      // Toggle the completion status
      await db.update(tasks)
        .set({ completed: !task.completed })
        .where(eq(tasks.id, id));

      const updatedResults = await db.select().from(tasks).where(eq(tasks.id, id));
      const updatedTask = updatedResults[0];

      return { task: updatedTask };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'internal_error', message: 'Failed to update task' });
    }
  });

  // DELETE /api/tasks/:id - Deletes a task
  fastify.delete('/api/tasks/:id', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    try {
      // First check if the task exists and belongs to the user
      const results = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
      const task = results[0];

      if (!task) {
        return reply.status(404).send({ error: 'not_found', message: 'Task not found' });
      }

      await db.delete(tasks).where(eq(tasks.id, id));

      return reply.status(204).send();
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'internal_error', message: 'Failed to delete task' });
    }
  });
};
