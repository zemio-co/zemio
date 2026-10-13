---
"@zemio/web": minor
---

Let people onboard themselves: create an organization, start a 30-day trial
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
