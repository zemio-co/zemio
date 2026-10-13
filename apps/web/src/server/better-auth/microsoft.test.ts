import { describe, expect, it } from "vitest";
import {
	decodeMicrosoftIdToken,
	isDomainVerifiedWorkAccount,
	isWorkAccountTenant,
	MICROSOFT_CONSUMER_TENANT_ID,
} from "./microsoft";

/** Builds an unsigned token whose payload carries the given claims. */
function idTokenWith(claims: Record<string, unknown>): string {
	const payload = Buffer.from(JSON.stringify(claims), "utf-8").toString(
		"base64url",
	);
	return `header.${payload}.signature`;
}

describe("isWorkAccountTenant", () => {
	it("accepts a work or school tenant", () => {
		expect(isWorkAccountTenant("11111111-2222-3333-4444-555555555555")).toBe(
			true,
		);
	});

	it("refuses the consumer tenant", () => {
		// A personal Microsoft account can hold any address its owner could read
		// once. Trusting it would let one match an EMAIL_DOMAIN joining rule
		// (ADR-0010).
		expect(isWorkAccountTenant(MICROSOFT_CONSUMER_TENANT_ID)).toBe(false);
		expect(isWorkAccountTenant(MICROSOFT_CONSUMER_TENANT_ID.toUpperCase())).toBe(
			false,
		);
	});

	it("refuses a missing tenant", () => {
		// A claim this code could not read is not evidence of anything.
		expect(isWorkAccountTenant(null)).toBe(false);
		expect(isWorkAccountTenant("  ")).toBe(false);
	});
});

describe("decodeMicrosoftIdToken", () => {
	it("reads the payload's claims", () => {
		expect(
			decodeMicrosoftIdToken(idTokenWith({ tid: "tenant-a", xms_edov: true })),
		).toEqual({ tid: "tenant-a", xms_edov: true });
	});

	it("answers null rather than throwing on a malformed token", () => {
		// This runs inside session creation. A throw here would take down the
		// login it was meant to describe.
		expect(decodeMicrosoftIdToken("not-a-token")).toBeNull();
		expect(decodeMicrosoftIdToken("header..signature")).toBeNull();
		expect(
			decodeMicrosoftIdToken(
				`header.${Buffer.from('"a string"').toString("base64url")}.signature`,
			),
		).toBeNull();
	});
});

describe("isDomainVerifiedWorkAccount", () => {
	const WORK_TENANT = "11111111-2222-3333-4444-555555555555";
	const verified = {
		tid: WORK_TENANT,
		email: "treasurer@initiative.org",
		xms_edov: true,
	};

	it("accepts an address whose domain the work tenant has verified", () => {
		expect(
			isDomainVerifiedWorkAccount(verified, "treasurer@initiative.org"),
		).toBe(true);
	});

	it("compares the address without regard to case", () => {
		expect(
			isDomainVerifiedWorkAccount(
				{ ...verified, email: "Treasurer@Initiative.org" },
				"treasurer@initiative.org",
			),
		).toBe(true);
	});

	it("refuses a work tenant that has not verified the domain", () => {
		// The nOAuth case: a tenant administrator can give a user any address,
		// including one on a domain they have never proved. The tenant alone
		// says nothing about the address (ADR-0010).
		expect(
			isDomainVerifiedWorkAccount(
				{ ...verified, xms_edov: false },
				"treasurer@initiative.org",
			),
		).toBe(false);
	});

	it("refuses a token that does not carry the claim", () => {
		// An app registration without the optional claim must fail closed, back
		// to the verification mail.
		const { xms_edov: _, ...withoutClaim } = verified;
		expect(
			isDomainVerifiedWorkAccount(withoutClaim, "treasurer@initiative.org"),
		).toBe(false);
	});

	it("refuses a claim that is truthy without being true", () => {
		expect(
			isDomainVerifiedWorkAccount(
				{ ...verified, xms_edov: "true" },
				"treasurer@initiative.org",
			),
		).toBe(false);
	});

	it("refuses the consumer tenant and a missing tenant", () => {
		expect(
			isDomainVerifiedWorkAccount(
				{ ...verified, tid: MICROSOFT_CONSUMER_TENANT_ID },
				"treasurer@initiative.org",
			),
		).toBe(false);
		const { tid: _, ...withoutTenant } = verified;
		expect(
			isDomainVerifiedWorkAccount(withoutTenant, "treasurer@initiative.org"),
		).toBe(false);
	});

	it("refuses when the token vouches for a different address", () => {
		// The claim is about the token's address. It proves nothing about the
		// one on the user record.
		expect(isDomainVerifiedWorkAccount(verified, "someone@initiative.org")).toBe(
			false,
		);
	});

	it("refuses when the token carries no address", () => {
		const { email: _, ...withoutEmail } = verified;
		expect(isDomainVerifiedWorkAccount(withoutEmail, "")).toBe(false);
		expect(isDomainVerifiedWorkAccount({ ...verified, email: "" }, "")).toBe(
			false,
		);
	});
});
