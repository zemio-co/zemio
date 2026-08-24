import { describe, expect, it } from "vitest";
import {
	chooseActiveOrganization,
	emailDomain,
	gateInvitation,
	type JoiningRuleFacts,
	matchesPerson,
	organizationsToAutoJoin,
	type PersonSignals,
} from "./joining.policy";

const TENANT = "8f2a1c40-1111-4c5b-b112-36a304b66dad";

function person(overrides: Partial<PersonSignals> = {}): PersonSignals {
	return {
		email: "someone@uni.de",
		emailVerified: false,
		microsoftTenantId: null,
		...overrides,
	};
}

function rule(overrides: Partial<JoiningRuleFacts> = {}): JoiningRuleFacts {
	return {
		organizationId: "org_1",
		type: "MS_TENANT",
		value: TENANT,
		mode: "AUTO_JOIN",
		...overrides,
	};
}

describe("emailDomain", () => {
	it("takes the part after the last @", () => {
		expect(emailDomain("someone@uni.de")).toBe("uni.de");
		expect(emailDomain("odd@name@uni.de")).toBe("uni.de");
	});

	it("lowercases, because a domain is not case sensitive", () => {
		expect(emailDomain("Someone@UNI.de")).toBe("uni.de");
	});

	it("returns null for anything that is not an address", () => {
		expect(emailDomain("not-an-address")).toBeNull();
		expect(emailDomain("trailing@")).toBeNull();
		expect(emailDomain("")).toBeNull();
	});
});

describe("matchesPerson: MS_TENANT", () => {
	it("matches a person whose tenant claim is the rule's value", () => {
		expect(matchesPerson(rule(), person({ microsoftTenantId: TENANT }))).toBe(
			true,
		);
	});

	it("matches regardless of a verified email, because tid carries its own proof", () => {
		// ADR-0008: `tid` is a GUID inside a signed token. Requiring a verified
		// address here would gate a trustworthy signal on an untrustworthy one.
		expect(
			matchesPerson(
				rule(),
				person({ microsoftTenantId: TENANT, emailVerified: false }),
			),
		).toBe(true);
	});

	it("compares case-insensitively", () => {
		expect(
			matchesPerson(
				rule({ value: TENANT }),
				person({ microsoftTenantId: TENANT.toUpperCase() }),
			),
		).toBe(true);
	});

	it("does not match a person with no tenant claim", () => {
		expect(matchesPerson(rule(), person({ microsoftTenantId: null }))).toBe(
			false,
		);
	});

	it("does not match a different tenant", () => {
		expect(
			matchesPerson(rule(), person({ microsoftTenantId: "other-tenant" })),
		).toBe(false);
	});
});

describe("matchesPerson: EMAIL_DOMAIN", () => {
	const domainRule = rule({ type: "EMAIL_DOMAIN", value: "uni.de" });

	it("matches a verified address in the domain", () => {
		expect(
			matchesPerson(
				domainRule,
				person({ email: "someone@uni.de", emailVerified: true }),
			),
		).toBe(true);
	});

	it("refuses an unverified address, however plausible", () => {
		// The whole of ADR-0008 in one assertion: an address nobody has proved
		// grants nothing, because the claim it arrived on carries no proof.
		expect(
			matchesPerson(
				domainRule,
				person({ email: "someone@uni.de", emailVerified: false }),
			),
		).toBe(false);
	});

	it("does not match a subdomain or a lookalike", () => {
		for (const email of [
			"someone@sub.uni.de",
			"someone@uni.de.evil.com",
			"someone@notuni.de",
		]) {
			expect(
				matchesPerson(domainRule, person({ email, emailVerified: true })),
			).toBe(false);
		}
	});
});

describe("matchesPerson: SSO_CONNECTION", () => {
	it("never matches, because nothing resolves SSO yet", () => {
		expect(
			matchesPerson(
				rule({ type: "SSO_CONNECTION", value: "conn_1" }),
				person({ microsoftTenantId: TENANT, emailVerified: true }),
			),
		).toBe(false);
	});
});

describe("organizationsToAutoJoin", () => {
	const signals = person({ microsoftTenantId: TENANT });

	it("returns every organization whose rule matches", () => {
		// Today's behaviour, preserved: one tenant can open several
		// organizations, and a person joins all of them.
		expect(
			organizationsToAutoJoin(
				[rule({ organizationId: "org_1" }), rule({ organizationId: "org_2" })],
				signals,
			),
		).toEqual(["org_1", "org_2"]);
	});

	it("ignores a matching rule that only admits on request", () => {
		// REQUEST is modelled but not implemented. It must not silently behave
		// like AUTO_JOIN in the meantime.
		expect(organizationsToAutoJoin([rule({ mode: "REQUEST" })], signals)).toEqual(
			[],
		);
	});

	it("ignores rules that do not match", () => {
		expect(organizationsToAutoJoin([rule({ value: "other" })], signals)).toEqual(
			[],
		);
	});

	it("returns each organization once even if several of its rules match", () => {
		expect(
			organizationsToAutoJoin(
				[
					rule({ organizationId: "org_1" }),
					rule({
						organizationId: "org_1",
						type: "EMAIL_DOMAIN",
						value: "uni.de",
					}),
				],
				person({ microsoftTenantId: TENANT, emailVerified: true }),
			),
		).toEqual(["org_1"]);
	});

	it("returns nothing for a person carrying no signals at all", () => {
		expect(organizationsToAutoJoin([rule()], person())).toEqual([]);
	});
});

describe("chooseActiveOrganization", () => {
	const memberships = [
		{ organizationId: "org_old", createdAt: new Date("2026-01-01") },
		{ organizationId: "org_new", createdAt: new Date("2026-06-01") },
	];

	it("returns to the organization the person was last working in", () => {
		expect(chooseActiveOrganization("org_new", memberships)).toBe("org_new");
	});

	it("falls back to the earliest membership when none is remembered", () => {
		expect(chooseActiveOrganization(null, memberships)).toBe("org_old");
	});

	it("falls back when the remembered organization is no longer joined", () => {
		// Removed from that organization since their last login. Sending them
		// back to it would put them in an org context they have no member row
		// for, which every org procedure would then refuse.
		expect(chooseActiveOrganization("org_gone", memberships)).toBe("org_old");
	});

	it("returns null for a person who belongs to nothing", () => {
		expect(chooseActiveOrganization(null, [])).toBeNull();
		expect(chooseActiveOrganization("org_gone", [])).toBeNull();
	});

	it("does not depend on the order rows arrive in", () => {
		expect(chooseActiveOrganization(null, [...memberships].reverse())).toBe(
			"org_old",
		);
	});
});

describe("gateInvitation", () => {
	const now = new Date("2026-08-24T10:00:00Z");
	const invitation = {
		email: "first.last@uni.de",
		status: "pending",
		expiresAt: new Date("2026-08-26T10:00:00Z"),
	};
	const recipient = { email: "first.last@uni.de", emailVerified: true };

	it("lets the recipient through", () => {
		expect(gateInvitation(invitation, recipient, now)).toBe("ready");
	});

	it("compares addresses case-insensitively", () => {
		expect(
			gateInvitation(
				invitation,
				{ ...recipient, email: "First.Last@Uni.de" },
				now,
			),
		).toBe("ready");
	});

	it("names a mismatch rather than refusing flatly", () => {
		// The dead end this exists to remove: Better Auth answers "you are not
		// the recipient", which tells someone signed in as f.last@uni.de nothing
		// about which address would work.
		expect(
			gateInvitation(invitation, { ...recipient, email: "f.last@uni.de" }, now),
		).toBe("wrong_account");
	});

	it("asks for verification before accepting", () => {
		expect(
			gateInvitation(invitation, { ...recipient, emailVerified: false }, now),
		).toBe("needs_verification");
	});

	it("treats the wrong account as the first problem to solve", () => {
		// Verifying the address they are signed in with would not help: it is
		// not the address the invitation was sent to.
		expect(
			gateInvitation(
				invitation,
				{ email: "f.last@uni.de", emailVerified: false },
				now,
			),
		).toBe("wrong_account");
	});

	it("reports an invitation that is missing, spent or expired", () => {
		expect(gateInvitation(null, recipient, now)).toBe("unavailable");
		expect(
			gateInvitation({ ...invitation, status: "accepted" }, recipient, now),
		).toBe("unavailable");
		expect(
			gateInvitation(
				{ ...invitation, expiresAt: new Date("2026-08-23T10:00:00Z") },
				recipient,
				now,
			),
		).toBe("unavailable");
	});
});
