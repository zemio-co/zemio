import { describe, expect, it } from "vitest";
import { magicLinkLandingUrl } from "./magic-link-landing";

describe("magicLinkLandingUrl", () => {
	const verifyUrl =
		"https://app.zemio.co/api/auth/magic-link/verify?token=abc123&callbackURL=%2F&newUserCallbackURL=%2Fonboarding&errorCallbackURL=%2Fauth";

	it("points at the landing page rather than the token-consuming endpoint", () => {
		const landing = new URL(magicLinkLandingUrl(verifyUrl));

		expect(landing.origin).toBe("https://app.zemio.co");
		expect(landing.pathname).toBe("/auth/magic-link");
	});

	it("carries the token and the callbacks exactly as Better Auth wrote them", () => {
		expect(new URL(magicLinkLandingUrl(verifyUrl)).search).toBe(
			new URL(verifyUrl).search,
		);
	});
});
