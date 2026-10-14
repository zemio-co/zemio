# Billing runbook

How to verify billing against Stripe test mode on a local machine, and how to
turn enforcement on for one organization before turning it on for everyone.

Billing is off by default and stays off unless `BILLING_ENABLED` is exactly
`true` or `1` — any other value, including `yes`, leaves it off. A
self-hoster never needs this document — see
[deployment.md](./deployment.md#runtime-configuration) for the variables
themselves. This is for whoever is changing billing or rolling it out.

Background on why the feature behaves the way it does is in
[docs/adr/](./adr/) — most relevant here:
[0001](./adr/0001-billing-is-optional-and-fails-open.md) (billing is optional and
fails open),
[0003](./adr/0003-stripe-owns-tiers-prices-and-seat-limits.md) (Stripe owns
tiers, prices and seat limits),
[0004](./adr/0004-webhooks-are-refresh-signals-not-state.md) (webhooks are
refresh signals, not state),
[0005](./adr/0005-seat-limits-are-advisory.md) (seat limits are advisory), and
[0006](./adr/0006-unentitled-organizations-become-read-only.md) (what read-only
means).

## Prerequisites

- A Stripe account in **test mode**. Never run any of this against a live key —
  the sandbox script refuses a key that is not `sk_test_…`, but nothing else here
  checks for you.
- The [Stripe CLI](https://docs.stripe.com/stripe-cli), authenticated with
  `stripe login`.
- A local database with at least one organization and one member in it. The
  sandbox script bills the oldest organization it finds, and its `checkout`
  command needs that organization to have an **owner**, because checkout is
  owner-only.

## 1. Point a local Zemio at Stripe test mode

Start the webhook forwarder first, because it prints the signing secret the app
needs:

```sh
stripe listen --forward-to localhost:3000/api/billing/webhook
```

It prints a secret of the form `whsec_…`. Put that, your test secret key, and
the flag in `apps/web/.env`:

```sh
BILLING_ENABLED=true
STRIPE_SECRET_KEY=sk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…      # from `stripe listen`, not from the Dashboard
```

> The `stripe listen` secret is **not** the endpoint signing secret shown in the
> Dashboard. They are different secrets, and using the Dashboard's here makes
> every forwarded event fail signature verification with a 400.

Then start the dev server. Restart it whenever you change any of these three:
the configuration resolves once at module load (`billing.config.ts`), so an
edited `.env` does nothing to a running server. A deployment that sets
`BILLING_ENABLED` without both credentials fails at startup by design, naming
both missing variables at once.

With the flag off, `/api/billing/webhook` answers 404 rather than advertising an
endpoint it cannot verify against — a useful check that the flag is really on.

## 2. Provision the sandbox

```sh
cd apps/web
bun run scripts/billing-sandbox.ts seed
```

This creates, in your Stripe sandbox: a fixture product, an `S` price (10 seats)
and an `M` price (25 seats) carrying the `zemio_tier` and `zemio_seats` metadata
that make a price a tier, and one deliberately untagged price so you can see the
catalogue skip it. It also creates a customer with a card that always succeeds,
links it to the organization, and sets `billingEnforced = true` on it.

Prices are discovered from that metadata alone. A price without `zemio_tier` is
not a tier and will never appear in the product, which is what the untagged
fixture demonstrates.

### Negotiated prices

A price may carry a third key, `zemio_org`, naming the single organization it is
for:

| Metadata | Who sees it, and who can buy it |
| --- | --- |
| `zemio_tier` + `zemio_seats` | Every organization. A published tier. |
| plus `zemio_org=<organizationId>` | Only that organization. |

Use it for every negotiated deal. Without it a bespoke XL rate sits in the
public catalogue: any member of any organization can read its amount and seat
allowance, and any owner can subscribe at it — the catalogue is the same list
checkout validates against, so being listed is being purchasable.

The organization id is the `organization.id` in Zemio's database, not the Stripe
customer id. A blank or absent value means published, so a typo fails towards
the safer half of the two only in that a mistyped id hides the price rather than
exposing it — check the tier appears for the customer before telling them it is
there.

## 3. Trigger each handled event

Zemio acts on exactly five event types. Everything else is recorded and ignored.

| Event | How to produce it | Expect |
| --- | --- | --- |
| `checkout.session.completed` | `bun --conditions=react-server scripts/billing-sandbox.ts checkout M`, then pay | subscription row appears |
| `customer.subscription.created` | `bun run scripts/billing-sandbox.ts create M` | subscription row appears |
| `customer.subscription.updated` | `bun run scripts/billing-sandbox.ts change S` | `tier` and `seatLimit` move to S |
| `customer.subscription.deleted` | `bun run scripts/billing-sandbox.ts cancel` | `status` becomes `canceled` |
| `customer.subscription.trial_will_end` | `bun run scripts/billing-sandbox.ts trial-ending S` | the owner is sent the trial-ending mail |

`trial-ending` starts a card-less trial that ends in a day. Stripe sends
`trial_will_end` a configured interval before a trial ends — three days by
default — and immediately when the trial is shorter than that, which is what
makes the event reproducible. `cancel` it afterwards. A warning is only sent
while the subscription is still trialing, so ending the trial early does not
produce one.

The `checkout` command needs `--conditions=react-server` because it calls the
real `startCheckout` service, whose module graph is `server-only`. It prints a
hosted checkout URL; pay with `4242 4242 4242 4242`, any future expiry, any CVC.
It goes through the real service deliberately, so what Stripe is asked for is
what production asks for.

After each one, compare the two sides:

```sh
bun run scripts/billing-sandbox.ts show
```

It prints what Stripe holds beside what Zemio holds, and the processed-event
count. They should agree on status, price, tier, seats and period end.

> **`stripe trigger` does not exercise the write path.** `stripe trigger
> customer.subscription.created` invents its own customer, which no organization
> claims, so the handler logs `Stripe event for an unrecognised customer` and
> returns `ignored` without writing anything. That is correct behaviour, and it
> makes `stripe trigger` a good check that the endpoint verifies signatures and
> claims event ids — but only the sandbox script above proves that a
> subscription actually lands in the database.

### Idempotency

Every event id is recorded in the same transaction as the state the event
describes, so a redelivery is a no-op and a failure rolls both back together. To
see it, take an id from the `stripe listen` output and resend it:

```sh
stripe events resend evt_…
```

The processed-event count from `show` should not move, and the subscription row
should be untouched. Note the count grows with your whole event volume, not just
the five handled types — one paid checkout leaves roughly thirty rows, which is
expected.

Because the claim and the write share a transaction, an event is never left
recorded without having been applied: a crash rolls the claim back with it, and
Stripe's redelivery is processed normally. There is therefore no state in which
`stripe events resend` is silently a no-op against work that never happened — if
resending changes nothing, the event genuinely was applied.

### Teardown

```sh
bun run scripts/billing-sandbox.ts teardown
```

Cancels the subscription, deletes the customer, clears the local subscription
row, and sets `billingEnforced` back to `false`. The fixture product and its
prices stay in the sandbox for next time.

Processed-event rows are deliberately left behind: nothing on a row says which
organization it came from, so clearing this sandbox's would clear every other
organization's idempotency record with it, and a Stripe redelivery of an
already-handled event would then be applied twice. The count `show` prints
therefore does not return to zero.

## 4. The production webhook endpoint

Everything above uses `stripe listen`, which exists only on your machine. A
deployed Zemio needs a real endpoint, created once per Stripe account:

1. Dashboard → **Developers → Webhooks → Add endpoint**.
2. URL: `https://<your-host>/api/billing/webhook`.
3. Subscribe it to exactly the five events Zemio handles — anything else is
   recorded and ignored:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end` — without it, an owner whose
     card-less trial is about to end is never warned
4. Reveal the endpoint's **signing secret** and set it as
   `STRIPE_WEBHOOK_SECRET` on the deployment.

This is the secret the earlier warning is about: the Dashboard's endpoint secret
belongs here, and the `stripe listen` secret belongs in local `.env`. Swapping
them makes every event fail verification with a 400.

An instance with `BILLING_ENABLED` unset answers this route with a 404, so there
is no endpoint to configure for a self-hosted deployment.

## 5. Enabling enforcement for one organization

Enforcement has two switches, and **both** must be on before anything is ever
refused:

| Switch | Scope | Default |
| --- | --- | --- |
| `BILLING_ENABLED` | the whole deployment | off |
| `Organization.billingEnforced` | one organization | `false` |

With either off, every organization is entitled no matter what Stripe says. That
is what makes a staged rollout possible: turn the deployment flag on with every
organization still at `billingEnforced = false`, and nothing changes for anyone.
The billing interface appears for owners, subscriptions can be started, webhooks
keep state current — but no one is refused anything.

Then opt in one organization at a time. There is no interface for this: it is a
deliberate operator action against the database.

```sql
-- Opt one organization in
UPDATE organization SET "billingEnforced" = true WHERE id = '<organization-id>';

-- Roll it back
UPDATE organization SET "billingEnforced" = false WHERE id = '<organization-id>';
```

Rolling back is immediate and total — the organization is entitled again on its
next request, whatever its subscription says. Start with an organization you
control, confirm it behaves, and only then widen.

### What enforcement actually changes

For an organization whose subscription has lapsed (`canceled`, `unpaid`,
`incomplete_expired`, or no subscription at all), exactly five procedures start
refusing:

- `report.create`
- `report.submit`
- `expense.createReceipt`
- `expense.createTravel`
- `expense.createFood`

Everything else keeps working, and this is an explicit allowlist rather than a
default: reading, exporting, editing existing drafts, banking details, settings,
membership management, and review are all untouched. `report.transition` is
deliberately absent, so an administrator can still finish reviewing work that
was already submitted.

`past_due` and `incomplete` are **entitled** — Stripe is still retrying the card,
and a payment failing on a Friday should not cost the organization its working
week. `paused` is entitled too. An unrecognised status falls open.

Exceeding the seat limit refuses nothing at all, ever. Members are created
automatically when a Microsoft tenant matches, so an organization can cross its
limit through nobody's action; the limit is reported and never enforced
(ADR-0005).
