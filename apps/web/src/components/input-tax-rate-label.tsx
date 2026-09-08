"use client";

import type { InputTaxRate } from "@zemio/db/enums";
import { useTranslations } from "next-intl";

const OPTION_KEYS = {
	STANDARD: "standard",
	REDUCED: "reduced",
	NONE: "none",
} as const satisfies Record<InputTaxRate, string>;

/**
 * The input tax a receipt states, as a short label.
 *
 * Shown wherever an expense is read, because the export turns this value into a
 * deduction claimed in the customer's name: the submitter has to be able to
 * check what they answered, and the admin who pays the report — making it
 * immutable — has to see what they are approving.
 *
 * Renders nothing for an allowance or for a row written before the column
 * existed. Both are genuinely absent rather than "0 %", and a rate shown where
 * none was stated would read as a claim nobody made.
 */
export function InputTaxRateLabel({ value }: { value: InputTaxRate | null }) {
	const t = useTranslations("modules.report.common.inputTaxRate");

	if (!value) return null;

	return <>{t(`options.${OPTION_KEYS[value]}`)}</>;
}
