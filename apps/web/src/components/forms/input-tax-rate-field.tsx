"use client";

import type { InputTaxRate } from "@zemio/db/enums";
import { useTranslations } from "next-intl";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

/**
 * The input tax a receipt shows, for the DATEV export.
 *
 * Nothing is preselected on purpose. A default of 19 % would claim a deduction
 * the receipt may not carry, in the customer's name, on data nobody checked —
 * and once the report is paid it is immutable, so there is no later correction.
 * "Kein Vorsteuerabzug" is therefore an answer, not the absence of one.
 *
 * The description says whose statement this is. Zemio does not read receipts
 * and makes no claim that the rate is right; that boundary is the reason the
 * field exists rather than a guess in the exporter.
 */
export function InputTaxRateField({
	errors,
	isInvalid,
	name,
	onChange,
	value,
}: {
	errors?: Array<{ message?: string } | undefined>;
	isInvalid: boolean;
	name: string;
	onChange: (value: InputTaxRate | null) => void;
	value: InputTaxRate | "";
}) {
	const t = useTranslations("modules.report.common.inputTaxRate");

	const options: { value: InputTaxRate; label: string }[] = [
		{ value: "STANDARD", label: t("options.standard") },
		{ value: "REDUCED", label: t("options.reduced") },
		{ value: "NONE", label: t("options.none") },
	];

	return (
		<Field data-invalid={isInvalid}>
			<FieldLabel
				className="mb-1 font-semibold text-base text-base-800"
				htmlFor={name}
			>
				{t("label")}
			</FieldLabel>
			<Select
				items={options}
				onValueChange={(next) => onChange((next as InputTaxRate) ?? null)}
				value={value}
			>
				<SelectTrigger aria-invalid={isInvalid} data-invalid={isInvalid} id={name}>
					<SelectValue placeholder={t("placeholder")} />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{options.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								<span>{option.label}</span>
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
			<FieldDescription className="max-w-prose font-normal text-base-500 text-sm/relaxed">
				{t("helper")}
			</FieldDescription>
			{isInvalid && <FieldError errors={errors} />}
		</Field>
	);
}
