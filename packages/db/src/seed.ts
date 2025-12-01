import { db, users, oauthClients, sessions, authorizationCodes, refreshTokens, tasks, documents, federatedIdentities } from './index.js';
import { v4 as uuid } from 'uuid';
import { createHash } from 'crypto';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

async function seed() {
  console.log('Seeding database...');

  // Clear all tables (order matters for foreign keys)
  db.delete(federatedIdentities).run();
  db.delete(documents).run();
  db.delete(tasks).run();
  db.delete(refreshTokens).run();
  db.delete(authorizationCodes).run();
  db.delete(sessions).run();
  db.delete(oauthClients).run();
  db.delete(users).run();

  // Create demo user
  const userId = uuid();
  db.insert(users).values({
    id: userId,
    email: 'demo@example.com',
    passwordHash: hashPassword('password123'),
    name: 'John Doe',
  }).run();

  // Create OAuth clients
  db.insert(oauthClients).values([
    {
      id: 'app-a',
      secret: hashPassword('app-a-secret'),
      name: 'TaskFlow',
      redirectUris: JSON.stringify(['http://localhost:3001/callback']),
    },
    {
      id: 'app-b',
      secret: hashPassword('app-b-secret'),
      name: 'DocVault',
      redirectUris: JSON.stringify(['http://localhost:3002/callback']),
    },
  ]).run();

  console.log('Done. Demo user: demo@example.com / password123');
}

seed().catch(console.error);
