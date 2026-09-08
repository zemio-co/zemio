import { decimalToNumber } from "@/server/shared/money";

/** The two chart-of-accounts values DATEV writes into header field 27. */
type DatevKontenrahmen = "03" | "04";

/**
 * The column is a plain string, so it can in principle hold something the
 * export cannot use. Anything but the two reads as unconfigured: the preflight
 * then names the field, rather than the serializer writing a value DATEV would
 * refuse the whole file over.
 */
function toKontenrahmen(value: string | null): DatevKontenrahmen | null {
	return value === "03" || value === "04" ? value : null;
}

import type { SettingsRow } from "./settings.repository";

/**
 * Org settings with every monetary column converted once, here. Routers and
 * components never see a Decimal, so `Number(...)` cannot reappear at a call
 * site (docs/trpc-architecture.md, "DTOs + Decimal once").
 */
export type SettingsDTO = {
	id: string;
	organizationId: string;
	kilometerRate: number;
	reviewerEmail: string | null;
	costUnitInfoUrl: string | null;
	dailyFoodAllowance: number;
	breakfastDeduction: number;
	lunchDeduction: number;
	dinnerDeduction: number;

	// DATEV export configuration. No Decimals among them, so they pass
	// straight through — the account numbers are strings because a ledger
	// account is an identifier, not a quantity.
	datevBeraternummer: number | null;
	datevMandantennummer: number | null;
	datevWirtschaftsjahrBeginn: Date | null;
	datevSachkontenlaenge: number | null;
	datevKontenrahmen: DatevKontenrahmen | null;
	datevExpenseAccountReceipt: string | null;
	datevExpenseAccountTravel: string | null;
	datevExpenseAccountFood: string | null;
	datevContraAccount: string | null;
	datevFestschreibung: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export function toSettingsDTO(row: SettingsRow): SettingsDTO {
	return {
		id: row.id,
		organizationId: row.organizationId,
		kilometerRate: decimalToNumber(row.kilometerRate),
		reviewerEmail: row.reviewerEmail,
		costUnitInfoUrl: row.costUnitInfoUrl,
		dailyFoodAllowance: decimalToNumber(row.dailyFoodAllowance),
		breakfastDeduction: decimalToNumber(row.breakfastDeduction),
		lunchDeduction: decimalToNumber(row.lunchDeduction),
		dinnerDeduction: decimalToNumber(row.dinnerDeduction),
		datevBeraternummer: row.datevBeraternummer,
		datevMandantennummer: row.datevMandantennummer,
		datevWirtschaftsjahrBeginn: row.datevWirtschaftsjahrBeginn,
		datevSachkontenlaenge: row.datevSachkontenlaenge,
		datevKontenrahmen: toKontenrahmen(row.datevKontenrahmen),
		datevExpenseAccountReceipt: row.datevExpenseAccountReceipt,
		datevExpenseAccountTravel: row.datevExpenseAccountTravel,
		datevExpenseAccountFood: row.datevExpenseAccountFood,
		datevContraAccount: row.datevContraAccount,
		datevFestschreibung: row.datevFestschreibung,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}
