# Plan: Stabilize & scale Railway deployment / repo build setup

Branch: `chore/deployment-hardening` (off `master`). One logical commit per phase.

Defaults assumed:
- All phases on one branch, committed phase-by-phase.
- Phase 3 uses hand-rolled `window.__PUBLIC_ENV__` injection (no new dependency).
- `apps/api` Sentry/observability is OUT OF SCOPE (follow-up only).

Verification gates after every phase: `bun install --frozen-lockfile`, `bun run build`,
`bun run typecheck`, `bun run check`, and a `docker build` of the touched app.

---

## Phase 1 — Build internal packages to `dist`

Goal: every package is a real build target; apps consume built JS; no vestigial/stale `dist`.

### `packages/logger`
- `tsconfig.json`: add `outDir: "dist"`, `declaration: true`, `declarationMap: true`,
  `composite: true`; `exclude` add `"dist"`.
- `package.json`: add `"build": "tsc --build"`, `"clean": "rm -rf dist tsconfig.tsbuildinfo"`;
  set `exports["."]` → `{ "types": "./dist/index.d.ts", "default": "./dist/index.js" }`;
  add `"files": ["dist"]`.

### `packages/encryption`
- Same tsconfig + package.json changes as logger (single `index.ts` entrypoint).

### `packages/db`
- `package.json`:
  - `build`: `"prisma generate && tsc --build"` (generate must precede compile).
  - `exports["."]` → `{ "types": "./dist/index.d.ts", "default": "./dist/index.js" }`.
  - `exports["./enums"]` → `{ "types": "./dist/generated/prisma/enums.d.ts", "default": "./dist/generated/prisma/enums.js" }`.
  - Keep `postinstall: "prisma generate"` (client must exist before tsc in CI/install).
- Confirm `tsc` emits `dist/generated/prisma/**` (generator output `../src/generated/prisma`
  is under `rootDir: src`, so it compiles into `dist/generated/prisma`). If the generated
  client ships its own `.js`, ensure tsc `allowJs` copies or rely on generator output; verify
  `dist/generated/prisma/enums.js` exists after build.

### Turbo
- `turbo.json` `build` already has `dependsOn: ["^build", "generate"]` + `outputs` incl. `dist/**`.
  No change required; confirm package `build` scripts are picked up.

### Consumers
- No import changes (apps already import `@zemio/db`, `@zemio/db/enums`, `@zemio/logger`,
  `@zemio/encryption`). They now resolve to `dist`.
- `apps/web` Next build: plain JS in `dist` needs no `transpilePackages`. Verify bundle.
- `apps/api` runs `bun src/index.ts` → imports resolve to package `dist`; verify `bun run dev`/`start`.

**Verify:** `bun run build && bun run typecheck` green; delete any committed stale `dist`
and confirm it is git-ignored OR intentionally built in CI (decision: git-ignore `dist`,
build in CI + Docker).

---

## Phase 2 — Unify Docker on `turbo prune` (web adopts api's pattern)

Rewrite `apps/web/Dockerfile`:
- `pruner` stage: `FROM oven/bun:1.3.14-alpine`, `COPY . .`, `RUN bunx turbo prune @zemio/web --docker`.
- `deps` stage: copy `out/json/` + `out/bun.lock`; copy `out/full/packages/db/prisma/`;
  `bun install --frozen-lockfile`.
- `builder` stage: copy `node_modules`, `out/full/`, run `bun run turbo build --filter=@zemio/web`
  (which triggers `^build` → builds all workspace packages to `dist`, then `next build`).
  Remove ALL manual per-package `node_modules` COPYs.
- `runner` stage:
  - Keep `node:22-slim` (glibc for Prisma migrate) OR evaluate keeping Bun runner; default keep node.
  - Replace `npm install -g prisma@7` with workspace prisma: copy `packages/db` (incl. its
    `node_modules/.bin/prisma`) so `bun --cwd packages/db run db:migrate` uses the pinned version.
    This removes version drift.
  - Delete `packages/db/prisma.config.js` once the runner uses the workspace prisma (TS config
    loads via the installed prisma). If the `.ts` loader still fails under the slim image,
    keep a single generated `.js` — investigate during impl, do not keep both by default.
- Keep standalone static-asset copy step (still required by Next standalone).

**Verify:** `docker build -f apps/web/Dockerfile .` succeeds; container boots; adding a dummy
new package requires no Dockerfile edit.

---

## Phase 3 — Build-once images: runtime public-env injection

Goal: stop inlining `NEXT_PUBLIC_*` at build; one image runs in any environment; real env
validation at boot.

### New runtime-env module — `apps/web/src/lib/public-env/`
- `schema.ts`: Zod schema for the 3 public vars (DSN, source token, ingesting URL), all optional.
- `server.ts` (`server-only`): `readPublicEnv()` reads `process.env`, validates, returns typed object.
- `script.tsx`: server component rendering
  `<script id="__public_env" dangerouslySetInnerHTML={{ __html: \`window.__PUBLIC_ENV__=${JSON.stringify(env)}\` }} />`.
- `client.ts`: `getPublicEnv()` reads `window.__PUBLIC_ENV__` with the same Zod schema; throws
  if accessed before injection (no silent fallback).

### Wire-up
- `apps/web/src/app/layout.tsx`: render `<PublicEnvScript />` inside `<head>` BEFORE Next's
  client bundles so `window.__PUBLIC_ENV__` exists when `instrumentation-client.ts` runs.
- `src/lib/logger.ts` (client path) + `instrumentation-client.ts` / `getErrorTrackingConfig`:
  read from `getPublicEnv()` at runtime instead of build-inlined `env`.
- Server-side Sentry (`sentry.server.config.ts`, `sentry.edge.config.ts`): read `process.env`
  at runtime (already server) — keep using `@/env` but ensure no build-time requirement.

### env validation
- `apps/web/src/env.js`: move the 3 `NEXT_PUBLIC_*` out of build-inlined client validation;
  validate them at runtime via the new module. Remove `SKIP_ENV_VALIDATION` from the runtime
  path so the container validates real env at boot (keep it ONLY for `next build`).

### Dockerfile
- Remove `NEXT_PUBLIC_*` `ARG`/`ENV` lines from `apps/web/Dockerfile` builder stage.

**Verify (critical):** build one image, run it twice with different DSN values without rebuild;
confirm browser picks up runtime DSN and Sentry client initializes. Validate init-ordering
explicitly (script present before client JS executes).

⚠️ Highest-risk phase — Sentry client-init ordering. Do not mark done until verified in a
real `next start` run.

---

## Phase 4 — Source-map upload via BuildKit secret

- `apps/web/Dockerfile` builder stage: consume `SENTRY_AUTH_TOKEN` via
  `RUN --mount=type=secret,id=sentry_auth_token ...` instead of `ARG`+`ENV` baked layers.
  `SENTRY_ORG/PROJECT/URL` are non-secret → may stay `ARG` or move to the manifest.
- `apps/web/railway.toml` / build config: document required build secret.
- Document the recommended evolution: move source-map upload to GitHub Actions CI (secrets live
  in CI, image build stays env-agnostic). Implement as doc/follow-up, not code, this phase.

**Verify:** source maps still upload during build; `docker history` shows no token in layers.

---

## Phase 5 — Migrations to Railway release phase

- `apps/web/Dockerfile` `CMD` → `node apps/web/server.js` only.
- `apps/web/railway.toml` `[deploy]`: add `preDeployCommand` running
  `cd packages/db && bun run db:migrate` (single command — Railway max 1).
- Ensure the runner image contains workspace prisma + schema for the pre-deploy step.

**Verify:** migration runs once per deploy (release phase), not per replica; app boots without
running migrations in `CMD`.

---

## Phase 6 — Turbo cache correctness + doc drift

- `turbo.json` `build.env`: declare the build-relevant vars (`SENTRY_ORG`, `SENTRY_PROJECT`,
  `SENTRY_URL`, `SENTRY_AUTH_TOKEN`, `NODE_ENV`) so changes bust the cache. (Public vars are
  now runtime, so they need not be in cache keys.)
- `CLAUDE.md`: pnpm → bun; correct generated-client path to `packages/db/src/generated/prisma`.
- `apps/web/src/env.js`: remove the dead "config.ts at project root" comment/reference.

**Verify:** `bun run build` cache busts on Sentry var change; docs match reality.

---

## Out of scope (noted follow-up)
- `apps/api`: add Sentry + source-map upload + switch `console` shim to `@zemio/logger`
  Better Stack package for parity with web.
