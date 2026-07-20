import { BIC_DATASETS_BY_COUNTRY } from "./datasets";
import { normalizeIban } from "./validate-iban";

/**
 * Looks up the BIC for an IBAN's issuing bank from a per-country dataset.
 * The bank code is read from the BBAN (right after the 2-letter country
 * code + 2-digit check digits), using that country's own bank-code length.
 * Returns `undefined` if the country has no dataset registered yet, or the
 * bank code isn't in it — callers decide whether that's an error or just
 * "unknown".
 */
export function getBicForIban(rawIban: string): string | undefined {
	const iban = normalizeIban(rawIban);
	const countryCode = iban.slice(0, 2);
	const dataset = BIC_DATASETS_BY_COUNTRY[countryCode];
	if (!dataset) {
		return undefined;
	}

	const bankCode = iban.slice(4, 4 + dataset.bankCodeLength);
	return dataset.codes[bankCode];
}
