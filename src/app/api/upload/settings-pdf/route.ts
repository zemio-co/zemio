import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import { isOrganizationAdminRole } from "@/lib/organization";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";

export async function POST(request: NextRequest) {
	try {
		const session = await auth.api.getSession({
			headers: request.headers,
		});

		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const organizationId = session.session.activeOrganizationId;
		if (!organizationId) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const member = await db.member.findFirst({
			where: {
				userId: session.user.id,
				organizationId,
			},
			select: {
				role: true,
			},
		});

		if (!member || !isOrganizationAdminRole(member.role)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const formData = await request.formData();
		const file = formData.get("file") as File;

		if (!file) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 });
		}

		if (file.type !== "application/pdf") {
			return NextResponse.json(
				{ error: "Invalid file type. Only PDFs are allowed." },
				{ status: 400 },
			);
		}

		const maxSize = 10 * 1024 * 1024;
		if (file.size > maxSize) {
			return NextResponse.json(
				{ error: "File too large. Maximum size is 10MB." },
				{ status: 400 },
			);
		}

		const uploadsDir = join(process.cwd(), "public", "uploads", "settings");
		if (!existsSync(uploadsDir)) {
			await mkdir(uploadsDir, { recursive: true });
		}

		const timestamp = Date.now();
		const randomString = Math.random().toString(36).substring(2, 15);
		const filename = `${timestamp}-${randomString}.pdf`;
		const filepath = join(uploadsDir, filename);

		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);
		await writeFile(filepath, buffer);

		const publicUrl = `/uploads/settings/${filename}`;

		return NextResponse.json({ url: publicUrl, filename });
	} catch (_error) {
		return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
	}
}
