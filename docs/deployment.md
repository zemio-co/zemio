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
- **Pushes to `master`** (production) and **`canary`** (staging) build and push
  both images to:
  - `ghcr.io/<owner>/zemio-web`
  - `ghcr.io/<owner>/zemio-api`
- **Version tags** (`web-vX.Y.Z`, `api-vX.Y.Z`) build and push only the
  matching app's image — web and api version and release independently (see
  `.changeset/config.json`), so a release of one doesn't touch the other.
- Image tags published per build:
  - `sha-<40hex>` — immutable, every build (use for reproducible pins/rollback).
  - the **branch name** — a moving tag per branch (`master`, `canary`), always
    pointing at that branch's latest build.
  - the version, e.g. `1.2.0` — extracted from a `web-v*`/`api-v*` tag push.
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

## Railway configuration

Each service's source is set to a registry image (`ghcr.io/<owner>/zemio-web` or
`zemio-api`), not a build from `apps/*/Dockerfile` — the `apps/*/railway.toml`
build section is unused; only its runtime settings (healthcheck, restart
policy) apply. Staging services track the `canary` tag; production services
track `master`.

Neither service has a linked GitHub repo. This is deliberate — a linked repo
would let Railway build from the Dockerfile itself, which contains a
`--mount=type=secret` step Railway's builder cannot parse — but it also means
Railway's auto-deploy-on-new-image can't fire: that feature requires a linked
repo. **Nothing about pushing a new image to GHCR causes Railway to run it.**

### Deploying a newly built image

`build-images.yml`'s `deploy-staging`/`deploy-production` jobs are what
actually ships a build: after a canary push (or a `web-vX.Y.Z`/`api-vX.Y.Z` tag
push for production) builds and pushes the image, these jobs call
`railway redeploy --service <id> --yes` for the affected service(s), which
pulls the tag's current image and restarts the service. Without this step a pushed
image just sits in GHCR until someone manually redeploys it in the dashboard.

This needs a Railway **project token** per environment (project tokens are
scoped to exactly one environment) stored as GitHub secrets:

| Secret | Scope |
| --- | --- |
| `RAILWAY_TOKEN_STAGING` | Staging environment project token |
| `RAILWAY_TOKEN_PRODUCTION` | Production environment project token |

Service IDs are hardcoded in the workflow rather than looked up by name.

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

  > These were previously named `NEXT_PUBLIC_BETTER_STACK_*` — the
  > `NEXT_PUBLIC_` prefix is no longer used.

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
