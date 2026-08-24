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
signed `tid` claim rather than an address. Addresses arrive unverified whatever
the identity provider asserts, because Better Auth's Entra provider will
otherwise mark a personal Microsoft account verified on its own say-so. Users
who already belong to an organization are grandfathered by the migration, so
nobody who is already working is asked to verify.

Sessions reopen in the organization the person was last working in, rather than
whichever they joined first.

**Operators:** self-serve trials need one Stripe price tagged
`zemio_trial: "true"` in its metadata — without it organizations are still
created and stay entitled, and the missing price is logged. The Stripe billing
portal configuration must allow updating a payment method, since that is how a
trial converts to a paid subscription. A deployment with `BILLING_ENABLED` off
creates no Stripe objects and grants no trials; every organization stays
entitled, as before (ADR-0001).
