import {
  db,
  users,
  oauthClients,
  sessions,
  authorizationCodes,
  refreshTokens,
  tasks,
  documents,
  federatedIdentities,
} from './index.js';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcrypt';

// Production URLs (Railway) - from environment or defaults
const PROD_APP_A_URL = process.env.APP_A_URL || 'https://a-app.up.railway.app';
const PROD_APP_B_URL = process.env.APP_B_URL || 'https://b-app.up.railway.app';

// Local development URLs
const LOCAL_APP_A_URL = 'http://localhost:3001';
const LOCAL_APP_B_URL = 'http://localhost:3002';

// Centralized bcrypt rounds
const BCRYPT_ROUNDS = 12;

async function seed() {
  // Safety check: Don't run destructive seed in production unless explicitly forced
  const isProduction = process.env.NODE_ENV === 'production';
  const forceFlag = process.env.FORCE_SEED === 'true';

  if (isProduction && !forceFlag) {
    console.log('Skipping seed in production environment.');
    console.log('To run seed in production, set FORCE_SEED=true');
    process.exit(0);
  }

  if (isProduction && forceFlag) {
    console.warn('WARNING: Running seed in production with FORCE_SEED=true');
    console.warn('This will DELETE ALL DATA in the database!');
    // Give 3 seconds to cancel
    console.log('Starting in 3 seconds... Press Ctrl+C to cancel');
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

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
    passwordHash: await bcrypt.hash('password123', BCRYPT_ROUNDS),
    name: 'John Doe',
  });

  // Create OAuth clients with BOTH local and production redirect URIs
  // This allows the same database to work for both environments
  await db.insert(oauthClients).values([
    {
      id: 'app-a',
      secret: await bcrypt.hash('app-a-secret', BCRYPT_ROUNDS),
      name: 'TaskFlow',
      redirectUris: JSON.stringify([`${LOCAL_APP_A_URL}/callback`, `${PROD_APP_A_URL}/callback`]),
    },
    {
      id: 'app-b',
      secret: await bcrypt.hash('app-b-secret', BCRYPT_ROUNDS),
      name: 'DocVault',
      redirectUris: JSON.stringify([`${LOCAL_APP_B_URL}/callback`, `${PROD_APP_B_URL}/callback`]),
    },
  ]);

  console.log('Done. Demo user: demo@example.com / password123');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
