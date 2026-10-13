# Deployment

Zemio deploys two services — `web` (Next.js) and `api` (Hono) — as Docker
images. Images are **built in CI** and published to the GitHub Container
Registry; Railway deploys the prebuilt images rather than building them itself.

## Why CI builds the images

Building in GitHub Actions gives a single, reproducible artifact that is
promoted across environments — the runtime configuration is injected by Railway
at container start (see "Runtime configuration"), so the same image is
environment-agnostic. It also supports BuildKit secret mounts
(`RUN --mount=type=secret`), which Railway's builder does not; no build
currently needs one, but a future build-time credential can be passed without
persisting it in an image layer.

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
  - `latest` — on `master` only. Pinned to the branch name rather than to the
    repo's default branch setting, so changing that setting cannot move it.

  So production tracks `latest` (or `master`) and staging tracks `canary`, while
  any deploy can still be pinned to an exact `sha-…`.

## Railway configuration

Each service's source is set to a registry image (`ghcr.io/<owner>/zemio-web` or
`zemio-api`), not a build from `apps/*/Dockerfile` — the `apps/*/railway.toml`
build section is unused; only its runtime settings (healthcheck, restart
policy) apply. Staging services track the `canary` tag; production services
track `master`.

Neither service has a linked GitHub repo, so Railway's auto-deploy-on-new-image
cannot fire: that feature requires a linked repo. **Nothing about pushing a new
image to GHCR causes Railway to run it.**

(This used to be justified by the Dockerfile needing a `--mount=type=secret`
step that Railway's builder cannot parse. That step went with the Sentry
source-map upload — the Dockerfile no longer has one — so linking a repo is no
longer blocked on that account, though CI-built images remain the arrangement
in use.)

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

Set these on whichever platform hosts the environment. They are injected at
container start, never baked into the image, which is what lets one image serve
every environment:

> The sections above describe Railway. Staging has since moved to Hetzner +
> Coolify; rewriting them (and replacing the `railway redeploy` step) is tracked
> by the Hetzner migration, not here.

- Core: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, the
  `MICROSOFT_*`, `STORAGE_*`, `SCALEWAY_TEM_SECRET_KEY`,
  `SCALEWAY_TEM_PROJECT_ID`, `EMAIL_FROM`, `SECRET_ENCRYPTION_KEY`,
  `INTERNAL_API_SECRET`, `API_URL`, etc. (see `apps/web/src/env.js`).
- Error tracking (AppSignal; read at runtime, the front-end key is injected
  into the browser at request time):
  - `APPSIGNAL_PUSH_API_KEY` — server key; absent turns monitoring off
  - `APPSIGNAL_FRONTEND_KEY` — browser key, a *different* credential
  - `APPSIGNAL_APP_NAME` — `zemio-web`
  - `APPSIGNAL_APP_ENV` — `production` or `staging`
  > `APP_REVISION` is **not** set here — it is baked into the image at build
  > time. See [Build revision](#build-revision) below.

  > Name + environment identify the app on appsignal.com. Changing either
  > creates a **new** app with empty history rather than renaming the old one.

  Browser reports are relayed through `/api/monitoring` on our own origin
  rather than posted straight to AppSignal, so AppSignal never sees an end
  user's IP address. Any proxy or CDN in front of the app must let that path
  through.
- Logging: application logs go to AppSignal under the `web` group, with user
  identifiers redacted on the way out (`apps/web/src/lib/log-redaction.ts`).
  Logs fall back to stdout/stderr when AppSignal is not configured, and that
  fallback is redacted too wherever stdout can leave the host — see
  [Log drain](#log-drain).
- Billing (optional; leave unset to run without billing):
  - `BILLING_ENABLED` — `true`/`1` turns billing on for the deployment.
    Anything else, including unset, leaves it off: no billing interface, and
    every organization entitled (ADR-0001).
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`

  > The two Stripe variables are optional on their own but **required once
  > `BILLING_ENABLED` is on** — the container fails to start if either is
  > missing, naming every one that is absent so a second restart is not needed
  > to discover the second variable.

  Turning the flag on enforces nothing by itself: enforcement also needs
  `billingEnforced` on the individual organization, so a rollout can be staged
  one customer at a time. See [billing-runbook.md](./billing-runbook.md) for
  that and for verifying billing locally against Stripe test mode.

## Log drain

Application logs reach AppSignal through the SDK. Everything else a container
writes does not: crashes before the agent boots, Next.js framework output, and
the agent's own complaints. That last one matters more than it sounds — a
misconfigured agent prints `not starting: …` to stderr and dies while
`isActive` keeps answering `true`, which is how three separate failures during
the AppSignal migration stayed invisible.

The drain closes that gap by shipping container stdout and stderr to the same
place the SDK sends to.

This is a Coolify feature, so it covers the environments running on Coolify.
Production is still on Railway (see [Railway configuration](#railway-configuration))
and has no drain — its container output stays where Railway keeps it.

### Why AppSignal and not a log vendor

Coolify offers Axiom, New Relic, or a custom Fluent Bit configuration. Both
named options are US companies and would become subprocessors needing their own
DPA — which is the arrangement DEV-43 spent an entire migration leaving behind.
AppSignal B.V. already has a signed DPA, so the drain adds no new subprocessor.
(`docs/legal/subprocessors.md` still names Better Stack under §6 — that is a
leftover from DEV-43 and needs the rename regardless of this drain.) Use the
custom Fluent Bit path.

### What redaction covers, and what it does not

`apps/web` writes to stdout only when the AppSignal sink is unavailable, so the
drain mostly carries lines our logger never produced. That fallback is exactly
the situation the drain exists to reveal, so it is redacted whenever stdout can
leave the host — `NODE_ENV !== "development"`, checked in
`apps/web/src/lib/logger.ts`, verified in `logger.test.ts`.

Two limits are worth stating plainly rather than discovering later:

- **Third-party lines are not redacted.** Next.js, Prisma, and the agent write
  straight to stdout without passing through our logger, so nothing filters
  them. They are the reason the drain is useful and the reason it carries
  residual risk.
- **`apps/api` must be kept out of the drain.** Its logger has no redaction at
  all and it logs raw `error` objects, which routinely quote email addresses.
  Draining it needs the redaction module shared through `@zemio/logger` first —
  tracked separately, because that module is cited by file and line in the legal
  documents. The drain is configured per server, so excluding it is not
  automatic: leave the api resource's own log-drain switch off, and keep the
  `grep` filter below as the backstop for when someone flips it on.

### Configuring it

The endpoint wants a **log source API key**, which is a different credential
from `APPSIGNAL_PUSH_API_KEY` — create the source in AppSignal under Logging
first, choosing the HTTP endpoint and `JSON` as the message format.

In Coolify, set the server's log drain to custom Fluent Bit:

```ini
# The drain is server-wide, so it also sees containers whose output is not
# redacted. `apps/api` logs raw error objects that quote email addresses — drop
# it here rather than relying on its own log-drain switch staying off. Coolify
# names containers after the resource UUID, so read the real value out of a
# record before trusting this filter to match anything.
[FILTER]
    Name    grep
    Match   *
    Exclude container_name <api-container-name>

# Docker hands Fluent Bit the raw line in `log`; our logger already writes JSON,
# so lift it to the top level. Without this the whole record arrives as one
# opaque message and no field is searchable.
[FILTER]
    Name         parser
    Match        *
    Key_Name     log
    Parser       json
    Reserve_Data On

# A parsed record has no `log` left; an unparsed one still does. Those are the
# plain-text lines the drain exists for — the agent's `not starting: …`, a stack
# trace, Next.js output. Without this rename they carry no `message`, and
# AppSignal falls back to using the whole record as the line: the text survives
# but arrives wrapped in JSON, alongside Docker's own metadata keys.
[FILTER]
    Name   modify
    Match  *
    Rename log message

# `message` is the key AppSignal reads as the log line; every other key becomes
# a searchable attribute. Our entries already use that name.
[OUTPUT]
    Name          http
    Match         *
    Host          appsignal-endpoint.net
    Port          443
    URI           /logs?api_key=YOUR_LOG_SOURCE_API_KEY&group=web
    Format        json_lines
    Json_date_key false
    tls           On
```

> **Not yet verified end to end.** This configuration follows AppSignal's HTTP
> endpoint documentation, but nobody has watched a line travel from a container
> into AppSignal Logging yet — that needs Coolify dashboard access. Confirm an
> actual line arrives before treating the drain as working; a drain that is
> configured and silent looks identical to one that works until you need it.

## Build revision

`APP_REVISION` carries the commit an image was built from. CI passes it as a
Docker build arg (`--build-arg APP_REVISION=${{ github.sha }}`) and the runner
stage bakes it into the image. **Do not set it on Coolify or Railway** — a value
set there shadows the correct one, and a stale revision is worse than none.

It is deliberately not per-environment configuration. The revision identifies
the *artifact*: the same image is the same code wherever it runs, so a setting
that could differ between staging and production would be wrong by
construction. This does not weaken "build once, deploy anywhere" — one image
reporting one revision everywhere is the point.

AppSignal opens a deploy marker whenever the value changes, and links backtrace
frames to the repo at that commit, so it must be the real SHA rather than a
version string.

The platform-provided variables do not work for this pipeline. Coolify's
`SOURCE_COMMIT` is excluded from Docker builds by default and applies to
git-based resources, while staging deploys a prebuilt image from GHCR; Railway's
`RAILWAY_GIT_COMMIT_SHA` needs a linked repo, which neither service has. Both
describe the platform's view of the repo rather than the artifact running.

> This relies on both platforms deploying the **prebuilt GHCR image**. The
> `builder = "DOCKERFILE"` line in `apps/web/railway.toml` is unused for that
> reason (see "Railway configuration"); a platform that built from source would
> get the empty `ARG` default and no revision at all.

## Source maps

Browser backtraces in AppSignal are resolved against sourcemaps uploaded by CI.
`productionBrowserSourceMaps` is on, and each build publishes its maps privately
to AppSignal's sourcemap API.

They are uploaded rather than served. A map embeds the original source
(`sourcesContent`), so serving it next to the chunk — which is what happens to
anything left under `.next/static` — would publish the frontend to anyone who
asked for the URL. The build moves them to `/app/sourcemaps` inside the image
instead, which is not a route.

Three details are easy to get wrong, and all three fail silently:

- **The maps must come from the build that produced the chunks.** Turbopack
  chunk names are not stable across builds, so maps from a second build upload
  cleanly and resolve nothing. CI extracts them from the image it just pushed,
  addressed by **digest** rather than by the `sha-…` tag — a branch push and a
  tag push of the same commit both write that tag, and the loser's maps would
  describe chunk names no deployed image contains.
- **The maps must come from the image that is actually deployed.** Staging
  tracks `canary` and production tracks `master` (see
  [Railway configuration](#railway-configuration)), so the upload runs on those
  two branch pushes. A `web-v*` tag publishes only `sha-…` and the version, so
  its image is never served; it triggers the production *deploy*, which pulls
  the `master` image whose maps went up at merge time.
- **A map's filename does not match its chunk's.** Turbopack names them
  independently — chunk `02mwhpb-9lwfu.js` is described by
  `3-k-qm3o85x8h.js.map`. Only the trailing `sourceMappingURL` comment relates
  the two, which is what `scripts/collect-sourcemaps.mjs` reads.

Uploads are keyed by `revision` (see [Build revision](#build-revision)) and by
the **full URL** of the minified file, so a build is uploaded once per
environment — `canary` against `staging.zemio.co`, `master` against
`app.zemio.co`. AppSignal keeps them for 60 days.

`APPSIGNAL_PUSH_API_KEY` must exist as a GitHub Actions secret; it is the same
push key the app uses at runtime, not the front-end key.

## Database migrations

`prisma migrate deploy` runs in the web container's start command (`CMD`), so it
executes with full log visibility and the same env/network context as the app.
Prisma takes a database advisory lock, so concurrent replicas serialize rather
than conflict.

## Granting platform admin

The platform-admin role is set by hand in the database. Stamp onboarding as
finished at the same time: onboarding only finishes once somebody belongs to an
organization, and until it has, every page — including the organization admin
pages under `/settings/admin/orgs` — sends them back into the flow. An admin who
is a member of no organization would otherwise have to create one, with a
trial, before they could manage any.

```sql
UPDATE "user"
SET role = 'admin',
    "onboardingCompletedAt" = COALESCE("onboardingCompletedAt", now())
WHERE email = '<address>';
```

They land on `/onboarding/no-org`, which links to the organization admin pages.

## Building images locally

```sh
# web
docker build -f apps/web/Dockerfile -t zemio-web .

# api
docker build -f apps/api/Dockerfile -t zemio-api .
```
