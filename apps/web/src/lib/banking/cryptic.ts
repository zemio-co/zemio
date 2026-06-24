import {
	decrypt as _decrypt,
	decryptBankingDetails as _decryptBankingDetails,
	encrypt as _encrypt,
	encryptBankingDetails as _encryptBankingDetails,
	type BankingDetailsSensitiveData,
	type EncryptedBankingDetails,
} from "@zemio/encryption";
import { env } from "@/env";

function getKey(): Buffer {
	const key = Buffer.from(env.SECRET_ENCRYPTION_KEY, "base64").subarray(0, 32);
	if (key.length < 32) {
		throw new Error(
			"SECRET_ENCRYPTION_KEY must be at least 32 bytes when base64-decoded",
		);
	}
	return key;
}

export type { BankingDetailsSensitiveData, EncryptedBankingDetails };

export function encrypt(plaintext: string): string {
	return _encrypt(plaintext, getKey());
}

export function decrypt(encryptedData: string): string {
	return _decrypt(encryptedData, getKey());
}

export function encryptBankingDetails(
	data: BankingDetailsSensitiveData,
): EncryptedBankingDetails {
	return _encryptBankingDetails(data, getKey());
}

export function decryptBankingDetails(
	data: EncryptedBankingDetails,
): BankingDetailsSensitiveData {
	return _decryptBankingDetails(data, getKey());
}
