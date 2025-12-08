import { FastifyPluginAsync } from 'fastify';
import { deleteSession } from '../services/session.js';
import { db, refreshTokens } from '@repo/db';
import { eq } from 'drizzle-orm';

export const logoutRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post('/logout', async (request, reply) => {
    const sessionId = request.cookies.session_id;
    const { refresh_token } = (request.body as Record<string, string>) || {};

    if (sessionId) {
      await deleteSession(sessionId);
      reply.clearCookie('session_id', { path: '/' });
    }

    if (refresh_token) {
      await db.delete(refreshTokens).where(eq(refreshTokens.token, refresh_token));
    }

    return { success: true };
  });
};
