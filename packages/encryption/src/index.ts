import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export function encrypt(plaintext: string, key: Buffer): string {
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv);
	const encrypted = Buffer.concat([
		cipher.update(plaintext, "utf8"),
		cipher.final(),
	]);
	const authTag = cipher.getAuthTag();
	return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decrypt(encryptedData: string, key: Buffer): string {
	const combined = Buffer.from(encryptedData, "base64");
	if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
		throw new Error("Invalid encrypted data: too short");
	}
	const iv = combined.subarray(0, IV_LENGTH);
	const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
	const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
	const decipher = createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);
	return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
		"utf8",
	);
}

export interface BankingDetailsSensitiveData {
	iban: string;
	fullName: string;
}

export interface EncryptedBankingDetails {
	iban: string;
	fullName: string;
}

export function encryptBankingDetails(
	data: BankingDetailsSensitiveData,
	key: Buffer,
): EncryptedBankingDetails {
	return {
		iban: encrypt(data.iban, key),
		fullName: encrypt(data.fullName, key),
	};
}

export function decryptBankingDetails(
	data: EncryptedBankingDetails,
	key: Buffer,
): BankingDetailsSensitiveData {
	return {
		iban: decrypt(data.iban, key),
		fullName: decrypt(data.fullName, key),
	};
}
