# A work or school tenant verifies the domains it has proved

ADR-0008 said an address is verified by Zemio or not at all, and closed by
naming the alternative it had rejected: *"trust Microsoft for work accounts"
would have been a defensible choice, and a future reader should know it was
considered rather than overlooked.* This is that reader, taking a narrower
version of that choice.

An address is now verified without a mail from Zemio in exactly one case: a
Microsoft id_token carries `xms_edov: true`, from a tenant that is not the
consumer tenant (`9188040d-6c67-4c5b-b112-36a304b66dad`), for the same address
the user record holds. Everything else in ADR-0008 stands — the four gated
operations, the refusal to read `email_verified` or `verified_primary_email`,
and the rule that no provider's assertion about an address is proof on its own.

## Why the tenant alone is not proof

An earlier draft of this record drew the line at `tid`: a non-consumer tenant
was taken to mean an administrator had created the address in a directory
whose domain Microsoft made them prove. That premise is false, and it was
caught before release.

A tenant administrator can set any address on a user, including one on a
domain the tenant has never proved. Microsoft says so directly: the `email`
claim "isn't guaranteed to be correct, and is mutable over time - never use it
for authorization or to save data for a user", and claims like `email` "can be
controllable by tenant administrators or sometimes users"
([optional claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference),
[claims validation](https://learn.microsoft.com/en-us/entra/identity-platform/claims-validation)).
Trusting the tenant would have let anybody with a tenant of their own — free to
create — have `victim@example.org` verified in Zemio, and with it every
invitation addressed to that person and every `EMAIL_DOMAIN` joining rule for
that domain: an organization's expense and banking data. This is the account
takeover publicly known as "nOAuth".

`tid` remains trustworthy for what it says — which directory the account lives
in — so `MS_TENANT` joining rules are unaffected. It says nothing about the
address.

## Why `xms_edov` is

`xms_edov` ("email domain owner verified") is the claim Microsoft provides for
exactly this question. It is true only when the address "belongs to the tenant
where the user account resides and the tenant admin has done verification of
the domain". That is the proof the earlier draft assumed `tid` gave: the
address is on a domain whose owner proved it to Microsoft, and the account
lives in that owner's directory. Asking the person to confirm the address by
mail as well would ask them to prove what has already been proved.

The claim vouches for the token's own address, so it proves the user's address
only when the two are the same address, compared without regard to case.

It is an optional claim. Both it and `email` have to be enabled on the app
registration's ID token. A token without it is refused, not trusted — a
registration that lacks it degrades to the verification mail. Only the boolean
`true` counts. A consumer tenant and a missing `tid` are refused regardless, as
before.

## Where it is decided

In one function, `isDomainVerifiedWorkAccount`, used in two places.

In the session hook, for a new user: Better Auth writes the `Account` row
carrying the id_token *after* it creates the `User`, so the claim does not
exist yet at create time. The create hook therefore still marks every new
address unverified, and the session hook lifts it a moment later for the
accounts that qualify. It reads the id_token only. The earlier draft fell back
to the tenant stored on the user; a tenant is not proof, and the claim that is
proof is not stored anywhere else. Nobody is un-verified when the token is
unavailable, because the hook only ever sets the flag.

In the Microsoft provider's `mapProfileToUser`, as the `emailVerified` Better
Auth reads when a Microsoft sign-in meets an existing user with the same
address. Better Auth links the two only when that is true *and* Zemio has
verified the existing user's address; otherwise it refuses with
`account_not_linked`, and the sign-in page tells the person to use a sign-in
link to that address instead. Microsoft is deliberately not a trusted provider,
because trusting it skips the token-side proof and links on the tenant-mutable
`email` claim alone — the same takeover, one step later.

## The reverse direction: an address squatted before its owner arrives

Linking guards a Microsoft sign-in meeting an existing user. The reverse also
has to be guarded. Somebody with a tenant of their own can sign in with a
victim's address before the victim ever has: that creates an *unverified* user
on the address, linked to the attacker's Microsoft account. Better Auth's
magic-link plugin would then sign the victim into that user and verify it, and
the attacker's sign-in would open everything the victim put there afterwards.

So a magic link to an address held by an unverified user with a linked account
is refused, when the link is opened rather than when it is requested — refusing
the request would tell anybody whether such a user exists. Refused rather than
detached: whoever holds the linked account keeps it and confirms the address by
mail from inside it. A victim whose address was squatted is sent to support,
which deletes the squatted user. That is a worse experience for the victim than
detaching the linked account would be, and was chosen because it never removes
a sign-in somebody is using.

## What else changed with it

Magic-link sign-in verifies an address too, and needs no decision here: ADR-0008
anticipated it in as many words — *"Passwordless answers itself, since a magic
link is the proof."* Opening the link demonstrates the mailbox was read, which
is the same proof `sendVerificationEmail` asks for, arriving one step earlier.

## Consequences

Somebody who signed in by magic link and later signs in with a Microsoft work
account for the same address is joined to their existing user automatically,
provided the tenant has verified the domain. A personal Microsoft account, or a
work account whose domain is unverified, is refused and keeps using the sign-in
link.

The confirmation step in onboarding stays reachable for more people than the
earlier draft expected: personal Microsoft accounts, and work accounts whose
tenant has not verified the domain or whose app registration does not emit the
claim. It must not be a dead end.

`EMAIL_DOMAIN` joining rules admit somebody on their first Microsoft login when
the tenant has verified the domain, rather than after a mail round-trip. An
organization whose rule names a domain admits everybody that domain's owner
issues an address to. That is the property such a rule exists to have, and an
administrator writing one should understand it names a population, not a
person.

Guest accounts are left to Microsoft's definition of the claim: `tid` names the
resource tenant, and whether a guest's home address counts as domain-verified
is Microsoft's decision, documented on the claim, not one Zemio re-derives.
