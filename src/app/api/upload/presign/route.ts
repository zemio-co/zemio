import { type NextRequest, NextResponse } from "next/server";
import z from "zod";
import { auth } from "@/server/better-auth";
import {
	getFileExtension,
	getPresignedUploadUrl,
} from "@/server/storage/s3-client";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const requestSchema = z.object({
	files: z
		.array(
			z.object({
				name: z.string().min(1),
				contentType: z.string().min(1),
				size: z.number().int().nonnegative(),
			}),
		)
		.min(1)
		.max(MAX_FILES),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
	const session = await auth.api.getSession({ headers: req.headers });

	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const orgId = session.session.activeOrganizationId;
	if (!orgId) {
		return NextResponse.json(
			{ error: "No active organization" },
			{ status: 403 },
		);
	}

	const body: unknown = await req.json();
	const parsed = requestSchema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid request" }, { status: 400 });
	}

	for (const file of parsed.data.files) {
		if (file.size > MAX_FILE_SIZE) {
			return NextResponse.json(
				{ error: `File "${file.name}" exceeds the 5 MB size limit` },
				{ status: 400 },
			);
		}
	}

	const presignedUrls = await Promise.all(
		parsed.data.files.map(async (file) => {
			const extension = getFileExtension(file.name);
			const uniqueFilename = extension
				? `${crypto.randomUUID()}.${extension}`
				: crypto.randomUUID();
			const key = `attachment/${orgId}/${uniqueFilename}`;
			const url = await getPresignedUploadUrl(key, file.contentType);
			return { url, key };
		}),
	);

	return NextResponse.json({ presignedUrls });
}
