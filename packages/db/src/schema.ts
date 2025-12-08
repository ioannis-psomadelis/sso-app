import { pgTable, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const oauthClients = pgTable('oauth_clients', {
  id: text('id').primaryKey(),
  secret: text('secret').notNull(),
  name: text('name').notNull(),
  redirectUris: text('redirect_uris').notNull(), // JSON array
});

export const authorizationCodes = pgTable('authorization_codes', {
  code: text('code').primaryKey(),
  clientId: text('client_id').notNull().references(() => oauthClients.id),
  userId: text('user_id').notNull().references(() => users.id),
  codeChallenge: text('code_challenge').notNull(),
  codeChallengeMethod: text('code_challenge_method').notNull(),
  scope: text('scope').notNull(),
  redirectUri: text('redirect_uri').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  token: text('token').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  clientId: text('client_id').notNull().references(() => oauthClients.id),
  expiresAt: timestamp('expires_at').notNull(),
});

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  text: text('text').notNull(),
  completed: boolean('completed').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  size: integer('size').notNull(),
  mimeType: text('mime_type').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Links external IdP users to local users
export const federatedIdentities = pgTable('federated_identities', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  provider: text('provider').notNull(), // 'google'
  providerSub: text('provider_sub').notNull(),
  email: text('email'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type OAuthClient = typeof oauthClients.$inferSelect;
export type AuthorizationCode = typeof authorizationCodes.$inferSelect;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type FederatedIdentity = typeof federatedIdentities.$inferSelect;
export type NewFederatedIdentity = typeof federatedIdentities.$inferInsert;
