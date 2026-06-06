# syntax=docker/dockerfile:1

# ── Base: Bun + Node.js for building ─────────────────────────────────────────
FROM oven/bun:1.3.14-alpine AS base
RUN apk add --no-cache nodejs

# ── Deps: install all workspace dependencies ──────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy manifests before source so Docker can cache the install layer.
# packages/db/prisma is required because the @zemio/db postinstall
# script runs `prisma generate` during bun install.
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/db/prisma/ ./packages/db/prisma/
COPY packages/encryption/package.json ./packages/encryption/
COPY packages/typescript-config/package.json ./packages/typescript-config/

RUN bun install --frozen-lockfile

# ── Builder: compile Next.js app ──────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Expose workspace binaries (e.g. prisma) to shell PATH so turbo-invoked
# scripts can find them on Alpine where bun doesn't inject the root
# node_modules/.bin automatically.
ENV PATH="/app/node_modules/.bin:$PATH"

# Regenerate the Prisma client now that full source is present.
# The postinstall in the deps stage ran without packages/db/src, so we
# must re-run generate here to produce a complete client.
RUN bun --cwd packages/db run generate

ENV SKIP_ENV_VALIDATION=1
ENV NODE_ENV=production

RUN bun run turbo build --filter=@zemio/web

# Next.js standalone does not include static assets; copy them into the
# standalone directory so the server can serve them correctly.
RUN cp -r apps/web/.next/static apps/web/.next/standalone/.next/static && \
    cp -r apps/web/public apps/web/.next/standalone/public

# ── Runner: slim Node.js image ────────────────────────────────────────────────
# node:22-slim (Debian) is required because the Prisma migration CLI needs
# glibc. Alpine (musl) is incompatible with Prisma's default migration engine
# binary without additional binaryTargets configuration in schema.prisma.
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Install the Prisma CLI so the preDeployCommand can run migrations.
# Version must stay in sync with the prisma devDependency in packages/db.
RUN npm install -g prisma@7 --quiet

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
# Schema is required by `prisma migrate deploy` at pre-deploy time.
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/prisma ./packages/db/prisma

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
