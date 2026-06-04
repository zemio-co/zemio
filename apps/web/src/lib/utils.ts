import { type ClassValue, clsx } from "clsx";
import {
	differenceInDays,
	differenceInHours,
	differenceInMinutes,
	format,
} from "date-fns";
import { twMerge } from "tailwind-merge";
import type { ExpenseType, ReportStatus } from "@/generated/prisma/enums";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function translateReportStatus(status: ReportStatus) {
	switch (status) {
		case "DRAFT":
			return "Entwurf";
		case "PENDING_APPROVAL":
			return "In Bearbeitung";
		case "NEEDS_REVISION":
			return "Benötigt Überarbeitung";
		case "ACCEPTED":
			return "Akzeptiert";
		case "REJECTED":
			return "Abgelehnt";
	}
}

export function formatBytes(bytes: number, decimals = 2): string {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const dm = decimals < 0 ? 0 : decimals;
	return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Generates a unique hash from file name, report ID, and timestamp
 */
async function generateUniqueHash(
	fileName: string,
	reportId: string,
	timestamp: number,
): Promise<string> {
	const data = `${fileName}-${reportId}-${timestamp}`;
	const encoder = new TextEncoder();
	const dataBuffer = encoder.encode(data);
	const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Renames a file with a unique hash while preserving the original extension
 */
export async function renameFileWithHash(
	file: File,
	reportId: string,
	timestamp: number = Date.now(),
): Promise<File> {
	const lastDotIndex = file.name.lastIndexOf(".");
	const hasExtension = lastDotIndex > 0 && lastDotIndex < file.name.length - 1;

	const extension = hasExtension ? file.name.substring(lastDotIndex + 1) : "";
	const nameWithoutExtension = hasExtension
		? file.name.substring(0, lastDotIndex)
		: file.name;

	const hash = await generateUniqueHash(
		nameWithoutExtension,
		reportId,
		timestamp,
	);
	const newFileName = extension ? `${hash}.${extension}` : hash;
	return new File([file], newFileName, { type: file.type });
}

export function translateExpenseType(type: ExpenseType) {
	switch (type) {
		case "RECEIPT":
			return "Beleg";
		case "TRAVEL":
			return "Reise";
		case "FOOD":
			return "Verpflegung";
	}
}

/**
 * Formats an IBAN string by removing non-alphanumeric characters,
 * converting to uppercase, and adding spaces every 4 characters.
 * Maximum length is 34 characters (standard IBAN length).
 */
export function formatIban(value: string): string {
	// Remove all non-alphanumeric characters and convert to uppercase
	const cleaned = value.replace(/[^A-Z0-9]/gi, "").toUpperCase();

	// Limit to 34 characters (max IBAN length)
	const limited = cleaned.slice(0, 34);

	// Add spaces every 4 characters
	return limited.replace(/(.{4})/g, "$1 ").trim();
}

/**
 * Removes formatting from an IBAN string (removes spaces and converts to uppercase).
 * This is useful when storing the IBAN in the database.
 */
export function unformatIban(value: string): string {
	return value.replace(/\s/g, "").toUpperCase();
}

export function formatTimeElapsed(date: Date): string {
	const now = new Date();

	if (differenceInMinutes(now, date) < 60) {
		return `vor ${differenceInMinutes(now, date)} Minuten`;
	}

	if (differenceInHours(now, date) < 24) {
		return `vor ${differenceInHours(now, date)} Stunden`;
	}

	if (differenceInDays(now, date) < 7) {
		return `vor ${differenceInDays(now, date)} Tagen`;
	}

	return `am ${format(date, "dd.MM.yyyy")}`;
}
