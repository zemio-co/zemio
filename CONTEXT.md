# Zemio

Expense reporting for student initiatives. Organizations collect their members'
expenses into reports, review them, and pay them out. Organizations subscribe to
Zemio to use the product.

Zemio does not move money on behalf of these organizations. Reimbursements are
paid by the organization through its own banking arrangements; Zemio only
records the banking details needed to make that payment.

## Language

### Organizations and people

**Organization**:
A student initiative using Zemio. The unit of tenancy, of billing, and of
ownership for every report and setting.
_Avoid_: tenant, company, account, client, customer

**Member**:
A person's participation in one organization, carrying their role there. A
person belonging to three organizations is three Members.
_Avoid_: seat, user, participant

**User**:
A person with a Zemio login, independent of any organization.
_Avoid_: account, profile

**Verified Email**:
An address Zemio has itself confirmed the person receives mail at. An address
asserted by an identity provider is not verified, however it arrived. Nothing an
address alone would grant is granted until it is verified — an **Invitation**,
a domain **Joining Rule**, creating an **Organization**, starting a **Trial**.
A tenant Joining Rule is the exception, because it reads a signed claim rather
than an address (ADR-0008).
_Avoid_: confirmed email, validated email, primary email

**Joining Rule**:
A standing statement by an organization about who may join it without being
invited — a Microsoft tenant, an email domain, or an SSO connection — and on
what terms: joined automatically, or admitted on request. Distinct from an
**Invitation**, which names one person once and expires.
_Avoid_: domain rule, auto-join, allowlist, provisioning rule

**Invitation**:
A named person's one-time, expiring grant to join a single organization,
attributed to the member who sent it.
_Avoid_: invite link, request, referral

### Expenses

**Report**:
A collection of expenses submitted together for a single purpose, moving through
review as one unit.
_Avoid_: claim, submission, expense report

**Expense**:
A single amount spent within a report — a receipt, a travel allowance, or a food
allowance.
_Avoid_: line item, entry, cost

### Billing

**Trial**:
A fixed period during which a newly self-created organization is entitled
without having paid and without having given a card. It ends on a date fixed
when it starts; an organization whose trial ends without a card becomes
**Read-Only**. Only ever an organization's first trial.
_Avoid_: free tier, demo, evaluation, freemium

**Subscription**:
An organization's ongoing agreement to pay for Zemio. An organization has at
most one, and it is the organization's — never a person's.
_Avoid_: plan, contract, licence

**Tier**:
A named commercial offering — S, M, L, or a custom XL. Tiers differ only in how
many members they include; every tier grants identical functionality.
_Avoid_: plan, package, level, product

**Seat**:
One member's worth of a tier's included allowance. Seats are counted, never
issued or assigned: one member consumes one seat, whatever their role.
_Avoid_: licence, slot, user

**Seat Limit**:
The number of seats a tier includes. It is an expectation, not a barrier —
exceeding it is visible but never prevents anything.
_Avoid_: cap, quota, maximum

**Over Seat Limit**:
An organization with more members than its seat limit. Independent of
entitlement: an over-limit organization remains fully entitled.
_Avoid_: over quota, exceeded, overage

**Entitlement**:
Whether an organization may currently create new work in Zemio. Distinct from
any Stripe status — an organization behind on payment is still entitled, and so
is every organization when billing is switched off.
_Avoid_: access, active, paid-up, subscribed

**Lapsed**:
A subscription that has ended without payment. A lapsed organization becomes
read-only.
_Avoid_: expired, suspended, delinquent, churned

**Read-Only**:
The state of an unentitled organization: everything already recorded stays
visible and exportable, but no new reports or expenses can be created or
submitted.
_Avoid_: locked, frozen, suspended, disabled

**Billing Provider**:
Stripe. It is the record of what an organization pays, what tiers exist, and
what each tier includes. Zemio holds a cached copy of the current state, never
the history.
_Avoid_: payment gateway, processor

### Stripe's own vocabulary

These words belong to Stripe and should not be reused for Zemio concepts:
`active`, `past_due`, `canceled`, `unpaid`, `price`, `plan`, `customer`,
`quantity`. When a Stripe status is meant, name it as Stripe's; when Zemio's own
concept is meant, use **Entitlement**, **Tier**, or **Organization**.
