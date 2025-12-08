import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { verifyAccessToken } from '../services/tokenVerification.js';
import { ensureUserExists } from '../services/userSync.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    provider?: 'local' | 'google';
  }
}

/**
 * Auth middleware plugin for Fastify
 * Verifies Bearer token from Authorization header and adds userId/provider to request
 * Returns 401 if token is missing or invalid
 */
const authMiddleware: FastifyPluginAsync = async (fastify) => {

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.slice(7);

    try {
      const result = await verifyAccessToken(token);
      // Ensure user exists in local DB (creates placeholder for OAuth users)
      await ensureUserExists(result);
      request.userId = result.sub;
      request.provider = result.provider;
    } catch (error) {
      fastify.log.error({ err: error }, 'Token verification failed');
      return reply.status(401).send({
        error: 'invalid_token',
        message: 'Invalid or expired access token'
      });
    }
  });
};

export default fp(authMiddleware);
