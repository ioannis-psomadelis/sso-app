import { FastifyPluginAsync } from 'fastify';
import { db, documents } from '@repo/db';
import { eq } from 'drizzle-orm';
import { verifyMultiProviderToken } from '../../services/tokenVerification.js';
import { ensureUserExists } from '../../services/userSync.js';

export const documentsRoute: FastifyPluginAsync = async (fastify) => {
  // GET /api/documents - Get all documents for authenticated user
  fastify.get('/api/documents', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.slice(7);

    try {
      const result = await verifyMultiProviderToken(token);
      await ensureUserExists(result);
      const userDocs = db.select().from(documents).where(eq(documents.userId, result.sub)).all();

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
      fastify.log.error({ err: error }, 'Token verification failed');
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }
  });

  // POST /api/documents - Create a new document (simulated upload)
  fastify.post<{
    Body: { name: string; size: number; mimeType: string };
  }>('/api/documents', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.slice(7);

    try {
      const result = await verifyMultiProviderToken(token);
      await ensureUserExists(result);
      const { name, size, mimeType } = request.body;

      if (!name || !size || !mimeType) {
        return reply.status(400).send({ error: 'Missing required fields: name, size, mimeType' });
      }

      const newDoc = {
        id: crypto.randomUUID(),
        userId: result.sub,
        name,
        size,
        mimeType,
      };

      db.insert(documents).values(newDoc).run();

      const createdDoc = db.select().from(documents).where(eq(documents.id, newDoc.id)).get();

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
      fastify.log.error({ err: error }, 'Token verification failed');
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }
  });

  // DELETE /api/documents/:id - Delete a document
  fastify.delete<{
    Params: { id: string };
  }>('/api/documents/:id', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.slice(7);

    try {
      const result = await verifyMultiProviderToken(token);
      await ensureUserExists(result);
      const { id } = request.params;

      // Verify the document belongs to the user
      const doc = db.select().from(documents).where(eq(documents.id, id)).get();

      if (!doc) {
        return reply.status(404).send({ error: 'Document not found' });
      }

      if (doc.userId !== result.sub) {
        return reply.status(403).send({ error: 'Not authorized to delete this document' });
      }

      db.delete(documents).where(eq(documents.id, id)).run();

      return { success: true };
    } catch (error) {
      fastify.log.error({ err: error }, 'Token verification failed');
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }
  });
};
