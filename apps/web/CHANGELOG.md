# @zemio/web

## 1.3.0

### Minor Changes

- [#197](https://github.com/zemio-co/zemio/pull/197) [`af73ee9`](https://github.com/zemio-co/zemio/commit/af73ee93bc409bf8c2f5840e08949f341f13b44b) Thanks [@chris23lngr](https://github.com/chris23lngr)! - Let people onboard themselves: create an organization, start a 30-day trial
  without a card, and reach an invitation from a login that does not match it.

  Membership by Microsoft tenant moves from a column on `Organization` to a
  `JoiningRule` row with a matcher and a mode, which is the shape an email domain
  and an SSO connection also fit. Existing tenants are carried across by the
  migration as `AUTO_JOIN` rules before the column is dropped, so people keep
  joining exactly the organizations they joined before. A self-created
  organization is invite-only: no rule is seeded from whoever created it.

  An email address now grants nothing until Zemio has verified it itself
  (ADR-0008). This gates accepting an invitation, joining by email domain, and
  creating an organization — but never joining by Microsoft tenant, which reads a
  signed `tid` claim rather than an address. An identity provider's own
  verification flag is ignored, because Better Auth's Entra provider would
  otherwise mark a personal Microsoft account verified on its own say-so; the one
  claim accepted as proof is `xms_edov`, a work tenant's statement that it has
  proved the address's domain (ADR-0010).
  Existing addresses are reset to unverified by the migration, because nothing
  before this release verified one. Nobody loses a membership or sees onboarding
  again: work accounts on a domain their tenant has proved are verified again at
  their next sign-in (ADR-0010), and everybody else confirms by mail only when
  they next accept an invitation or create an organization.

  Sessions reopen in the organization the person was last working in, rather than
  whichever they joined first.

  A person gets one trial, ever. An organization created by somebody who has
  already had theirs is created all the same, but starts read-only until it
  subscribes.

  **Operators:** self-serve trials need one Stripe price tagged
  `zemio_trial: "true"` in its metadata — without it, an organization created by
  somebody who has not had their trial is still created and stays entitled, the
  missing price is logged, and the trial is not counted as used. Subscribe the
  Stripe webhook endpoint to `customer.subscription.trial_will_end` as well;
  without it an owner is never warned that their trial is ending. The Stripe billing
  portal configuration must allow updating a payment method, since that is how a
  trial converts to a paid subscription. A deployment with `BILLING_ENABLED` off
  creates no Stripe objects and grants no trials; every organization stays
  entitled, as before (ADR-0001). Enable the `xms_edov` claim on the Microsoft
  app registration before deploying (see the `@zemio/web` onboarding changeset):
  without it every existing user stays unverified until they confirm by mail.

- [#193](https://github.com/zemio-co/zemio/pull/193) [`df1d26d`](https://github.com/zemio-co/zemio/commit/df1d26dd53945b716a4efd6f9511d7bad7dfecfa) Thanks [@chris23lngr](https://github.com/chris23lngr)! - Send transactional email through Scaleway instead of Resend, and move the
  templates and transport into the new `@zemio/email` package.

  Requires `SCALEWAY_TEM_SECRET_KEY`, `SCALEWAY_TEM_PROJECT_ID` and `EMAIL_FROM`
  to be set; `RESEND_API_KEY` is no longer read. `EMAIL_FROM` was previously
  validated but ignored, and is now the sender of every outgoing email, written as
  `Name <address>` on a domain verified in Scaleway.

  Emails now carry a plaintext part alongside the HTML, and their links are built
  from `BETTER_AUTH_URL` rather than guessed from `NODE_ENV` — which had status
  notifications in production linking to another domain, and every staging email
  linking to production.

- [#197](https://github.com/zemio-co/zemio/pull/197) [`0fa6617`](https://github.com/zemio-co/zemio/commit/0fa66171242d8cf5dfb0b0c1dea327a760a28dc9) Thanks [@chris23lngr](https://github.com/chris23lngr)! - Give onboarding a flow of its own, under `/onboarding`, and a second way in
  that needs no Microsoft account.

  Signing in with an email address sends a magic link. Opening it signs the
  person in and verifies the address, which is the same proof a confirmation mail
  asks for arriving one step earlier (ADR-0008). A work or school Microsoft
  account is now verified without a mail when its tenant has proved the address's
  domain to Microsoft, which the token says in its `xms_edov` claim (ADR-0010).
  The tenant alone is not enough, because a tenant administrator can give a user
  any address. Personal Microsoft accounts, and work accounts on an unproved
  domain, still verify by mail.

  Somebody who signed in by magic link can later sign in with Microsoft for the
  same address and land in the same account, on the same proof. Without it the
  sign-in is refused, and the sign-in page says to use a sign-in link instead.

  The flow is four pages, walked once: confirm the address, choose a name,
  join an organization, or create one. Each step is derived from the user record
  rather than a stored cursor, so the only fact kept is whether onboarding
  finished — which is a different question from whether somebody belongs to an
  organization today, and the reason a person removed from their last one is
  offered a way back in rather than the flow again. Nobody reaches the
  application without finishing it, and nobody who has finished it sees it again.

  The name step is skipped where Microsoft supplied a name and required where
  nothing did, so nobody who walks the flow reaches the application nameless.

  `/no-org` moves to `/onboarding/no-org`, keeping the invitations and the
  create-organization form it gained with self-serve onboarding, and now sharing
  those components with the flow's own organization step.

  **Operators:** the migration adds `user.onboardingCompletedAt` and stamps every
  existing user with their `createdAt`. Without that backfill the entire user
  base would land in the onboarding funnel on deploy day, including people who
  have been working in Zemio for months.

  **Operators:** add the optional claims `email` and `xms_edov` to the ID token
  of the Microsoft app registration. Without them nobody is verified by their
  tenant and Microsoft sign-ins never join an existing account; everything else
  works, and addresses verify by mail.

- [#195](https://github.com/zemio-co/zemio/pull/195) [`76a8137`](https://github.com/zemio-co/zemio/commit/76a813720a9258d602bf0896fa3e5392b22aeeac) Thanks [@chris23lngr](https://github.com/chris23lngr)! - Remove the agentation dev overlay from the web app and drop its pinned agent
  skills.

  The overlay mounted only under `NODE_ENV=development` and talked to a local
  endpoint on port 4747, so no deployed build ever rendered it. Removing the
  package takes the import and the conditional mount in the root layout with it.

  `skills-lock.json` also pinned two skills from the same upstream —
  `agentation` and `agentation-self-driving`. With the package gone those were
  dead config that could still point an agent at an overlay that no longer
  exists, so they are removed too. Nothing to change in any environment.

- [#185](https://github.com/zemio-co/zemio/pull/185) [`28a5652`](https://github.com/zemio-co/zemio/commit/28a56528da5b95e6ab6669e2987ec5e6ae393eef) Thanks [@chris23lngr](https://github.com/chris23lngr)! - Replace Better Stack error tracking and logging with AppSignal (DEV-43).

  The `@sentry/nextjs` SDK, which pointed at Better Stack's Sentry-compatible
  ingest, is removed along with the `@logtail/node` log transport. Error tracking
  now runs on `@appsignal/nodejs` (server) and `@appsignal/javascript` (browser),
  and application logs go to AppSignal with user identifiers redacted.

  Deployments must set `APPSIGNAL_PUSH_API_KEY`, `APPSIGNAL_FRONTEND_KEY`,
  `APPSIGNAL_APP_NAME` and `APPSIGNAL_APP_ENV`; the `BETTER_STACK_*` and
  `SENTRY_*` variables are no longer read. The web image now
  builds on a glibc base, because AppSignal selects its native agent at install
  time and the runtime image is Debian.

### Patch Changes

- [#196](https://github.com/zemio-co/zemio/pull/196) [`e8bb432`](https://github.com/zemio-co/zemio/commit/e8bb4325e4aac5127157d88e9dc6101cd73dacae) Thanks [@chris23lngr](https://github.com/chris23lngr)! - sidebar adheares to the new ui package

- [#187](https://github.com/zemio-co/zemio/pull/187) [`45bf5c8`](https://github.com/zemio-co/zemio/commit/45bf5c80c31871d92a2a85fc22f6d7bb227dfcdd) Thanks [@chris23lngr](https://github.com/chris23lngr)! - Bake the build's commit SHA into the image as `APP_REVISION` instead of
  configuring it per environment.

  AppSignal opens a deploy marker whenever the revision changes, and links
  backtrace frames to the repo at that commit — so the value has to be the real
  commit and has to agree between build time and runtime. Setting it by hand on
  each platform could only ever drift, and a stale revision is worse than an
  absent one.

  CI now passes `--build-arg APP_REVISION=${{ github.sha }}`. Nothing to configure
  on Coolify or Railway; remove `APP_REVISION` if you set it there.

- [#193](https://github.com/zemio-co/zemio/pull/193) [`f326063`](https://github.com/zemio-co/zemio/commit/f32606339fc201257f0695516f0b030a5419ae4e) Thanks [@chris23lngr](https://github.com/chris23lngr)! - Send the submission confirmation to owners who never opened their notification
  preferences.

  A missing preferences row was emitted as `null` and compared against `ALL`, so
  the confirmation was skipped — while the same `null` passed the status-change
  check and those emails were sent. Both now see the `ALL` that the schema default
  and the preferences screen already promised.

- [#188](https://github.com/zemio-co/zemio/pull/188) [`1dff194`](https://github.com/zemio-co/zemio/commit/1dff194e8e2613e724acacf2bbcebc277490b264) Thanks [@chris23lngr](https://github.com/chris23lngr)! - Upload browser sourcemaps to AppSignal so frontend backtraces resolve to real
  code instead of minified chunk names.

  Maps are uploaded privately and stripped from the served assets — they embed the
  original source, so serving them would publish the frontend. CI extracts them
  from the image it just pushed, because Turbopack chunk names are not stable
  across builds and maps from a second build would resolve nothing.

  Requires a new `APPSIGNAL_PUSH_API_KEY` GitHub Actions secret.

- [#199](https://github.com/zemio-co/zemio/pull/199) [`0e7b991`](https://github.com/zemio-co/zemio/commit/0e7b991adb0086dba240a204ad8cf8f20f295694) Thanks [@chris23lngr](https://github.com/chris23lngr)! - Stop requiring environment variables the web app never reads.

  `MICROSOFT_TENANT_ID` was required at startup but unused: sign-in goes through
  the multi-tenant Microsoft authority, and each user's tenant is recorded from
  their login. `SUPERUSER_ID` was optional and read by nothing. Both can be
  removed from every environment. The tRPC client also no longer checks
  `VERCEL_URL`, since Zemio is not deployed on Vercel.

- [#190](https://github.com/zemio-co/zemio/pull/190) [`bef2667`](https://github.com/zemio-co/zemio/commit/bef26673dae90497d259b3b9a82559d4c61d053c) Thanks [@chris23lngr](https://github.com/chris23lngr)! - Redact user identifiers on the stdout fallback path, so container logs stay safe
  to drain.

  Logging to stdout previously kept full fields on the grounds that they never
  left the host. A log drain removes that guarantee, so the fallback is now
  redacted wherever stdout can leave — full fields survive only in development.

- [#198](https://github.com/zemio-co/zemio/pull/198) [`daee3f3`](https://github.com/zemio-co/zemio/commit/daee3f35cc24a2fcef864e2be34ae9cc9bc8c4dc) Thanks [@chris23lngr](https://github.com/chris23lngr)! - refactor(ui): take every UI primitive from @zemio/ui

- Updated dependencies [[`0fa6617`](https://github.com/zemio-co/zemio/commit/0fa66171242d8cf5dfb0b0c1dea327a760a28dc9), [`daee3f3`](https://github.com/zemio-co/zemio/commit/daee3f35cc24a2fcef864e2be34ae9cc9bc8c4dc)]:
  - @zemio/i18n@0.3.0
  - @zemio/ui@0.1.1
  - @zemio/email@0.1.0

## 1.2.0

### Minor Changes

- [#183](https://github.com/zemio-co/zemio/pull/183) [`82bcc3b`](https://github.com/zemio-co/zemio/commit/82bcc3bbee351a9d6a576f814d28a0e82fd41484) Thanks [@chris23lngr](https://github.com/chris23lngr)! - implement billing with stripe

### Patch Changes

- [#179](https://github.com/zemio-co/zemio/pull/179) [`14eafc5`](https://github.com/zemio-co/zemio/commit/14eafc50fe55e61dcd3463ae65b703f73d7c9c4b) Thanks [@chris23lngr](https://github.com/chris23lngr)! - fix: issue report numbers per organization instead of from a global counter

- Updated dependencies [[`82bcc3b`](https://github.com/zemio-co/zemio/commit/82bcc3bbee351a9d6a576f814d28a0e82fd41484)]:
  - @zemio/i18n@0.2.0

## 1.1.0

### Minor Changes

- [#174](https://github.com/zemio-co/zemio/pull/174) [`cf9b230`](https://github.com/zemio-co/zemio/commit/cf9b230161eb82f3936991d57b9fa2e0d78b63e3) Thanks [@chris23lngr](https://github.com/chris23lngr)! - allow custom colors for cost units

- [#176](https://github.com/zemio-co/zemio/pull/176) [`cee7b16`](https://github.com/zemio-co/zemio/commit/cee7b166f86fb4b4a184e26fa4fd3fa08ead4708) Thanks [@chris23lngr](https://github.com/chris23lngr)! - improve database schema and tRPC endpoints

- [#172](https://github.com/zemio-co/zemio/pull/172) [`fc226aa`](https://github.com/zemio-co/zemio/commit/fc226aaf860c59b6b7599da2ce4478d20ac6a1e8) Thanks [@chris23lngr](https://github.com/chris23lngr)! - improve use of language across apps using translations & next-intl

- [#171](https://github.com/zemio-co/zemio/pull/171) [`b065953`](https://github.com/zemio-co/zemio/commit/b06595363e50ad17801e603eaac3d7f40a090e80) Thanks [@chris23lngr](https://github.com/chris23lngr)! - paid status for reports with giro code ability

- [#177](https://github.com/zemio-co/zemio/pull/177) [`c8c26a9`](https://github.com/zemio-co/zemio/commit/c8c26a9018d1d637bf52102f76b74905da3dc548) Thanks [@chris23lngr](https://github.com/chris23lngr)! - updated applications to use the new ui package

### Patch Changes

- [#173](https://github.com/zemio-co/zemio/pull/173) [`0d27e58`](https://github.com/zemio-co/zemio/commit/0d27e58fc2703007d347ee60137fb70138b0e376) Thanks [@chris23lngr](https://github.com/chris23lngr)! - hide draft reports from admins

- [#169](https://github.com/zemio-co/zemio/pull/169) [`1f56113`](https://github.com/zemio-co/zemio/commit/1f56113b80437dcff050ccda14b5d63f48326322) Thanks [@chris23lngr](https://github.com/chris23lngr)! - reporting endpoints return only top 5 entries

- Updated dependencies [[`782e1b2`](https://github.com/zemio-co/zemio/commit/782e1b28fb9aed2994369f45a53d37053d6b573b), [`cee7b16`](https://github.com/zemio-co/zemio/commit/cee7b166f86fb4b4a184e26fa4fd3fa08ead4708), [`fc226aa`](https://github.com/zemio-co/zemio/commit/fc226aaf860c59b6b7599da2ce4478d20ac6a1e8), [`c8c26a9`](https://github.com/zemio-co/zemio/commit/c8c26a9018d1d637bf52102f76b74905da3dc548)]:
  - @zemio/ui@0.1.0
  - @zemio/i18n@0.1.0

## 1.0.0

Exits the prerelease cycle entered for the 1.0.0 major bump below; no
functional change from 1.0.0-alpha.0.

## 1.0.0-alpha.0

### Major Changes

- [#161](https://github.com/zemio-co/zemio/pull/161) [`979b5da`](https://github.com/zemio-co/zemio/commit/979b5dac8f6b03dbf5a30f687a0a90d6503ded8c) Thanks [@chris23lngr](https://github.com/chris23lngr)! - Initial stable release of zemio stack
