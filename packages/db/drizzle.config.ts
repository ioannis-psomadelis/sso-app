import { defineConfig } from 'drizzle-kit';

// Use DATABASE_URL for PostgreSQL connection
// Set via environment variable or root .env file
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
});
