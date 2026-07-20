import de from "./de.json";

export type CountryBicDataset = {
	/** Length of the bank code prefix within the BBAN — varies by country. */
	bankCodeLength: number;
	codes: Readonly<Record<string, string>>;
};

/**
 * One dataset per country, keyed by ISO 3166-1 alpha-2 country code. Each
 * dataset maps its national bank-code prefix (taken right after the 2-letter
 * country code + 2-digit IBAN check digits) to that bank's BIC. Bank-code
 * length is not uniform across countries (e.g. Germany's BLZ is 8 digits),
 * so it's declared per dataset rather than assumed globally. Adding a
 * country is just adding another JSON file here and registering it below —
 * no changes needed in the lookup logic.
 */
export const BIC_DATASETS_BY_COUNTRY: Readonly<
	Record<string, CountryBicDataset>
> = {
	DE: { bankCodeLength: 8, codes: de },
};
