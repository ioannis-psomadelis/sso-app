# Stage 1: Build
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/app-a/package.json ./apps/app-a/
COPY packages/auth-client/package.json ./packages/auth-client/
COPY packages/ui/package.json ./packages/ui/
COPY packages/shared-app/package.json ./packages/shared-app/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY apps/app-a ./apps/app-a
COPY packages/auth-client ./packages/auth-client
COPY packages/ui ./packages/ui
COPY packages/shared-app ./packages/shared-app

# Build arguments for environment variables (injected at build time)
ARG VITE_IDP_URL
ARG VITE_APP_URL
ARG VITE_OTHER_APP_URL

ENV VITE_IDP_URL=$VITE_IDP_URL
ENV VITE_APP_URL=$VITE_APP_URL
ENV VITE_OTHER_APP_URL=$VITE_OTHER_APP_URL

# Build the packages and app
RUN pnpm --filter @repo/ui build || true
RUN pnpm --filter @repo/auth-client build || true
RUN pnpm --filter @repo/shared-app build
RUN pnpm --filter @repo/app-a build

# Stage 2: Production with nginx
FROM nginx:alpine AS production

# Copy custom nginx config template
COPY apps/app-a/nginx.conf /etc/nginx/templates/default.conf.template

# Copy built static files
COPY --from=builder /app/apps/app-a/dist /usr/share/nginx/html

# Default port for Railway
ENV PORT=80

# Use sed to substitute PORT (avoids envsubst conflicts with nginx $uri variables)
CMD ["sh", "-c", "sed \"s/__PORT__/${PORT:-80}/g\" /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
