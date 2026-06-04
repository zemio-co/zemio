import {
	DeleteObjectsCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";
import { logger } from "@/lib/logger";

/**
 * S3 client for fetching files from storage
 */
function createS3Client(): S3Client {
	const host = env.STORAGE_HOST;
	const region = env.STORAGE_REGION;
	const secure = env.STORAGE_SECURE;
	const forcePathStyle = env.STORAGE_FORCE_PATH_STYLE;

	const protocol = secure ? "https" : "http";
	const endpoint = `${protocol}://${host}`;

	return new S3Client({
		region,
		endpoint,
		forcePathStyle,
		credentials: {
			accessKeyId: env.STORAGE_ACCESS_KEY_ID,
			secretAccessKey: env.STORAGE_ACCESS_KEY,
		},
	});
}

// Lazy-initialized S3 client
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
	if (!s3Client) {
		s3Client = createS3Client();
	}
	return s3Client;
}

/**
 * Fetch a file from S3 storage by its key
 * @param key - The object key (e.g., "attachment/filename.pdf")
 * @returns The file contents as a Buffer, or null if fetch fails
 */
export async function getFileFromStorage(key: string): Promise<Buffer | null> {
	const client = getS3Client();
	const bucket = env.STORAGE_BUCKET;

	try {
		const command = new GetObjectCommand({
			Bucket: bucket,
			Key: key,
		});

		const response = await client.send(command);

		if (!response.Body) {
			logger.error("S3 response missing body", { key });
			void logger.flush();
			return null;
		}

		// Convert the readable stream to a buffer
		const chunks: Uint8Array[] = [];
		for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
			chunks.push(chunk);
		}

		return Buffer.concat(chunks);
	} catch (error) {
		logger.error("S3 file fetch failed", { key, error });
		void logger.flush();
		return null;
	}
}

/**
 * Delete objects from S3 storage by key.
 * @param keys - The object keys to delete
 */
export async function deleteFilesFromStorage(keys: string[]): Promise<void> {
	if (keys.length === 0) {
		return;
	}

	const client = getS3Client();
	const bucket = env.STORAGE_BUCKET;

	try {
		const command = new DeleteObjectsCommand({
			Bucket: bucket,
			Delete: {
				Objects: keys.map((key) => ({ Key: key })),
				Quiet: false,
			},
		});

		const response = await client.send(command);
		if ((response.Errors?.length ?? 0) > 0) {
			const failedKeys = (response.Errors ?? [])
				.map((error) => error.Key)
				.filter((key): key is string => typeof key === "string");

			throw new Error(
				`Failed to delete storage objects: ${failedKeys.join(", ")}`,
			);
		}
	} catch (error) {
		logger.error("S3 file deletion failed", { keys, error });
		await logger.flush();
		throw error;
	}
}

/**
 * Generate a presigned download URL for a stored object.
 * The URL carries a Content-Disposition: attachment header so the browser
 * downloads the file directly instead of opening it inline.
 * @param key - The object key (e.g., "attachment/filename.pdf")
 * @param expiresInSeconds - URL validity duration in seconds (default: 300)
 * @returns A presigned URL string
 */
export async function getPresignedDownloadUrl(
	key: string,
	downloadFilename?: string,
	expiresInSeconds = 300,
): Promise<string> {
	const client = getS3Client();
	const filename = downloadFilename ?? key.split("/").at(-1) ?? "attachment";
	const command = new GetObjectCommand({
		Bucket: env.STORAGE_BUCKET,
		Key: key,
		ResponseContentDisposition: `attachment; filename="${filename}"`,
	});

	return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Generate a presigned upload URL for a stored object.
 * The caller uploads the file directly to S3 via HTTP PUT using this URL.
 *
 * Content-Length is included in the signed headers so S3 enforces the exact
 * byte count server-side. Any PUT whose Content-Length does not match the
 * signed value will be rejected with 403.
 *
 * @param key - The object key (e.g., "attachment/orgId/filename.pdf")
 * @param contentType - The MIME type of the file being uploaded
 * @param size - The exact byte size of the file; baked into the URL signature
 * @param expiresInSeconds - URL validity duration in seconds (default: 300)
 * @returns A presigned URL string
 */
export async function getPresignedUploadUrl(
	key: string,
	contentType: string,
	size: number,
	expiresInSeconds = 300,
): Promise<string> {
	const client = getS3Client();
	const command = new PutObjectCommand({
		Bucket: env.STORAGE_BUCKET,
		Key: key,
		ContentType: contentType,
		ContentLength: size,
	});

	return getSignedUrl(client, command, {
		expiresIn: expiresInSeconds,
		signableHeaders: new Set(["content-length"]),
	});
}

/**
 * Get the file extension from a storage key
 * @param key - The object key (e.g., "attachment/filename.pdf")
 * @returns The file extension in lowercase (e.g., "pdf")
 */
export function getFileExtension(key: string): string {
	// Extract the filename from the path first
	const filename = key.split("/").at(-1) ?? "";
	// Then get the extension from the filename
	const parts = filename.split(".");
	if (parts.length <= 1) return "";
	const ext = parts.at(-1);
	return ext ? ext.toLowerCase() : "";
}

/**
 * Check if a file is an image based on its extension
 */
export function isImageFile(key: string): boolean {
	const ext = getFileExtension(key);
	return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
}

/**
 * Check if a file is a PDF based on its extension
 */
export function isPdfFile(key: string): boolean {
	return getFileExtension(key) === "pdf";
}
