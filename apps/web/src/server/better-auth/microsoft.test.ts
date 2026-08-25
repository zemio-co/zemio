import { describe, expect, it } from "vitest";
import {
	extractMicrosoftTenantId,
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

describe("extractMicrosoftTenantId", () => {
	it("reads the tid claim", () => {
		expect(extractMicrosoftTenantId(idTokenWith({ tid: "tenant-a" }))).toBe(
			"tenant-a",
		);
	});

	it("answers null for a token without the claim", () => {
		expect(extractMicrosoftTenantId(idTokenWith({ sub: "abc" }))).toBeNull();
	});

	it("answers null rather than throwing on a malformed token", () => {
		// This runs inside session creation. A throw here would take down the
		// login it was meant to describe.
		expect(extractMicrosoftTenantId("not-a-token")).toBeNull();
		expect(extractMicrosoftTenantId("header..signature")).toBeNull();
	});
});

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
