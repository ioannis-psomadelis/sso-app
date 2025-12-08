import { db, sessions } from '@repo/db';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function createSession(userId: string): Promise<string> {
  const sessionId = uuid();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
  });

  return sessionId;
}

export async function getSession(sessionId: string): Promise<{ userId: string } | null> {
  const results = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  const session = results[0];

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  return { userId: session.userId };
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}
