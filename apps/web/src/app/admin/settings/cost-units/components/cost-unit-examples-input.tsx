"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

interface ExamplesInputProps {
	value: string[];
	onChange: (examples: string[]) => void;
	placeholder?: string;
}

interface InputItem {
	id: string;
	value: string;
}

export function ExamplesInput({
	value,
	onChange,
	placeholder,
}: ExamplesInputProps) {
	const baseId = useId();
	const counterRef = useRef(0);

	const generateInputId = useCallback(() => {
		return `${baseId}-input-${++counterRef.current}`;
	}, [baseId]);

	// Initialize inputs from value prop, with a trailing empty input for new entries
	const [inputs, setInputs] = useState<InputItem[]>(() => {
		if (value.length === 0) {
			return [{ id: `${baseId}-input-0`, value: "" }];
		}
		// Map existing values to inputs and add a trailing empty input
		const initialInputs = value.map((v, i) => ({
			id: `${baseId}-input-${i}`,
			value: v,
		}));
		counterRef.current = value.length;
		initialInputs.push({
			id: `${baseId}-input-${counterRef.current}`,
			value: "",
		});
		return initialInputs;
	});

	// Sync inputs when external value changes (e.g., form reset)
	// Compare against current internal state to avoid regenerating on round-trips
	useEffect(() => {
		setInputs((currentInputs) => {
			// Get current non-empty values from internal state
			const currentValues = currentInputs
				.map((item) => item.value)
				.filter((v) => v.trim() !== "");

			// Compare incoming value against current internal values
			const isSameContent =
				currentValues.length === value.length &&
				currentValues.every((v, i) => v === value[i]);

			// If content matches, don't regenerate (avoids focus loss on round-trips)
			if (isSameContent) {
				return currentInputs;
			}

			// External value differs from internal state - regenerate inputs
			if (value.length === 0) {
				return [{ id: generateInputId(), value: "" }];
			}

			const restoredInputs = value.map((v) => ({
				id: generateInputId(),
				value: v,
			}));
			restoredInputs.push({ id: generateInputId(), value: "" });
			return restoredInputs;
		});
	}, [value, generateInputId]);

	// Sync non-empty values to parent form (separate effect to avoid setState during render)
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	useEffect(() => {
		const nonEmptyValues = inputs
			.map((item) => item.value)
			.filter((v) => v.trim() !== "");
		onChangeRef.current(nonEmptyValues);
	}, [inputs]);

	const handleChange = useCallback(
		(inputId: string, newValue: string) => {
			setInputs((prev) => {
				const index = prev.findIndex((item) => item.id === inputId);
				if (index === -1) return prev;

				const updated = [...prev];
				updated[index] = { id: inputId, value: newValue };

				// If the last input now has content, add a new empty input
				const isLastInput = index === prev.length - 1;
				if (isLastInput && newValue.trim() !== "") {
					updated.push({ id: generateInputId(), value: "" });
				}

				// Remove empty inputs except for one trailing empty input
				const filtered = updated.filter(
					(item, i) => item.value.trim() !== "" || i === updated.length - 1,
				);

				// Ensure there's always at least one empty input at the end
				const lastItem = filtered[filtered.length - 1];
				if (filtered.length === 0 || (lastItem && lastItem.value.trim() !== "")) {
					filtered.push({ id: generateInputId(), value: "" });
				}

				return filtered;
			});
		},
		[generateInputId],
	);

	return (
		<div className="flex flex-col gap-2">
			{inputs.map((input) => (
				<Input
					key={input.id}
					onChange={(e) => handleChange(input.id, e.target.value)}
					placeholder={placeholder}
					value={input.value}
				/>
			))}
		</div>
	);
}
