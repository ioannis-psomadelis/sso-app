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

# Run db:push, db:seed, then start the server with tsx
CMD ["sh", "-c", "pnpm --filter @repo/db db:push && pnpm --filter @repo/db db:seed && pnpm --filter @repo/idp dev"]
