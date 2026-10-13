---
"@zemio/web": minor
"@zemio/i18n": minor
---

Give onboarding a flow of its own, under `/onboarding`, and a second way in
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

The name step is prefilled from Microsoft where the provider supplied a name,
and enforced where nothing did, so no one reaches the application nameless.

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
