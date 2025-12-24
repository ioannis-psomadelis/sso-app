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

// Railway production URLs (always included)
const RAILWAY_APP_A_URL = 'https://a-app.up.railway.app';
const RAILWAY_APP_B_URL = 'https://b-app.up.railway.app';

// Local development URLs (always included)
const LOCAL_APP_A_URL = 'http://localhost:3001';
const LOCAL_APP_B_URL = 'http://localhost:3002';

// Build unique redirect URI lists (local + railway + any custom env URLs)
function buildRedirectUris(localUrl: string, railwayUrl: string, envUrl?: string): string[] {
  const uris = new Set([`${localUrl}/callback`, `${railwayUrl}/callback`]);
  // Add custom URL from env if provided and different
  if (envUrl && envUrl !== localUrl && envUrl !== railwayUrl) {
    uris.add(`${envUrl}/callback`);
  }
  return Array.from(uris);
}

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

  // Create demo user (regular user)
  const userId = uuid();
  await db.insert(users).values({
    id: userId,
    email: 'demo@example.com',
    passwordHash: await bcrypt.hash('password123', BCRYPT_ROUNDS),
    name: 'John Doe',
    role: 'user',
  });

  // Create admin user
  const adminId = uuid();
  await db.insert(users).values({
    id: adminId,
    email: 'admin@example.com',
    passwordHash: await bcrypt.hash('admin123', BCRYPT_ROUNDS),
    name: 'Admin User',
    role: 'admin',
  });

  // Create sample tasks for demo user
  await db.insert(tasks).values([
    { id: uuid(), userId, text: 'Complete OAuth 2.0 demo', completed: true },
    { id: uuid(), userId, text: 'Review PKCE implementation', completed: false },
    { id: uuid(), userId, text: 'Test SSO flow', completed: false },
  ]);

  // Create sample tasks for admin user
  await db.insert(tasks).values([
    { id: uuid(), userId: adminId, text: 'Review user permissions', completed: false },
    { id: uuid(), userId: adminId, text: 'Audit security settings', completed: true },
  ]);

  // Create sample documents for demo user
  await db.insert(documents).values([
    { id: uuid(), userId, name: 'project-proposal.pdf', size: 245678, mimeType: 'application/pdf' },
    { id: uuid(), userId, name: 'meeting-notes.docx', size: 34521, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  ]);

  // Create sample documents for admin user
  await db.insert(documents).values([
    { id: uuid(), userId: adminId, name: 'security-audit.pdf', size: 512000, mimeType: 'application/pdf' },
    { id: uuid(), userId: adminId, name: 'user-report.xlsx', size: 128000, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  ]);

  // Create OAuth clients with local, Railway, and any custom redirect URIs
  // This ensures the database works for both local dev and production
  const appARedirectUris = buildRedirectUris(LOCAL_APP_A_URL, RAILWAY_APP_A_URL, process.env.APP_A_URL);
  const appBRedirectUris = buildRedirectUris(LOCAL_APP_B_URL, RAILWAY_APP_B_URL, process.env.APP_B_URL);

  await db.insert(oauthClients).values([
    {
      id: 'app-a',
      secret: await bcrypt.hash('app-a-secret', BCRYPT_ROUNDS),
      name: 'TaskFlow',
      redirectUris: JSON.stringify(appARedirectUris),
    },
    {
      id: 'app-b',
      secret: await bcrypt.hash('app-b-secret', BCRYPT_ROUNDS),
      name: 'DocVault',
      redirectUris: JSON.stringify(appBRedirectUris),
    },
  ]);

  console.log('Done.');
  console.log('Demo user: demo@example.com / password123 (role: user)');
  console.log('Admin user: admin@example.com / admin123 (role: admin)');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
