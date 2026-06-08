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

COPY --from=deps /app/node_modules ./node_modules
COPY --from=pruner /app/out/full/ .

# Regenerate the Prisma client now that full source is present.
RUN bun --cwd packages/db run generate

ENV NODE_ENV=production

EXPOSE 3001

CMD ["bun", "apps/api/src/index.ts"]
