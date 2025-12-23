import { FastifyPluginAsync } from 'fastify';
import { db, documents } from '@repo/db';
import { eq } from 'drizzle-orm';
import authMiddleware from '../../middleware/auth.js';

export const documentsRoute: FastifyPluginAsync = async (fastify) => {
  // Register auth middleware for this route
  await fastify.register(authMiddleware);

  // GET /api/documents - Get all documents for authenticated user
  fastify.get('/api/documents', async (request, reply) => {
    try {
      // userId is guaranteed to be set by auth middleware
      const userDocs = await db.select().from(documents).where(eq(documents.userId, request.userId!));

      return {
        documents: userDocs.map((doc) => ({
          id: doc.id,
          name: doc.name,
          size: doc.size,
          mimeType: doc.mimeType,
          createdAt: doc.createdAt.toISOString(),
        })),
      };
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to fetch documents');
      return reply.status(500).send({ error: 'internal_error', message: 'Failed to fetch documents' });
    }
  });

  // POST /api/documents - Create a new document (simulated upload)
  fastify.post<{
    Body: { name: string; size: number; mimeType: string };
  }>('/api/documents', async (request, reply) => {
    try {
      const { name, size, mimeType } = request.body;

      if (!name || !size || !mimeType) {
        return reply.status(400).send({ error: 'Missing required fields: name, size, mimeType' });
      }

      const newDoc = {
        id: crypto.randomUUID(),
        userId: request.userId!,
        name,
        size,
        mimeType,
      };

      await db.insert(documents).values(newDoc);

      const results = await db.select().from(documents).where(eq(documents.id, newDoc.id));
      const createdDoc = results[0];

      return reply.status(201).send({
        document: {
          id: createdDoc!.id,
          name: createdDoc!.name,
          size: createdDoc!.size,
          mimeType: createdDoc!.mimeType,
          createdAt: createdDoc!.createdAt.toISOString(),
        },
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to create document');
      return reply.status(500).send({ error: 'internal_error', message: 'Failed to create document' });
    }
  });

  // DELETE /api/documents/:id - Delete a document
  // Admins can delete any document, regular users only their own
  fastify.delete<{
    Params: { id: string };
  }>('/api/documents/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const isAdmin = request.userRole === 'admin';

      // Verify the document exists
      const results = await db.select().from(documents).where(eq(documents.id, id));
      const doc = results[0];

      if (!doc) {
        return reply.status(404).send({ error: 'Document not found' });
      }

      // Admin can delete any document, regular users only their own
      if (!isAdmin && doc.userId !== request.userId!) {
        return reply.status(403).send({ error: 'Not authorized to delete this document' });
      }

      await db.delete(documents).where(eq(documents.id, id));

      return { success: true };
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to delete document');
      return reply.status(500).send({ error: 'internal_error', message: 'Failed to delete document' });
    }
  });
};
