# syntax=docker/dockerfile:1

# ── Pruner: extract the minimal workspace subset for @zemio/api ───────────────
FROM oven/bun:1.3.14-alpine AS pruner
WORKDIR /app
COPY . .
RUN bunx turbo prune @zemio/api --docker

# ── Deps: install only the pruned dependencies ────────────────────────────────
FROM oven/bun:1.3.14-alpine AS deps
WORKDIR /app

# out/json/ contains only the package.json files for @zemio/api and its
# transitive workspace dependencies. New packages require no Dockerfile changes.
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lock ./bun.lock

# The @zemio/db postinstall script runs `prisma generate`, which needs the
# schema file. Copy it from the pruned full source before installing.
COPY --from=pruner /app/out/full/packages/db/prisma/ ./packages/db/prisma/

RUN bun install --frozen-lockfile

# ── Runner: final image ───────────────────────────────────────────────────────
FROM oven/bun:1.3.14-alpine AS runner
WORKDIR /app

# Copy the whole installed tree (root + every package's node_modules), then
# overlay the full source. Per-package node_modules carry binaries that Bun does
# not hoist (e.g. packages/db's prisma, packages/encryption's tsc), which the
# build scripts need — copying them selectively is what broke the build.
COPY --from=deps /app/ .
COPY --from=pruner /app/out/full/ .

# Build workspace dependencies to dist now that full source is present.
# turbo build --filter=@zemio/api runs ^build, which regenerates the Prisma
# client and compiles @zemio/db and @zemio/encryption to dist — the form the
# app imports at runtime.
RUN bun run turbo build --filter=@zemio/api

ENV NODE_ENV=production

EXPOSE 3001

CMD ["bun", "apps/api/src/index.ts"]
