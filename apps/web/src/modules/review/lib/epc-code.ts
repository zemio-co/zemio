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
const MAX_NAME_LENGTH = 70;
const MAX_REMITTANCE_INFO_LENGTH = 140;
const MAX_PAYLOAD_BYTES = 331;

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

	if (name.length > MAX_NAME_LENGTH) {
		throw new Error(
			`Beneficiary name exceeds the EPC limit of ${MAX_NAME_LENGTH} characters`,
		);
	}

	const remittanceInfo = `Ausgleich Spesenantrag #${tag}`;
	if (remittanceInfo.length > MAX_REMITTANCE_INFO_LENGTH) {
		throw new Error(
			`Remittance information exceeds the EPC limit of ${MAX_REMITTANCE_INFO_LENGTH} characters`,
		);
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
		remittanceInfo,
	].join("\n");

	if (new TextEncoder().encode(payload).length > MAX_PAYLOAD_BYTES) {
		throw new Error(
			`EPC payload exceeds the maximum size of ${MAX_PAYLOAD_BYTES} bytes`,
		);
	}

	const uri = await QRCode.toDataURL(payload, {
		type: "image/png",
		margin: 0,
		width: 1024,
		errorCorrectionLevel: "medium",
	});

	return uri;
}

export { generateEPCCode };
