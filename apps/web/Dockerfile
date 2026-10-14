# syntax=docker/dockerfile:1

# ── Base: Bun + Node.js for building ─────────────────────────────────────────
# Debian (glibc), NOT Alpine (musl), on purpose: @appsignal/nodejs picks its
# native extension and agent binary at INSTALL time based on the libc it sees.
# The runner below is Debian/glibc (node:22-trixie-slim), so installing under
# musl would produce an image that builds and typechecks cleanly and then
# fails to load the agent at boot.
#
# python3/make/g++ are the node-gyp toolchain and ca-certificates lets node-gyp
# fetch the Node headers over TLS. @appsignal/nodejs compiles its native
# extension in its install script, and that script exits 0 on failure — without
# these the image would build clean and then log "AppSignal not starting:
# extension failed to load" at boot, with no monitoring at all.
FROM oven/bun:1.3.14-debian AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
        nodejs python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ── Pruner: extract the minimal workspace subset for @zemio/web ───────────────
# turbo prune emits out/json (manifests only, for a cached install layer) and
# out/full (the source) for @zemio/web and its transitive workspace packages.
# New packages require no Dockerfile changes.
FROM base AS pruner
WORKDIR /app
COPY . .
RUN bunx turbo prune @zemio/web --docker

# ── Deps: install only the pruned dependencies ────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lock ./bun.lock
# The @zemio/db postinstall runs `prisma generate`, which needs the schema
# and prisma.config.js (schema now lives under prisma/schema/, not the
# default prisma/schema.prisma Prisma falls back to without it).
COPY --from=pruner /app/out/full/packages/db/prisma/ ./packages/db/prisma/
COPY --from=pruner /app/out/full/packages/db/prisma.config.js ./packages/db/prisma.config.js

RUN bun install --frozen-lockfile

# ── Builder: compile Next.js app ──────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/ .
COPY --from=pruner /app/out/full/ .

ENV NODE_ENV=production

# Runtime config is NOT baked at build — it is read from the environment at
# container start, so no build args are needed for it.
#
# turbo build runs ^build first, so workspace packages (db, encryption, logger)
# are compiled to dist before next build consumes them.
RUN SKIP_ENV_VALIDATION=1 bun run turbo build --filter=@zemio/web

# Next.js standalone does not include static assets; copy them into the
# standalone directory so the server can serve them correctly.
# With outputFileTracingRoot at the monorepo root, server.js lives at
# apps/web/server.js inside standalone, so assets must be placed relative to it.
RUN mkdir -p apps/web/.next/standalone/apps/web/.next && \
    cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static && \
    cp -r apps/web/public apps/web/.next/standalone/apps/web/public

# Collect the sourcemaps for upload, then remove them from what ships.
#
# Removed from .next/static because everything under it is served at
# /_next/static, and these maps embed the original source (sourcesContent) —
# an image that carried them there would publish the frontend to anyone who
# asked for the URL. /app/sourcemaps is not a route, so it is carried but never
# served.
#
# Collected here, inside the build that produced the chunks, rather than by a
# second build invocation: Turbopack chunk names are not stable across builds,
# so a separate build yields a different set of names and every upload then
# resolves nothing. The collector also pairs each map to its chunk through the
# sourceMappingURL comment — Turbopack names the two independently, so the
# names cannot be derived from one another.
RUN node apps/web/scripts/collect-sourcemaps.mjs \
      apps/web/.next/standalone/apps/web/.next/static \
      apps/web/.next/standalone/sourcemaps && \
    find apps/web/.next/standalone/apps/web/.next/static -name '*.map' -delete

# ── Runner: slim Node.js image ────────────────────────────────────────────────
# Debian, not Alpine: the Prisma migration CLI needs glibc, and musl is
# incompatible with its default engine binary without extra binaryTargets.
#
# Pinned to the SAME Debian release as the builder (trixie). @appsignal/nodejs
# compiles its native extension in the builder, and trixie's g++ emits a binary
# requiring GLIBCXX_3.4.32, which bookworm's libstdc++ does not provide. On
# node:22-slim (bookworm) the image builds, the extension file is present and
# resolves, and the agent still dies at boot with ERR_DLOPEN_FAILED. Both
# stages must move Debian releases together.
FROM node:22-trixie-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

# --create-home matters: the AppSignal agent needs a writable working directory
# and resolves one relative to HOME. Without it the agent refuses to start with
# "No viable working directory path found" — the app itself serves fine, so the
# only symptom is that no monitoring data ever arrives.
# Coolify's container healthcheck shells out to curl (falling back to wget);
# the slim base ships neither, so every check fails and the deploy rolls back.
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --create-home nextjs

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

# The commit this image was built from; AppSignal reads it as `revision`.
# Why it is baked in rather than configured per environment: see
# docs/deployment.md, "Build revision".
#
# Placed after every COPY on purpose. The value changes on every commit, so
# anything below it rebuilds each time — only USER/EXPOSE/CMD follow, and those
# are metadata-only layers.
ARG APP_REVISION=""
ENV APP_REVISION=$APP_REVISION

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "(cd packages/db && prisma migrate deploy) && node apps/web/server.js"]
