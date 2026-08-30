# syntax=docker/dockerfile:1

# --- deps: install full dependency tree once, reused by build stage ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# --- build: compile TypeScript and generate the Prisma client ---
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

# --- runtime: minimal image, non-root user, only production artifacts ---
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Alpine's base image ships libssl but not the `openssl` binary Prisma's
# engine uses to detect the OpenSSL version at startup — without it,
# detection fails and Prisma falls back to loading the wrong bundled engine
# (openssl-1.1.x) even when the correct one (openssl-3.0.x, see
# prisma/schema.prisma's binaryTargets) is also present, crash-looping the
# container. Installing openssl fixes detection.
RUN apk add --no-cache openssl

# Run as an unprivileged, non-root user (defense in depth against container
# breakout / arbitrary file write escalating to host-level compromise).
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/prisma ./prisma
COPY --from=build --chown=appuser:appgroup /app/package.json ./package.json

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/healthz', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/server.js"]
