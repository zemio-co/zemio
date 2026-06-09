import {
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env";

function createS3Client(): S3Client {
	const protocol = env.STORAGE_SECURE ? "https" : "http";
	const hostname = env.STORAGE_HOST.replace(/^https?:\/\//, "");
	return new S3Client({
		region: env.STORAGE_REGION,
		endpoint: `${protocol}://${hostname}`,
		forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
		credentials: {
			accessKeyId: env.STORAGE_ACCESS_KEY_ID,
			secretAccessKey: env.STORAGE_ACCESS_KEY,
		},
	});
}

let s3: S3Client | null = null;

function getS3(): S3Client {
	if (!s3) s3 = createS3Client();
	return s3;
}

export async function getFileFromStorage(key: string): Promise<Buffer | null> {
	try {
		const response = await getS3().send(
			new GetObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }),
		);
		if (!response.Body) return null;
		const chunks: Uint8Array[] = [];
		for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
			chunks.push(chunk);
		}
		return Buffer.concat(chunks);
	} catch {
		return null;
	}
}

export async function uploadToStorage(
	key: string,
	body: Buffer,
	contentType: string,
): Promise<void> {
	await getS3().send(
		new PutObjectCommand({
			Bucket: env.STORAGE_BUCKET,
			Key: key,
			Body: body,
			ContentType: contentType,
		}),
	);
}

export async function getPresignedDownloadUrl(
	key: string,
	downloadFilename: string,
	expiresInSeconds = 300,
): Promise<string> {
	const command = new GetObjectCommand({
		Bucket: env.STORAGE_BUCKET,
		Key: key,
		ResponseContentDisposition: `attachment; filename="${downloadFilename}"`,
	});
	return getSignedUrl(getS3(), command, { expiresIn: expiresInSeconds });
}

export function isPdfFile(key: string): boolean {
	return key.split(".").at(-1)?.toLowerCase() === "pdf";
}
