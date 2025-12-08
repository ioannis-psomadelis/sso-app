import { db, users, oauthClients, sessions, authorizationCodes, refreshTokens, tasks, documents, federatedIdentities } from './index.js';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcrypt';

// Production URLs (Railway)
const PROD_APP_A_URL = 'https://app-a-production-f5e2.up.railway.app';
const PROD_APP_B_URL = 'https://app-b-production-3770.up.railway.app';

// Local development URLs
const LOCAL_APP_A_URL = 'http://localhost:3001';
const LOCAL_APP_B_URL = 'http://localhost:3002';

async function seed() {
  console.log('Seeding database...');

  // Clear all tables (order matters for foreign keys)
  await db.delete(federatedIdentities);
  await db.delete(documents);
  await db.delete(tasks);
  await db.delete(refreshTokens);
  await db.delete(authorizationCodes);
  await db.delete(sessions);
  await db.delete(oauthClients);
  await db.delete(users);

  // Create demo user
  const userId = uuid();
  await db.insert(users).values({
    id: userId,
    email: 'demo@example.com',
    passwordHash: await bcrypt.hash('password123', 12),
    name: 'John Doe',
  });

  // Create OAuth clients with BOTH local and production redirect URIs
  // This allows the same database to work for both environments
  await db.insert(oauthClients).values([
    {
      id: 'app-a',
      secret: await bcrypt.hash('app-a-secret', 12),
      name: 'TaskFlow',
      redirectUris: JSON.stringify([
        `${LOCAL_APP_A_URL}/callback`,
        `${PROD_APP_A_URL}/callback`,
      ]),
    },
    {
      id: 'app-b',
      secret: await bcrypt.hash('app-b-secret', 12),
      name: 'DocVault',
      redirectUris: JSON.stringify([
        `${LOCAL_APP_B_URL}/callback`,
        `${PROD_APP_B_URL}/callback`,
      ]),
    },
  ]);

  console.log('Done. Demo user: demo@example.com / password123');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
