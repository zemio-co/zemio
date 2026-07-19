import QRCode from "qrcode";
import { normalizeIban } from "@/lib/banking/iban";

type ValidateIban = (
	iban: string,
) => Promise<{ valid: boolean; bic: string | null }>;

/**
 * `validateIban` is injected rather than imported directly because it must
 * run through the tRPC proxy (`bankingDetails.validateIban`) to reach the
 * internal banking API without exposing the service key to the client.
 */
async function generateEPCCode(config: {
	iban: string;
	name: string;
	amount: number;
	tag: string;
	validateIban: ValidateIban;
}): Promise<string> {
	const { iban, name, amount, tag, validateIban } = config;

	const cleanIBAN = normalizeIban(iban);

	const validationResult = await validateIban(cleanIBAN);

	if (!validationResult.valid) {
		throw new Error("Unable to verify the provided IBAN");
	}

	const payload = [
		"BCD",
		"002",
		"1",
		"SCT",
		validationResult.bic ?? "",
		name,
		cleanIBAN,
		`EUR${amount.toFixed(2)}`,
		"",
		"",
		`Augleich Spesenantrag #${tag}`,
		"",
	].join("\n");

	const uri = await QRCode.toDataURL(payload, {
		type: "image/png",
		margin: 0,
		width: 1024,
		errorCorrectionLevel: "medium",
	});

	return uri;
}

export { generateEPCCode };
