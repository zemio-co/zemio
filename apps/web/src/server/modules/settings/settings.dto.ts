import { type Kontenrahmen, toKontenrahmen } from "@zemio/datev";
import { decimalToNumber } from "@/server/shared/money";
import type { SettingsRow } from "./settings.repository";

/**
 * Org settings with every monetary column converted once, here. Routers and
 * components never see a Decimal, so `Number(...)` cannot reappear at a call
 * site (docs/trpc-architecture.md, "DTOs + Decimal once").
 *
 * Deliberately without the DATEV configuration. `settings.get` is an
 * `orgProcedure`, and the expense forms every member fills in call it — so
 * anything in this shape is readable by the whole organization. The Kanzlei's
 * Berater- and Mandantennummer and its ledger accounts are the organization's
 * accounting setup and have no business on a submitter's expense form; they live
 * in {@link DatevSettingsDTO}, behind an admin-only procedure.
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
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

/**
 * The DATEV export configuration, read and written by administrators only.
 *
 * No Decimals among them, so they pass straight through — the account numbers
 * are strings because a ledger account is an identifier, not a quantity.
 */
export type DatevSettingsDTO = {
	datevBeraternummer: number | null;
	datevMandantennummer: number | null;
	datevWirtschaftsjahrBeginn: Date | null;
	datevSachkontenlaenge: number | null;
	datevKontenrahmen: Kontenrahmen | null;
	datevExpenseAccountReceipt: string | null;
	datevExpenseAccountTravel: string | null;
	datevExpenseAccountFood: string | null;
	datevContraAccount: string | null;
	datevFestschreibung: boolean;
};

export function toDatevSettingsDTO(row: SettingsRow): DatevSettingsDTO {
	return {
		datevBeraternummer: row.datevBeraternummer,
		datevMandantennummer: row.datevMandantennummer,
		datevWirtschaftsjahrBeginn: row.datevWirtschaftsjahrBeginn,
		datevSachkontenlaenge: row.datevSachkontenlaenge,
		// The column is a plain string; anything but the two reads as
		// unconfigured, so the preflight names the field instead of the header
		// carrying a value DATEV refuses the file over.
		datevKontenrahmen: toKontenrahmen(row.datevKontenrahmen),
		datevExpenseAccountReceipt: row.datevExpenseAccountReceipt,
		datevExpenseAccountTravel: row.datevExpenseAccountTravel,
		datevExpenseAccountFood: row.datevExpenseAccountFood,
		datevContraAccount: row.datevContraAccount,
		datevFestschreibung: row.datevFestschreibung,
	};
}
