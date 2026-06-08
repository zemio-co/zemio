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
COPY packages/logger/package.json ./packages/logger/
COPY packages/typescript-config/package.json ./packages/typescript-config/

RUN bun install --frozen-lockfile

# ── Builder: compile Next.js app ──────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
# Bun does not hoist sub-workspace devDependencies to the root node_modules/.bin,
# so each package that owns critical binaries must be copied explicitly.
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/logger/node_modules ./packages/logger/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .

# Regenerate the Prisma client now that full source is present.
# The postinstall in the deps stage ran without packages/db/src, so we
# must re-run generate here to produce a complete client.
RUN bun --cwd packages/db run generate

ENV NODE_ENV=production

# NEXT_PUBLIC_* vars are inlined at build time — they must be declared as ARGs
# so Railway's build arguments are forwarded into this stage.
# SENTRY_* vars are required by the Sentry webpack plugin for source map uploads.
ARG NEXT_PUBLIC_BETTER_STACK_DSN
ARG NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN
ARG NEXT_PUBLIC_BETTER_STACK_INGESTING_URL
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_URL
ENV NEXT_PUBLIC_BETTER_STACK_DSN=$NEXT_PUBLIC_BETTER_STACK_DSN
ENV NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN=$NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN
ENV NEXT_PUBLIC_BETTER_STACK_INGESTING_URL=$NEXT_PUBLIC_BETTER_STACK_INGESTING_URL
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT
ENV SENTRY_URL=$SENTRY_URL

RUN SKIP_ENV_VALIDATION=1 bun run turbo build --filter=@zemio/web

# Next.js standalone does not include static assets; copy them into the
# standalone directory so the server can serve them correctly.
# With outputFileTracingRoot at the monorepo root, server.js lives at
# apps/web/server.js inside standalone, so assets must be placed relative to it.
RUN mkdir -p apps/web/.next/standalone/apps/web/.next && \
    cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static && \
    cp -r apps/web/public apps/web/.next/standalone/apps/web/public

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
# Schema and JS config are required by `prisma migrate deploy` at pre-deploy time.
# prisma.config.js is plain JavaScript (no TypeScript compilation, no external imports)
# so it loads correctly when only the global prisma CLI is available in the runner.
# Locally, prisma.config.ts takes precedence (Prisma 7 searches .ts before .js).
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/prisma.config.js ./packages/db/prisma.config.js

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "(cd packages/db && prisma migrate deploy) && node apps/web/server.js"]
