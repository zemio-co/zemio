# syntax=docker/dockerfile:1

FROM oven/bun:1.3.14-alpine AS runner
WORKDIR /app

# Copy manifests before source so Docker can cache the install layer.
# packages/db/prisma is required by the @zemio/db postinstall script
# (prisma generate) that runs during bun install.
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/db/prisma/ ./packages/db/prisma/
COPY packages/encryption/package.json ./packages/encryption/
COPY packages/typescript-config/package.json ./packages/typescript-config/

RUN bun install --frozen-lockfile

COPY apps/api/ ./apps/api/
COPY packages/ ./packages/

# Regenerate the Prisma client now that full source is present.
RUN bun --cwd packages/db run generate

ENV NODE_ENV=production

EXPOSE 3001

CMD ["bun", "apps/api/src/index.ts"]
