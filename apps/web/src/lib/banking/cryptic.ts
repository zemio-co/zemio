import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/env";

/**
 * Encryption module for sensitive banking details using AES-256-GCM
 *
 * AES-256-GCM provides:
 * - Confidentiality: Data is encrypted and unreadable without the key
 * - Integrity: Any tampering with the ciphertext is detected
 * - Authentication: The auth tag verifies the data hasn't been modified
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits - recommended by NIST SP 800-38D for GCM mode
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a 32-byte key from the environment secret
 * AES-256 requires exactly 32 bytes (256 bits)
 */
function getEncryptionKey(): Buffer {
	const secret = env.SECRET_ENCRYPTION_KEY;

	// If the key is base64 encoded (recommended), decode it
	const keyBuffer = Buffer.from(secret, "base64");

	if (keyBuffer.length >= 32) {
		return keyBuffer.subarray(0, 32);
	}

	throw new Error(
		"SECRET_ENCRYPTION_KEY is too short. It must be a base64 string representing at least 32 bytes (256 bits) for AES-256 encryption.",
	);
}

/**
 * Encrypts a plaintext string using AES-256-GCM
 *
 * @param plaintext - The string to encrypt
 * @returns Base64 encoded string containing: IV + AuthTag + Ciphertext
 *
 * @example
 * const encrypted = encrypt("DE89370400440532013000");
 * // Returns something like: "YWJjZGVmZ2hpamts..."
 */
export function encrypt(plaintext: string): string {
	const key = getEncryptionKey();
	const iv = randomBytes(IV_LENGTH);

	const cipher = createCipheriv(ALGORITHM, key, iv);
	const encrypted = Buffer.concat([
		cipher.update(plaintext, "utf8"),
		cipher.final(),
	]);
	const authTag = cipher.getAuthTag();

	// Combine IV + AuthTag + Ciphertext into a single buffer
	// Format: [12 bytes IV][16 bytes AuthTag][N bytes Ciphertext]
	const combined = Buffer.concat([iv, authTag, encrypted]);

	return combined.toString("base64");
}

/**
 * Decrypts an encrypted string using AES-256-GCM
 *
 * @param encryptedData - Base64 encoded string containing: IV + AuthTag + Ciphertext
 * @returns The original plaintext string
 * @throws Error if decryption fails (wrong key, tampered data, or invalid format)
 *
 * @example
 * const decrypted = decrypt("YWJjZGVmZ2hpamts...");
 * // Returns: "DE89370400440532013000"
 */
export function decrypt(encryptedData: string): string {
	const key = getEncryptionKey();
	const combined = Buffer.from(encryptedData, "base64");

	// Validate minimum length: IV (12) + AuthTag (16) + at least 1 byte ciphertext
	if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
		throw new Error("Invalid encrypted data: too short");
	}

	// Extract components
	const iv = combined.subarray(0, IV_LENGTH);
	const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
	const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

	const decipher = createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);

	const decrypted = Buffer.concat([
		decipher.update(ciphertext),
		decipher.final(),
	]);

	return decrypted.toString("utf8");
}

export interface BankingDetailsSensitiveData {
	iban: string;
	fullName: string;
}

export interface EncryptedBankingDetails {
	iban: string;
	fullName: string;
}

/**
 * Encrypts sensitive banking details for storage
 *
 * @param data - Object containing plaintext iban and fullName
 * @returns Object with encrypted iban and fullName
 *
 * @example
 * const encrypted = encryptBankingDetails({
 *   iban: "DE89370400440532013000",
 *   fullName: "John Doe"
 * });
 */
export function encryptBankingDetails(
	data: BankingDetailsSensitiveData,
): EncryptedBankingDetails {
	return {
		iban: encrypt(data.iban),
		fullName: encrypt(data.fullName),
	};
}

/**
 * Decrypts banking details retrieved from storage
 *
 * @param data - Object containing encrypted iban and fullName
 * @returns Object with decrypted iban and fullName
 * @throws Error if decryption fails
 *
 * @example
 * const decrypted = decryptBankingDetails(encryptedData);
 * // Returns: { iban: "DE89370400440532013000", fullName: "John Doe" }
 */
export function decryptBankingDetails(
	data: EncryptedBankingDetails,
): BankingDetailsSensitiveData {
	return {
		iban: decrypt(data.iban),
		fullName: decrypt(data.fullName),
	};
}
