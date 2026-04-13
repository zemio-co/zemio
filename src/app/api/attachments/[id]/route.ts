import { type NextRequest, NextResponse } from "next/server";
import { isOrganizationAdminRole } from "@/lib/organization";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { getFileExtension, getFileFromStorage } from "@/server/storage";

const MIME_TYPES: Record<string, string> = {
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	png: "image/png",
	gif: "image/gif",
	webp: "image/webp",
	pdf: "application/pdf",
};

function getFilenameFromKey(key: string): string {
	return key.split("/").at(-1) ?? "attachment";
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
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

	if (!member) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const { id } = await params;
	const attachment = await db.attachment.findUnique({
		where: { id },
		select: {
			key: true,
			expense: {
				select: {
					report: {
						select: {
							ownerId: true,
							organizationId: true,
						},
					},
				},
			},
		},
	});

	if (!attachment) {
		return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
	}

	if (attachment.expense.report.organizationId !== organizationId) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const isAdmin = isOrganizationAdminRole(member.role);
	const isOwner = attachment.expense.report.ownerId === session.user.id;

	if (!isAdmin && !isOwner) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const file = await getFileFromStorage(attachment.key);

	if (!file) {
		return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
	}

	const extension = getFileExtension(attachment.key);
	const filename = getFilenameFromKey(attachment.key);
	const contentType = MIME_TYPES[extension] ?? "application/octet-stream";

	return new NextResponse(new Uint8Array(file), {
		headers: {
			"Content-Type": contentType,
			"Content-Disposition": `inline; filename="${filename}"`,
			"Cache-Control": "private, max-age=300",
		},
	});
}
