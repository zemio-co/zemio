import { describe, expect, it } from "vitest";
import { invitationAddresses } from "./invitation-addresses";

describe("invitationAddresses", () => {
	it("skips the blank rows the form keeps spare", () => {
		expect(
			invitationAddresses([{ value: "a@uni.de" }, { value: "  " }, { value: "" }]),
		).toEqual(["a@uni.de"]);
	});

	it("invites an address typed twice only once", () => {
		expect(
			invitationAddresses([{ value: "A@Uni.de" }, { value: " a@uni.de " }]),
		).toEqual(["a@uni.de"]);
	});

	it("keeps the order the rows were filled in", () => {
		expect(
			invitationAddresses([{ value: "b@uni.de" }, { value: "a@uni.de" }]),
		).toEqual(["b@uni.de", "a@uni.de"]);
	});
});
