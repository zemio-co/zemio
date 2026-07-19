import QRCode from "qrcode";

import z from "zod";

async function generateEPCCode(config: {
	iban: string;
	name: string;
	amount: number;
	tag: string;
}): Promise<string> {
	const { iban, name, amount, tag } = config;

	const cleanIBAN = sanitizeIBAN(iban);

	const validationResult = await validateIBAN(cleanIBAN);

	if (!validationResult.valid) {
		throw new Error("Unable to verify the provided IBAN");
	}

	const { bic } = validationResult;

	const payload = [
		"BCD",
		"002",
		"1",
		"SCT",
		bic ?? "",
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

function sanitizeIBAN(iban: string) {
	return iban.replaceAll(" ", "");
}

const validationResultSchema = z.object({
	valid: z.boolean(),
	messages: z.array(z.string()),
	iban: z.string(),
	bankData: z.object({
		bankCode: z.string().optional(),
		name: z.string().optional(),
		zip: z.string().optional(),
		city: z.string().optional(),
		bic: z.string().optional(),
	}),
});

type ValidateIBANResult = {
	valid: boolean;
	bic: string | undefined;
	iban: string;
};

async function validateIBAN(iban: string): Promise<ValidateIBANResult> {
	const BASE_URL = "https://openiban.com";

	const url = new URL(`/validate/${iban}`, BASE_URL);
	url.searchParams.set("getBIC", "true");
	url.searchParams.set("validateBankCode", "true");

	const res = await fetch(url, {
		method: "GET",
	});

	if (!res.ok) {
		throw new Error("Unable to validate IBAN", {
			cause: `The request to the validation service returned a response of status ${res.status}`,
		});
	}

	const responseValidation = validationResultSchema.safeParse(await res.json());

	if (responseValidation.error) {
		throw new Error(responseValidation.error.message, {
			cause: responseValidation.error.message,
		});
	}

	const data = responseValidation.data;

	if (!data.valid) {
		throw new Error(
			`IBAN Validation failed: ${data.messages[0] ?? "An unexpected error ocurred"}`,
			{
				cause: data.messages[0] ?? "An unexpected error ocurred",
			},
		);
	}

	return {
		valid: true,
		bic: data.bankData.bic,
		iban: data.iban,
	};
}

export { generateEPCCode };
