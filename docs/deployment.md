# Deployment

Zemio deploys two services — `web` (Next.js) and `api` (Hono) — as Docker
images. Images are **built in CI** and published to the GitHub Container
Registry; Railway deploys the prebuilt images rather than building them itself.

## Why CI builds the images

Railway's builder does not support BuildKit secret mounts
(`RUN --mount=type=secret`), so a Dockerfile built on Railway can only receive
secrets as build args, which persist in image layers. Building in GitHub Actions
lets us pass the Sentry source-map upload token as a real build secret that never
lands in a layer. It also gives a single, reproducible artifact that is promoted
across environments — the runtime configuration is injected by Railway at
container start (see "Runtime configuration"), so the same image is
environment-agnostic.

## Pipeline

`.github/workflows/build-images.yml`:

- **Pull requests** (into `master` or `canary`) build both images **without**
  pushing — this catches Docker/build breakage before merge.
- **Pushes to `master`** (production), **`canary`** (staging), and **version
  tags (`v*`)** build and push to:
  - `ghcr.io/<owner>/zemio-web`
  - `ghcr.io/<owner>/zemio-api`
- Image tags published per build:
  - `sha-<40hex>` — immutable, every build (use for reproducible pins/rollback).
  - the **branch name** — a moving tag per branch (`master`, `canary`), always
    pointing at that branch's latest build.
  - the git tag — for `v*` pushes.
  - `latest` — on the default branch (`master`) only.

  So production tracks `latest` (or `master`) and staging tracks `canary`, while
  any deploy can still be pinned to an exact `sha-…`.

### Required GitHub repository secrets

Used by the web image to upload source maps during the build:

| Secret | Purpose |
| --- | --- |
| `SENTRY_AUTH_TOKEN` | Auth token for source-map upload (passed as a BuildKit secret) |
| `SENTRY_ORG` | Sentry/Better Stack org (build arg) |
| `SENTRY_PROJECT` | Sentry/Better Stack project (build arg) |
| `SENTRY_URL` | Source-map upload endpoint (build arg) |

If `SENTRY_AUTH_TOKEN` is absent the build still succeeds; source maps are simply
not uploaded.

## Railway configuration (one-time cutover)

Each service must be switched from "build from Dockerfile" to "deploy a registry
image":

1. In the service settings, set the **source** to the image
   `ghcr.io/<owner>/zemio-web` (or `zemio-api`), pinned to a tag:
   - **Production** service: the `sha-…` tag for reproducible, promotable
     deploys (recommended), or `latest`/`master` to auto-track the prod branch.
   - **Staging** service: the `canary` tag to auto-track the staging branch, or
     a `sha-…` tag to pin.
2. Add **registry credentials** so Railway can pull the private image: a GitHub
   personal access token (or fine-grained token) with `read:packages`.
3. Leave the existing **runtime variables** in place (see below). They are
   injected at container start and are not needed at build time.
4. The `apps/*/railway.toml` build section becomes unused once the service
   deploys an image; runtime settings there (healthcheck, restart policy) still
   apply.

> Until a service is switched to image deploys, do not let Railway build the web
> Dockerfile — it contains a `--mount=type=secret` step that Railway's builder
> cannot parse.

## Runtime configuration

Set these as Railway service variables (injected at container start, never baked
into the image):

- Core: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, the
  `MICROSOFT_*`, `STORAGE_*`, `RESEND_API_KEY`, `SECRET_ENCRYPTION_KEY`,
  `INTERNAL_API_SECRET`, `API_URL`, etc. (see `apps/web/src/env.js`).
- Error tracking & logging (read at runtime; the DSN is injected into the
  browser at request time):
  - `BETTER_STACK_DSN`
  - `BETTER_STACK_SOURCE_TOKEN`
  - `BETTER_STACK_INGESTING_URL`

  > These were previously named `NEXT_PUBLIC_BETTER_STACK_*`. Rename them in
  > Railway when cutting over — the `NEXT_PUBLIC_` prefix is no longer used.

## Database migrations

`prisma migrate deploy` runs in the web container's start command (`CMD`), so it
executes with full log visibility and the same env/network context as the app.
Prisma takes a database advisory lock, so concurrent replicas serialize rather
than conflict.

## Building images locally

```sh
# web (with source-map upload)
SENTRY_AUTH_TOKEN=... docker build \
  --secret id=sentry_auth_token,env=SENTRY_AUTH_TOKEN \
  --build-arg SENTRY_ORG=... --build-arg SENTRY_PROJECT=... --build-arg SENTRY_URL=... \
  -f apps/web/Dockerfile -t zemio-web .

# api
docker build -f apps/api/Dockerfile -t zemio-api .
```

The web build works without the secret too (source maps are skipped).
