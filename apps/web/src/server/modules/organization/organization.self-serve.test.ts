import { describe, expect, it } from "vitest";
import { refuseSelfServeCreation } from "./organization.self-serve";

describe("refuseSelfServeCreation", () => {
	const eligible = { emailVerified: true, trialingOrganizations: 0 };

	it("allows someone with a verified address and no trial running", () => {
		expect(refuseSelfServeCreation(eligible)).toBeNull();
	});

	it("refuses an unverified address", () => {
		// Creating an organization makes someone its owner and starts a trial
		// billing mail is sent about. An address nobody has proved grants
		// neither (ADR-0008).
		expect(refuseSelfServeCreation({ ...eligible, emailVerified: false })).toBe(
			"email_not_verified",
		);
	});

	it("refuses a second organization while a trial is already running", () => {
		expect(
			refuseSelfServeCreation({ ...eligible, trialingOrganizations: 1 }),
		).toBe("trial_in_progress");
	});

	it("reports the unverified address first when both apply", () => {
		// The one the person can act on immediately, and the one that stops
		// them being told about a trial they cannot start anyway.
		expect(
			refuseSelfServeCreation({
				emailVerified: false,
				trialingOrganizations: 1,
			}),
		).toBe("email_not_verified");
	});
});
