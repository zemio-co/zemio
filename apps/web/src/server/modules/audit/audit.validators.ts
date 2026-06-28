import { ReportStatus } from "@zemio/db";
import { z } from "zod";

const reportCreated = z.object({
	action: z.literal("report.created"),
	entityType: z.literal("report"),
	diff: z.null(),
	payload: z.object({
		title: z.string(),
		costUnitId: z.string(),
		bankingDetailsId: z.string(),
	}),
});

const reportUpdated = z.object({
	action: z.literal("report.updated"),
	entityType: z.literal("report"),
	diff: z.object({
		before: z.record(z.string(), z.string().nullable()),
		after: z.record(z.string(), z.string().nullable()),
	}),
	payload: z.null(),
});

const reportDeleted = z.object({
	action: z.literal("report.deleted"),
	entityType: z.literal("report"),
	diff: z.object({
		before: z.object({
			title: z.string(),
			status: z.nativeEnum(ReportStatus),
		}),
		after: z.null(),
	}),
	payload: z.null(),
});

const reportStatusChanged = z.object({
	action: z.literal("report.status_changed"),
	entityType: z.literal("report"),
	diff: z.object({
		before: z.object({ status: z.nativeEnum(ReportStatus) }),
		after: z.object({ status: z.nativeEnum(ReportStatus) }),
	}),
	payload: z.object({ notify: z.boolean() }).nullable(),
});

const reportCommentAdded = z.object({
	action: z.literal("report.comment_added"),
	entityType: z.literal("report"),
	diff: z.null(),
	payload: z.object({ text: z.string().min(1).max(2000) }),
});

const expenseAdded = z.object({
	action: z.literal("expense.added"),
	entityType: z.literal("expense"),
	diff: z.null(),
	payload: z.object({
		type: z.string(),
		reportId: z.string(),
	}),
});

const expenseUpdated = z.object({
	action: z.literal("expense.updated"),
	entityType: z.literal("expense"),
	diff: z.object({
		before: z.record(z.string(), z.unknown()),
		after: z.record(z.string(), z.unknown()),
	}),
	payload: z.null(),
});

const expenseDeleted = z.object({
	action: z.literal("expense.deleted"),
	entityType: z.literal("expense"),
	diff: z.object({
		before: z.object({
			type: z.string(),
			amount: z.number(),
			description: z.string().nullable(),
		}),
		after: z.null(),
	}),
	payload: z.null(),
});

const attachmentAdded = z.object({
	action: z.literal("attachment.added"),
	entityType: z.literal("attachment"),
	diff: z.null(),
	payload: z.object({
		attachmentId: z.string(),
		fileName: z.string(),
		expenseId: z.string(),
	}),
});

const attachmentDeleted = z.object({
	action: z.literal("attachment.deleted"),
	entityType: z.literal("attachment"),
	diff: z.object({
		before: z.object({
			originalName: z.string(),
			size: z.number(),
		}),
		after: z.null(),
	}),
	payload: z.null(),
});

export const auditActionSchema = z.discriminatedUnion("action", [
	reportCreated,
	reportUpdated,
	reportDeleted,
	reportStatusChanged,
	reportCommentAdded,
	expenseAdded,
	expenseUpdated,
	expenseDeleted,
	attachmentAdded,
	attachmentDeleted,
]);

export type NewAuditAction = z.infer<typeof auditActionSchema>;
