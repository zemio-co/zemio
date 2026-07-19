/**
 * Expected IBAN length per ISO 3166-1 alpha-2 country code, per the IBAN
 * registry (ISO 13616). Used to reject malformed IBANs before running the
 * mod-97 check.
 */
const IBAN_LENGTH_BY_COUNTRY: Readonly<Record<string, number>> = {
	AD: 24,
	AE: 23,
	AL: 28,
	AT: 20,
	AZ: 28,
	BA: 20,
	BE: 16,
	BG: 22,
	BH: 22,
	BR: 29,
	BY: 28,
	CH: 21,
	CR: 22,
	CY: 28,
	CZ: 24,
	DE: 22,
	DK: 18,
	DO: 28,
	EE: 20,
	EG: 29,
	ES: 24,
	FI: 18,
	FO: 18,
	FR: 27,
	GB: 22,
	GE: 22,
	GI: 23,
	GL: 18,
	GR: 27,
	GT: 28,
	HR: 21,
	HU: 28,
	IE: 22,
	IL: 23,
	IQ: 23,
	IS: 26,
	IT: 27,
	JO: 30,
	KW: 30,
	KZ: 20,
	LB: 28,
	LC: 32,
	LI: 21,
	LT: 20,
	LU: 20,
	LV: 21,
	LY: 25,
	MC: 27,
	MD: 24,
	ME: 22,
	MK: 19,
	MR: 27,
	MT: 31,
	MU: 30,
	NL: 18,
	NO: 15,
	OM: 23,
	PK: 24,
	PL: 28,
	PS: 29,
	PT: 25,
	QA: 29,
	RO: 24,
	RS: 22,
	SA: 24,
	SC: 31,
	SD: 18,
	SE: 24,
	SI: 19,
	SK: 24,
	SM: 27,
	ST: 25,
	SV: 28,
	TL: 23,
	TN: 24,
	TR: 26,
	UA: 29,
	VA: 22,
	VG: 24,
	XK: 20,
};

const IBAN_FORMAT = /^[A-Z]{2}\d{2}[A-Z0-9]+$/;

/** Strips formatting whitespace and normalizes case, shared by every IBAN consumer. */
export function normalizeIban(rawIban: string): string {
	return rawIban.replace(/\s+/g, "").toUpperCase();
}

/**
 * Validates an IBAN via the ISO 7064 mod-97 check digit algorithm.
 *
 * Rather than rearranging the IBAN, expanding letters into two-digit values,
 * and parsing the resulting up-to-68-digit string as a single integer (which
 * would require arbitrary-precision arithmetic), the remainder is computed
 * digit-by-digit: `remainder = (remainder * base + value) % 97`, where `base`
 * is 10 for a digit and 100 for a letter's two-digit expansion. This is
 * mathematically equivalent but only ever operates on small integers.
 */
export function isValidIban(rawIban: string): boolean {
	const iban = normalizeIban(rawIban);

	if (!IBAN_FORMAT.test(iban)) {
		return false;
	}

	const countryCode = iban.slice(0, 2);
	const expectedLength = IBAN_LENGTH_BY_COUNTRY[countryCode];
	if (expectedLength === undefined || iban.length !== expectedLength) {
		return false;
	}

	return mod97(iban) === 1;
}

function mod97(iban: string): number {
	const rearranged = iban.slice(4) + iban.slice(0, 4);

	let remainder = 0;
	for (let i = 0; i < rearranged.length; i++) {
		const code = rearranged.charCodeAt(i);
		if (code >= 48 && code <= 57) {
			// '0'-'9'
			remainder = (remainder * 10 + (code - 48)) % 97;
		} else {
			// 'A'-'Z' => 10-35
			remainder = (remainder * 100 + (code - 55)) % 97;
		}
	}

	return remainder;
}
