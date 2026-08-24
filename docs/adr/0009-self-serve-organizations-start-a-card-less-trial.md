# Self-serve organizations start a card-less trial that ends read-only

An organization created by a person, rather than provisioned by a platform
administrator, starts a 30-day trial: a real Stripe subscription, on a price
tagged as the trial tier, with no payment method and no card asked for. If no
card arrives before the trial ends, the organization becomes read-only.

The trial is a Stripe subscription rather than a date column on `Organization`,
because Stripe's `trialing` status already maps to entitled and nothing else has
to know a trial exists. The portal, the webhooks, the cached `Subscription` row
and the tier metadata all work unchanged, and ADR-0003 and ADR-0004 hold. The
word "trial" appears nowhere in `billing.policy.ts`.

**The ending is the decision, and it is `cancel`.** Stripe offers three endings
for a trial that expires with no payment method, chosen when the subscription is
created. `pause` would leave the subscription `paused`, which Zemio maps to
`payment_failing` and therefore to *entitled* — and `customer.subscription.paused`
is not a webhook Zemio handles, so nothing would record it either. By two
independent routes, `pause` turns a 30-day trial into a permanent free tier that
nobody chose and nobody would notice. `create_invoice` raises a debt against
someone who never gave a card and starts dunning mail for it. `cancel` produces
`canceled`, which is already mapped to read-only and already arrives as
`customer.subscription.deleted`, an event the webhook already handles. It is the
only ending that lands on machinery Zemio has.

Read-only here means what ADR-0006 already defined: every report, expense,
attachment and export stays available, and only new work is refused. A trial
ending is not a reason to withhold an organization's own records.

**A self-hosted deployment has no trial at all.** When billing is switched off,
organization creation makes no Stripe call, writes no `Subscription`, and the
organization is entitled unconditionally by ADR-0001. The trial is a property of
the hosted product, not of Zemio, which is what keeps the self-hostable path free
of a billing dependency.

Two further points, both consequences of failing open. `billingEnforced` is set
to `true` only *after* Stripe confirms the subscription — a trial that fails to
start leaves a working organization and a log line, never a brand-new
organization that is read-only on arrival for a reason its owner can neither see
nor fix. And a person may hold only one trialing organization at a time; a second
organization is allowed, because people genuinely run two initiatives, but it
starts unentitled and must subscribe.

## Consequences

Converting a trial to a paid subscription happens in Stripe's portal, not through
checkout. `mayStartCheckout` refuses whenever a live subscription exists, and
`trialing` is live — deliberately, since a second checkout would create a second
Stripe subscription that Stripe bills and Zemio cannot record. The interface must
therefore offer the portal during a trial, and the portal configuration must
allow updating a payment method, or the one action that converts a trial is
missing from the page Stripe renders.

`customer.subscription.trial_will_end` becomes an event Zemio handles. It arrives
three days out and is the only new billing code the trial requires; without it an
unattended organization goes read-only mid-report with no warning.

Which tier a trial runs on is chosen in Stripe, by tagging exactly one price
`zemio_trial`, not inferred from the catalogue. "Lowest" is ambiguous between
fewest seats and cheapest, the two diverge across billing intervals, and any
inference would break the first time a promotional price is added.

`Organization.stripeCustomerId` is no longer lazy. Its comment records that an
organization gets a customer only when an owner first reaches checkout; for
self-serve organizations the customer now exists from creation, and that comment
needs correcting.

This partially reverses `allowUserToCreateOrganization: false`. Platform
administrators keep their provisioning path, and ADR-0005's remark that moving
away from tenant auto-join would be "a change to how people join Zemio, not a
billing detail" is precisely the change now under way — recorded there as a
plausible future direction, and now taken.
