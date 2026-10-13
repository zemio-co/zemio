import { describe, expect, it } from "vitest";
import { SELF_SERVE_REFUSAL, selfServeRefusalOf } from "./organization";

describe("selfServeRefusalOf", () => {
	it("recognises every refusal by its marker", () => {
		for (const [reason, marker] of Object.entries(SELF_SERVE_REFUSAL)) {
			expect(selfServeRefusalOf({ message: marker })).toBe(reason);
		}
	});

	it("answers null for any other failure", () => {
		expect(
			selfServeRefusalOf({ message: "Something else went wrong" }),
		).toBeNull();
		expect(selfServeRefusalOf({ message: 42 })).toBeNull();
		expect(selfServeRefusalOf({})).toBeNull();
		expect(selfServeRefusalOf(null)).toBeNull();
		expect(selfServeRefusalOf("EMAIL_NOT_VERIFIED")).toBeNull();
	});
});
