"use client";

import type * as React from "react";
import { formatIban } from "@/lib/utils";
import { Input } from "./input";

export interface IbanInputProps
	extends Omit<
		React.ComponentProps<typeof Input>,
		"onChange" | "value" | "maxLength"
	> {
	value: string;
	onChange: (value: string) => void;
}

/**
 * A masked input component for IBAN values.
 * Automatically formats the input with spaces every 4 characters,
 * converts to uppercase, and limits to 34 characters (max IBAN length).
 */
export function IbanInput({ value, onChange, ...props }: IbanInputProps) {
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const formatted = formatIban(e.target.value);
		onChange(formatted);
	};

	return (
		<Input
			{...props}
			autoComplete="off"
			maxLength={42}
			onChange={handleChange}
			placeholder="DE85 1234 5678 9012 3456 78"
			value={value}
		/>
	);
}
