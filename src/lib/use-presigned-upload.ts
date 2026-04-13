"use client";

import { useState } from "react";

export type UploadedFile = {
	objectInfo: { key: string };
	name: string;
};

export type UploadResult = {
	files: UploadedFile[];
	failedFiles: File[];
};

type PresignResponse = {
	presignedUrls: { url: string; key: string }[];
};

type UploadState =
	| { status: "idle" }
	| { status: "pending" }
	| { status: "success" }
	| { status: "error"; error: Error };

async function fetchPresignedUrls(
	files: File[],
): Promise<{ url: string; key: string }[]> {
	const response = await fetch("/api/upload/presign", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			files: files.map((f) => ({
				name: f.name,
				contentType: f.type || "application/octet-stream",
				size: f.size,
			})),
		}),
	});

	if (!response.ok) {
		const body: unknown = await response.json();
		const message =
			typeof body === "object" &&
			body !== null &&
			"error" in body &&
			typeof (body as { error: unknown }).error === "string"
				? (body as { error: string }).error
				: "Failed to get upload URLs";
		throw new Error(message);
	}

	const { presignedUrls } = (await response.json()) as PresignResponse;
	return presignedUrls;
}

async function uploadFileToS3(
	file: File,
	entry: { url: string; key: string },
): Promise<string> {
	const response = await fetch(entry.url, {
		method: "PUT",
		headers: { "Content-Type": file.type || "application/octet-stream" },
		body: file,
	});

	if (!response.ok) {
		throw new Error(`Failed to upload file: ${file.name}`);
	}

	return entry.key;
}

export type UploadControl = {
	upload: (
		files: File[],
		options?: { metadata?: Record<string, unknown> },
	) => void;
	isPending: boolean;
};

export function usePresignedUpload() {
	const [state, setState] = useState<UploadState>({ status: "idle" });

	async function upload(
		files: File[],
		_options?: { metadata?: Record<string, unknown> },
	): Promise<UploadResult> {
		setState({ status: "pending" });

		try {
			const presignedUrls = await fetchPresignedUrls(files);

			const results = await Promise.allSettled(
				files.map((file, index) => {
					const entry = presignedUrls[index];
					if (!entry) return Promise.reject(new Error("Missing presigned URL"));
					return uploadFileToS3(file, entry);
				}),
			);

			const uploadedFiles: UploadedFile[] = [];
			const failedFiles: File[] = [];

			for (let i = 0; i < results.length; i++) {
				const result = results[i];
				const file = files[i];
				if (!result || !file) continue;

				if (result.status === "fulfilled") {
					uploadedFiles.push({ objectInfo: { key: result.value }, name: file.name });
				} else {
					failedFiles.push(file);
				}
			}

			setState(
				failedFiles.length > 0
					? { status: "error", error: new Error("Some files failed to upload") }
					: { status: "success" },
			);

			return { files: uploadedFiles, failedFiles };
		} catch (error) {
			const err = error instanceof Error ? error : new Error("Upload failed");
			setState({ status: "error", error: err });
			return { files: [], failedFiles: files };
		}
	}

	const control: UploadControl = {
		upload,
		isPending: state.status === "pending",
	};

	return {
		upload,
		control,
		isPending: state.status === "pending",
		isError: state.status === "error",
		error: state.status === "error" ? state.error : null,
	};
}
