# Single stage - run TypeScript directly with tsx
FROM node:22-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/idp/package.json ./apps/idp/
COPY packages/db/package.json ./packages/db/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY apps/idp/src ./apps/idp/src
COPY apps/idp/tsconfig.json ./apps/idp/
COPY packages/db/src ./packages/db/src
COPY packages/db/drizzle.config.ts ./packages/db/
COPY packages/db/tsconfig.json ./packages/db/

# Expose port (Railway will provide PORT env var)
EXPOSE 3000

# Set NODE_ENV to production
ENV NODE_ENV=production

# Run db:push (safe for production - only adds new columns/tables, doesn't delete data)
# Note: db:seed is NOT run in production - it would delete all data
# If you need to seed in production, run manually with FORCE_SEED=true
CMD ["sh", "-c", "pnpm --filter @repo/db db:push && pnpm --filter @repo/idp dev"]
