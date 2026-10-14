import { describe, expect, it } from "vitest";
import {
	isOnboardingComplete,
	nextOnboardingStep,
	type OnboardingFacts,
	shouldStampCompletion,
} from "./onboarding.policy";

/** Somebody at the very start: signed in, and nothing else. */
function facts(overrides: Partial<OnboardingFacts> = {}): OnboardingFacts {
	return {
		emailVerified: false,
		name: "",
		hasMembership: false,
		isOwner: false,
		completedAt: null,
		...overrides,
	};
}

describe("nextOnboardingStep", () => {
	it("asks for the address first", () => {
		expect(nextOnboardingStep(facts())).toBe("verify-email");
	});

	it("asks for a name once the address is verified", () => {
		expect(nextOnboardingStep(facts({ emailVerified: true }))).toBe("name");
	});

	it("asks for an organization once there is a name", () => {
		expect(
			nextOnboardingStep(facts({ emailVerified: true, name: "Alex Braun" })),
		).toBe("organization");
	});

	it("is done once all three are answered, for somebody who joined", () => {
		// The population that walks no tail: an invitation was accepted, or a
		// joining rule matched, and the organization was already somebody else's.
		expect(
			nextOnboardingStep(
				facts({ emailVerified: true, name: "Alex Braun", hasMembership: true }),
			),
		).toBe("done");
	});

	describe("the founder tail", () => {
		const founder = facts({
			emailVerified: true,
			name: "Alex Braun",
			hasMembership: true,
			isOwner: true,
		});

		it("asks an owner to invite colleagues once the organization exists", () => {
			expect(nextOnboardingStep(founder)).toBe("invite");
		});

		it("holds the owner there until completion is recorded", () => {
			// `trial` is walked to rather than resolved into: the invite step is
			// skippable, so no fact separates "has not invited anybody" from
			// "chose not to", and the tail is left by the last step reporting
			// itself rather than by the resolver noticing.
			expect(nextOnboardingStep(founder)).not.toBe("trial");
			expect(nextOnboardingStep(founder)).not.toBe("done");
		});

		it("lets the owner through once completion is recorded", () => {
			expect(nextOnboardingStep({ ...founder, completedAt: new Date() })).toBe(
				"done",
			);
		});

		it("does not start the tail before there is an organization", () => {
			// Owning nothing yet, so the earlier step still stands.
			expect(
				nextOnboardingStep({
					...founder,
					hasMembership: false,
					isOwner: false,
				}),
			).toBe("organization");
		});

		it("does not skip the earlier steps for an owner", () => {
			// A platform administrator can make somebody an owner before they have
			// confirmed anything. The order still holds.
			expect(nextOnboardingStep({ ...founder, emailVerified: false })).toBe(
				"verify-email",
			);
		});
	});

	it("treats whitespace as no name at all", () => {
		expect(nextOnboardingStep(facts({ emailVerified: true, name: "   " }))).toBe(
			"name",
		);
	});

	it("does not skip ahead when a later step is already answered", () => {
		// Somebody auto-joined by a Microsoft tenant during session creation has
		// an organization before they have confirmed anything. The order still
		// holds: an unverified address is asked about first.
		expect(nextOnboardingStep(facts({ hasMembership: true }))).toBe(
			"verify-email",
		);
	});

	describe("once it has been completed", () => {
		const completed = facts({
			emailVerified: true,
			name: "Alex Braun",
			hasMembership: true,
			completedAt: new Date("2026-01-01T00:00:00Z"),
		});

		it("stays done", () => {
			expect(nextOnboardingStep(completed)).toBe("done");
		});

		it("stays done after the last membership is gone", () => {
			// The reason the column exists. Removed from their only organization,
			// this person is indistinguishable from someone who never joined one
			// — and must be offered the way back in, not the way in.
			expect(nextOnboardingStep({ ...completed, hasMembership: false })).toBe(
				"done",
			);
		});

		it("stays done for an address that was somehow un-verified", () => {
			expect(nextOnboardingStep({ ...completed, emailVerified: false })).toBe(
				"done",
			);
		});
	});
});

describe("shouldStampCompletion", () => {
	it("recognises completion that nothing has recorded yet", () => {
		// Membership arrives by four routes and only two pass through a hook
		// this code owns, so completion is recognised rather than reported.
		expect(
			shouldStampCompletion(
				facts({ emailVerified: true, name: "Alex Braun", hasMembership: true }),
			),
		).toBe(true);
	});

	it("does not stamp an owner who still owes the tail", () => {
		// The one population completion cannot be inferred for: the last step is
		// a page being read, and `user.completeOnboarding` is what reports it.
		expect(
			shouldStampCompletion(
				facts({
					emailVerified: true,
					name: "Alex Braun",
					hasMembership: true,
					isOwner: true,
				}),
			),
		).toBe(false);
	});

	it("does not stamp an unfinished flow", () => {
		expect(
			shouldStampCompletion(facts({ emailVerified: true, name: "Alex Braun" })),
		).toBe(false);
	});

	it("does not stamp twice", () => {
		expect(
			shouldStampCompletion(
				facts({
					emailVerified: true,
					name: "Alex Braun",
					hasMembership: true,
					completedAt: new Date("2026-01-01T00:00:00Z"),
				}),
			),
		).toBe(false);
	});
});

describe("isOnboardingComplete", () => {
	it("agrees with the step resolver", () => {
		const halfway = facts({ emailVerified: true });

		expect(isOnboardingComplete(halfway)).toBe(false);
		expect(nextOnboardingStep(halfway)).not.toBe("done");
	});
});
