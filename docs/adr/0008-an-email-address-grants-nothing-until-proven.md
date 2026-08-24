# An email address grants nothing until Zemio has proof of it

An email address arriving from an identity provider is treated as a hint, not as
a fact. It names where a person can be reached and which invitation might be
theirs; on its own it admits them to nothing. Zemio grants access on the strength
of an address only once it has verified that address itself.

The identifier of a credential is never the email. It is the provider plus the
subject the provider issued — which is already how credentials are stored, in
`Account`'s `providerId` and `accountId`. That part needs no change; this
decision is about what an address is allowed to *do*, not about how logins are
keyed.

Three sources say the same thing, and it is worth recording them because the
alternative looks so reasonable. OpenID Connect Core §5.7 is normative: `sub` and
`iss` together "are the only Claims that an RP can rely upon as a stable
identifier for the End-User", and "other Claims such as `email`, `phone_number`,
`preferred_username`, and `name` MUST NOT be used as unique identifiers for the
End-User". Microsoft says it of their own claim: "This value isn't guaranteed to
be correct and is mutable over time. Never use it for authorization or to save
data for a user." And Better Auth already implements the rule — it links accounts
implicitly only when the provider verified the address or the provider has been
named trusted, and it warns that naming one trusted "may increase the risk of
account takeover".

Microsoft, for Zemio's purposes, is not a provider that verifies. Its tokens
carry no `email_verified` claim at all, so there is no signal to trust or
distrust — only an absence. Verification therefore has to come from Zemio: an
email we send, and a link the person clicks.

Four operations are gated on a verified address, and no others:

- accepting an **Invitation**, which is a grant addressed to an email
- joining through an `EMAIL_DOMAIN` **Joining Rule**
- creating an **Organization**
- starting a **Trial**

Joining through an `MS_TENANT` rule is deliberately *not* gated. The `tid` claim
is a GUID inside a signed token and carries its own proof; it is the one Microsoft
themselves recommend relying on. This asymmetry is the whole point of the
decision — the tenant path is trustworthy and the email path is not, and treating
them alike in either direction would be wrong.

Verification is asked for lazily, at the moment it would grant something, rather
than as a step in every first login. Most people arrive through tenant auto-join
and never need it, and an ask that appears exactly where it matters explains
itself in a way a verification mail sent at login never does.

## Consequences

Every credential type added later must declare how it earns verification, and
that is a design question rather than a configuration one. SAML is already
answered: an assertion links to an existing person only when the organization has
proven ownership of the domain, and otherwise creates a separate identity to be
linked deliberately. Passwordless answers itself, since a magic link *is* the
proof.

`User.emailVerified` becomes load-bearing, having previously been a column
Better Auth required and nothing read. Users who already hold a `Member` row are
backfilled as verified in a one-off migration: they are inside an organization by
an administrator's or a tenant's decision, and demanding retroactive proof would
lock working users out of new invitations while protecting nothing.

This is stricter than common practice, and knowingly so. Many products trust the
Microsoft email claim, and mostly get away with it because tenant administrators
control work addresses. The assets behind this gate are banking details and
expense records, the cost is one email round-trip, and it falls only on paths
people take rarely — but "trust Microsoft for work accounts" would have been a
defensible choice, and a future reader should know it was considered rather than
overlooked.
