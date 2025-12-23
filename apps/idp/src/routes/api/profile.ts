import { FastifyPluginAsync } from 'fastify';
import { db, users, refreshTokens, sessions } from '@repo/db';
import { eq, and, ne } from 'drizzle-orm';
import authMiddleware from '../../middleware/auth.js';
import bcrypt from 'bcrypt';
import { OAUTH_USER_NO_PASSWORD } from '../../constants.js';

// Centralized bcrypt rounds constant
const BCRYPT_ROUNDS = 12;

function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 10) {
    return { valid: false, message: 'Password must be at least 10 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
}

export const profileApiRoute: FastifyPluginAsync = async (fastify) => {
  // Register auth middleware for this route
  await fastify.register(authMiddleware);

  // GET /api/profile - Returns the current user's profile
  fastify.get('/api/profile', async (request, reply) => {
    // userId is guaranteed to be set by auth middleware
    const userId = request.userId!;

    try {
      const results = await db.select().from(users).where(eq(users.id, userId));
      const user = results[0];

      if (!user) {
        return reply.status(404).send({ error: 'not_found', message: 'User not found' });
      }

      // Check if user has a local password (not OAuth-only)
      const hasLocalPassword = user.passwordHash !== OAUTH_USER_NO_PASSWORD;

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
          hasLocalPassword,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'internal_error', message: 'Failed to fetch profile' });
    }
  });

  // PATCH /api/profile - Updates the current user's profile
  fastify.patch('/api/profile', async (request, reply) => {
    const userId = request.userId!;
    const body = request.body as {
      name?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    try {
      // Fetch the current user
      const results = await db.select().from(users).where(eq(users.id, userId));
      const user = results[0];

      if (!user) {
        return reply.status(404).send({ error: 'not_found', message: 'User not found' });
      }

      // Validate input
      if (body.email !== undefined && typeof body.email !== 'string') {
        return reply.status(400).send({ error: 'invalid_request', message: 'Email must be a string' });
      }

      if (body.name !== undefined && typeof body.name !== 'string') {
        return reply.status(400).send({ error: 'invalid_request', message: 'Name must be a string' });
      }

      // Check if trying to change password
      let passwordChanged = false;
      if (body.newPassword) {
        const isOAuthOnlyUser = user.passwordHash === OAUTH_USER_NO_PASSWORD;

        // OAuth-only users can set a password without providing current password
        // Local users must provide their current password
        if (!isOAuthOnlyUser) {
          if (!body.currentPassword) {
            return reply
              .status(400)
              .send({ error: 'invalid_request', message: 'Current password is required to change password' });
          }

          // Verify current password
          const isValidPassword = await bcrypt.compare(body.currentPassword, user.passwordHash);
          if (!isValidPassword) {
            return reply.status(401).send({ error: 'unauthorized', message: 'Current password is incorrect' });
          }
        }

        // Validate new password
        const passwordValidation = validatePassword(body.newPassword);
        if (!passwordValidation.valid) {
          return reply.status(400).send({
            error: 'invalid_request',
            message: passwordValidation.message,
          });
        }

        passwordChanged = true;
      }

      // Build update object
      const updates: Partial<{
        name: string;
        email: string;
        passwordHash: string;
      }> = {};

      if (body.name !== undefined && body.name.trim().length > 0) {
        updates.name = body.name.trim();
      }

      if (body.email !== undefined && body.email.trim().length > 0) {
        if (!isValidEmail(body.email.trim())) {
          return reply.status(400).send({
            error: 'invalid_request',
            message: 'Invalid email format',
          });
        }
        // Check if email is already taken by another user
        const existingResults = await db.select().from(users).where(eq(users.email, body.email.trim()));
        const existingUser = existingResults[0];

        if (existingUser && existingUser.id !== userId) {
          return reply.status(409).send({ error: 'conflict', message: 'Email already in use' });
        }

        updates.email = body.email.trim();
      }

      if (body.newPassword) {
        updates.passwordHash = await bcrypt.hash(body.newPassword, BCRYPT_ROUNDS);
      }

      // If no updates, return current user
      if (Object.keys(updates).length === 0) {
        return reply.status(400).send({ error: 'invalid_request', message: 'No valid updates provided' });
      }

      // Update the user
      await db.update(users).set(updates).where(eq(users.id, userId));

      // If password was changed, invalidate all refresh tokens for security
      // This forces re-authentication on all devices
      if (passwordChanged) {
        await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));

        // Also invalidate all sessions except the current one
        // Get current session from cookie
        const currentSessionId = request.cookies.session_id;
        if (currentSessionId) {
          await db
            .delete(sessions)
            .where(and(eq(sessions.userId, userId), ne(sessions.id, currentSessionId)));
        } else {
          // No current session cookie, delete all sessions
          await db.delete(sessions).where(eq(sessions.userId, userId));
        }

        fastify.log.info(`Password changed for user ${userId}, invalidated all refresh tokens and sessions`);
      }

      // Fetch updated user
      const updatedResults = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, userId));
      const updatedUser = updatedResults[0];

      return {
        user: updatedUser,
        passwordChanged,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'internal_error', message: 'Failed to update profile' });
    }
  });
};
