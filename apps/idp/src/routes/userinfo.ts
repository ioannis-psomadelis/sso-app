import { FastifyPluginAsync } from 'fastify';
import { db, users } from '@repo/db';
import { eq } from 'drizzle-orm';
import { verifyAccessToken } from '../services/jwt.js';

export const userinfoRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/userinfo', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'invalid_token' });
    }

    const token = authHeader.slice(7);

    try {
      const payload = await verifyAccessToken(token);
      const results = await db.select().from(users).where(eq(users.id, payload.sub));
      const user = results[0];

      if (!user) {
        return reply.status(401).send({ error: 'invalid_token' });
      }

      return {
        sub: user.id,
        email: user.email,
        name: user.name,
      };
    } catch {
      return reply.status(401).send({ error: 'invalid_token' });
    }
  });
};
