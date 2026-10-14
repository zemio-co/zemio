import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FieldError, FieldErrorFormatProvider } from "./field";

const upper = (message: string) => message.toUpperCase();

describe("FieldError", () => {
	it("renders a message as it arrives without a provider", () => {
		render(<FieldError errors={[{ message: "expense.startDateRequired" }]} />);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"expense.startDateRequired",
		);
	});

	it("formats a single message through the provider", () => {
		render(
			<FieldErrorFormatProvider format={upper}>
				<FieldError errors={[{ message: "required" }]} />
			</FieldErrorFormatProvider>,
		);

		expect(screen.getByRole("alert")).toHaveTextContent("REQUIRED");
	});

	it("formats every message of a list through the provider", () => {
		render(
			<FieldErrorFormatProvider format={upper}>
				<FieldError errors={[{ message: "first" }, { message: "second" }]} />
			</FieldErrorFormatProvider>,
		);

		expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
			"FIRST",
			"SECOND",
		]);
	});
});
