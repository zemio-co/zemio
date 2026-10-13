import { describe, expect, it } from "vitest";
import { refuseSelfServeCreation } from "./organization.self-serve";

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
