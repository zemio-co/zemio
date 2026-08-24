import { describe, expect, it } from "vitest";
import {
	mayStartTrial,
	refuseSelfServeCreation,
} from "./organization.self-serve";

describe("refuseSelfServeCreation", () => {
	it("allows someone with a verified address", () => {
		expect(refuseSelfServeCreation({ emailVerified: true })).toBeNull();
	});

	it("refuses an unverified address", () => {
		// Creating an organization makes someone its owner and starts a trial
		// billing mail is sent about. An address nobody has proved grants
		// neither (ADR-0008).
		expect(refuseSelfServeCreation({ emailVerified: false })).toBe(
			"email_not_verified",
		);
	});
});

describe("mayStartTrial", () => {
	it("gives a first organization a trial", () => {
		expect(mayStartTrial({ trialingOrganizations: 0 })).toBe(true);
	});

	it("withholds a trial from someone already trialling", () => {
		expect(mayStartTrial({ trialingOrganizations: 1 })).toBe(false);
	});

	it("does not refuse the organization itself", () => {
		// One trial at a time, not one organization: somebody running two
		// initiatives may create the second, it just starts unentitled and has
		// to subscribe (ADR-0009). Both halves asserted together, because the
		// claim is that the two answers differ.
		expect(mayStartTrial({ trialingOrganizations: 1 })).toBe(false);
		expect(refuseSelfServeCreation({ emailVerified: true })).toBeNull();
	});
});
