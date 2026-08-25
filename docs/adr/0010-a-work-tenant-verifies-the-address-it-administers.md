# A work or school tenant verifies the address it administers

ADR-0008 said an address is verified by Zemio or not at all, and closed by
naming the alternative it had rejected: *"trust Microsoft for work accounts"
would have been a defensible choice, and a future reader should know it was
considered rather than overlooked.* This is that reader, taking that choice.

An address is now verified without a mail from Zemio in exactly one case: the
`tid` claim on a Microsoft id_token names a tenant that is not the consumer
tenant, `9188040d-6c67-4c5b-b112-36a304b66dad`. Everything else in ADR-0008
stands — the four gated operations, the refusal to read `email_verified` or
`verified_primary_email`, and the rule that no provider's assertion about an
address is proof on its own.

## Why a tenant is proof and an assertion is not

The two are different claims about different things, and ADR-0008 collapsed
them.

`email_verified` is an assertion *about an address*: the provider says somebody
once demonstrated they could read it. Microsoft's own documentation says of the
address claim that it "isn't guaranteed to be correct" and must never be used
for authorization, which is what ADR-0008 correctly refused to do.

`tid` is a different claim about a different thing: it identifies the directory
the account lives in, it is a GUID inside a signed token, and ADR-0008 already
trusts it — an `MS_TENANT` joining rule matches on it and is deliberately not
gated on a verified address. A work or school account exists because a tenant
administrator created it inside a directory whose domain Microsoft made them
prove. Trusting `tid` and then sending a confirmation mail to the address that
same tenant issued asks somebody to prove what has already been proved, by a
signal we have already decided to rely on.

A personal account is where the two come apart, and why the exemption is
drawn at the tenant rather than at Microsoft. A consumer account can hold any
address its owner could read once, under rules Zemio cannot inspect and a
directory nobody administers. An `EMAIL_DOMAIN` joining rule would hand such an
account an organization's expense and banking data. So the consumer tenant is
refused, and so is a missing `tid` — a claim this code could not read is not
evidence of anything, and a token we failed to parse must never fall through to
trusted.

## Where it is decided

In the session hook, not the user-create hook. Better Auth writes the `Account`
row carrying the id_token *after* it creates the `User`, so the claim this
decision reads does not exist yet at create time. The create hook therefore
still marks every new address unverified, and the session hook lifts it a
moment later for the accounts that qualify.

It reads the tenant recorded on the user when the current token is unavailable,
rather than only the freshly parsed claim. The stored value has the same
provenance — this code put it there, from a token Better Auth had verified —
and a login where the id_token cannot be read should not un-verify somebody who
was verified yesterday.

## What else changed with it

Magic-link sign-in verifies an address too, and needs no decision here: ADR-0008
anticipated it in as many words — *"Passwordless answers itself, since a magic
link is the proof."* Opening the link demonstrates the mailbox was read, which
is the same proof `sendVerificationEmail` asks for, arriving one step earlier.

## Consequences

The confirmation step in onboarding becomes nearly unreachable, and is built
anyway. Between the two ways in, a work or school account is verified by its
tenant and a magic link is verified by being opened; what remains is a personal
Microsoft account, which is rare and must not be a dead end.

`EMAIL_DOMAIN` joining rules now admit somebody on their first Microsoft login
rather than after a mail round-trip, which is the practical gain and also the
sharpest edge: an organization whose rule names a domain admits everybody that
tenant issues an address in. That was already true of `MS_TENANT` rules and is
the property such a rule exists to have — but it is now reachable through a
second matcher, and an administrator writing one should understand it names a
population, not a person.

Guest accounts in a tenant keep their home addresses, and `tid` names the
resource tenant rather than the address's own directory. Microsoft verifies a
guest's address by sending the invitation to it, so the address is still one
somebody proved they could read — one step further from the domain proof than
the ordinary case, and worth knowing when reading a membership list.
