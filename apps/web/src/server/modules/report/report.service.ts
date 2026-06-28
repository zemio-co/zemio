import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@zemio/db";
import { ReportStatus } from "@zemio/db";
import type { z } from "zod";
import { env } from "@/env";
import { isOrganizationAdminRole } from "@/lib/organization";
import type { createReportSchema } from "@/lib/validators";
import { type AuditRepository, auditRepository } from "@/server/modules/audit";
import { mapPrismaError } from "@/server/shared/errors";
import { nullableDecimalToNumber } from "@/server/shared/money";
import { offsetPageArgs, pageCount } from "@/server/shared/pagination";
import {
	type FinancialSummaryDTO,
	type ReportListItemDTO,
	type ReviewDTO,
	toFinancialSummaryDTO,
	toReportListItemDTO,
	toReviewDTO,
} from "./report.dto";
import { type ReportEventEmitter, reportEventBus } from "./report.events";
import { authorizeReport } from "./report.policy";
import {
	buildReportListOrderBy,
	buildReportListWhere,
	type ReportListInput,
} from "./report.query";
import {
	type ReportDetail,
	type ReportRepository,
	reportRepository,
} from "./report.repository";
import { assertAdminTransition, assertSubmittable } from "./report.state";

/** Runs a repository write, mapping Prisma errors (P2002/P2025/…) to typed TRPCErrors. */
async function runWrite<T>(operation: () => Promise<T>): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		throw mapPrismaError(error);
	}
}

/**
 * Runs an interactive transaction, passing a typed DB client to the callback.
 * Maps Prisma errors to typed TRPCErrors on failure.
 * The `tx as unknown as PrismaClient` cast is justified: Prisma's transaction
 * client exposes the same model operations as PrismaClient — only lifecycle
 * methods ($connect, $transaction, etc.) are omitted, none of which are used
 * inside repository methods.
 */
async function transact<T>(
	db: PrismaClient,
	fn: (db: PrismaClient) => Promise<T>,
): Promise<T> {
	try {
		return await db.$transaction((tx) => fn(tx as unknown as PrismaClient));
	} catch (error) {
		throw mapPrismaError(error);
	}
}

/** Request-scoped facts the service needs. Authorization is enforced upstream. */
export type ReportServiceContext = {
	db: PrismaClient;
	organizationId: string;
	userId: string;
	orgRole: string;
};

type CreateReportInput = z.infer<typeof createReportSchema>;
type UpdateReportInput = { title?: string; description?: string };
type TransitionInput = { status: ReportStatus; notify?: boolean };

type PdfExportResult = { url: string; filename: string };

export function createReportService(deps: {
	repo: ReportRepository;
	events: ReportEventEmitter;
	audit: AuditRepository;
}) {
	const { repo, events, audit } = deps;

	return {
		async list(
			ctx: ReportServiceContext,
			input: ReportListInput,
		): Promise<{
			reports: ReportListItemDTO[];
			pagination: { page: number; pageSize: number; pageCount: number };
		}> {
			if (input.scope === "all" && !isOrganizationAdminRole(ctx.orgRole)) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only organization admins may list all reports.",
				});
			}

			const where = buildReportListWhere({
				scope: input.scope,
				filters: input.filters,
				organizationId: ctx.organizationId,
				userId: ctx.userId,
			});
			const orderBy = buildReportListOrderBy(input.sorting);
			const { skip, take } = offsetPageArgs(input);

			const [rows, count] = await Promise.all([
				repo.listPage(ctx.db, { where, orderBy, take, skip }),
				repo.count(ctx.db, where),
			]);

			const sums = await repo.sumByReportIds(
				ctx.db,
				rows.map((row) => row.id),
			);
			const sumByReportId = new Map(
				sums.map((entry) => [
					entry.reportId,
					nullableDecimalToNumber(entry._sum.amount),
				]),
			);

			return {
				reports: rows.map((row) =>
					toReportListItemDTO(row, sumByReportId.get(row.id) ?? 0),
				),
				pagination: {
					page: input.page,
					pageSize: input.pageSize,
					pageCount: pageCount(count, input.pageSize),
				},
			};
		},

		async review(
			ctx: ReportServiceContext,
			input: { id: string },
		): Promise<ReviewDTO> {
			const detail = await repo.reviewDetail(ctx.db, {
				id: input.id,
				organizationId: ctx.organizationId,
			});
			if (!detail) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
			}
			return toReviewDTO(detail);
		},

		async financialSummary(
			ctx: ReportServiceContext,
			input: { id: string },
		): Promise<FinancialSummaryDTO> {
			const { report, totalAmount } = await repo.financialSummary(ctx.db, {
				id: input.id,
				organizationId: ctx.organizationId,
			});
			if (!report) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
			}

			authorizeReport(
				"read",
				{
					userId: ctx.userId,
					isOrgAdmin: isOrganizationAdminRole(ctx.orgRole),
				},
				{ ownerId: report.ownerId, status: report.status },
			);

			return toFinancialSummaryDTO(report.bankingDetails, totalAmount);
		},

		async create(
			ctx: ReportServiceContext,
			input: CreateReportInput,
		): Promise<{ id: string }> {
			const banking = await repo.findBankingDetailsOwner(
				ctx.db,
				input.bankingDetailsId,
			);
			if (!banking || banking.userId !== ctx.userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"You don't have permission to create a report with these banking details",
				});
			}

			const costUnit = await repo.findCostUnit(ctx.db, {
				id: input.costUnitId,
				organizationId: ctx.organizationId,
			});
			if (!costUnit) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Cost unit not found",
				});
			}

			return transact(ctx.db, async (db) => {
				const result = await repo.create(db, {
					...input,
					ownerId: ctx.userId,
					organizationId: ctx.organizationId,
					status: ReportStatus.DRAFT,
				});
				await audit.append(db, {
					organizationId: ctx.organizationId,
					actorId: ctx.userId,
					entityType: "report",
					entityId: result.id,
					action: "report.created",
					diff: null,
					payload: { title: input.title, costUnitId: input.costUnitId },
				});
				return result;
			});
		},

		update(
			ctx: ReportServiceContext,
			report: ReportDetail,
			input: UpdateReportInput,
		): Promise<{ id: string }> {
			const before: Record<string, string | null> = {};
			const after: Record<string, string | null> = {};

			if (input.title !== undefined && input.title !== report.title) {
				before.title = report.title;
				after.title = input.title;
			}
			if (
				input.description !== undefined &&
				input.description !== report.description
			) {
				before.description = report.description ?? null;
				after.description = input.description;
			}

			if (Object.keys(before).length === 0) {
				return runWrite(() => repo.update(ctx.db, { id: report.id, data: input }));
			}

			return transact(ctx.db, async (db) => {
				const result = await repo.update(db, { id: report.id, data: input });
				await audit.append(db, {
					organizationId: ctx.organizationId,
					actorId: ctx.userId,
					entityType: "report",
					entityId: report.id,
					action: "report.updated",
					diff: { before, after },
					payload: null,
				});
				return result;
			});
		},

		remove(
			ctx: ReportServiceContext,
			report: ReportDetail,
		): Promise<{ id: string }> {
			return transact(ctx.db, async (db) => {
				const result = await repo.remove(db, report.id);
				await audit.append(db, {
					organizationId: ctx.organizationId,
					actorId: ctx.userId,
					entityType: "report",
					entityId: report.id,
					action: "report.deleted",
					diff: {
						before: { title: report.title, status: report.status },
						after: null,
					},
					payload: null,
				});
				return result;
			});
		},

		async submit(
			ctx: ReportServiceContext,
			report: ReportDetail,
		): Promise<{ id: string }> {
			assertSubmittable(report.status);

			await transact(ctx.db, async (db) => {
				await repo.setStatus(db, {
					id: report.id,
					status: ReportStatus.PENDING_APPROVAL,
				});
				await audit.append(db, {
					organizationId: ctx.organizationId,
					actorId: ctx.userId,
					entityType: "report",
					entityId: report.id,
					action: "report.status_changed",
					diff: {
						before: { status: report.status },
						after: { status: ReportStatus.PENDING_APPROVAL },
					},
					payload: null,
				});
			});

			const settings = await repo.findReviewerEmail(ctx.db, ctx.organizationId);

			events.emit("report.submitted", {
				reportId: report.id,
				title: report.title,
				ownerName: report.owner.name,
				ownerEmail: report.owner.email,
				ownerNotificationPref: report.owner.preferences?.notifications ?? null,
				reviewerEmail: settings?.reviewerEmail ?? null,
			});

			return { id: report.id };
		},

		async transition(
			ctx: ReportServiceContext,
			report: ReportDetail,
			input: TransitionInput,
		): Promise<{ id: string; status: ReportStatus }> {
			assertAdminTransition(report.status, input.status);

			const updated = await transact(ctx.db, async (db) => {
				const result = await repo.setStatus(db, {
					id: report.id,
					status: input.status,
				});
				await audit.append(db, {
					organizationId: ctx.organizationId,
					actorId: ctx.userId,
					entityType: "report",
					entityId: report.id,
					action: "report.status_changed",
					diff: {
						before: { status: report.status },
						after: { status: input.status },
					},
					payload: { notify: input.notify ?? false },
				});
				return result;
			});

			events.emit("report.status_changed", {
				reportId: report.id,
				title: report.title,
				status: input.status,
				ownerName: report.owner.name,
				ownerEmail: report.owner.email,
				ownerNotificationPref: report.owner.preferences?.notifications ?? null,
				notify: input.notify ?? false,
			});

			return updated;
		},

		async exportToPdf(
			ctx: ReportServiceContext,
			input: { id: string },
		): Promise<PdfExportResult> {
			const response = await fetch(`${env.API_URL}/pdf/report/${input.id}`, {
				method: "POST",
				headers: {
					"X-Service-Key": env.INTERNAL_API_SECRET,
					"X-User-Id": ctx.userId,
					"X-Organization-Id": ctx.organizationId,
					"X-Member-Role": ctx.orgRole,
				},
			});

			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				const message =
					typeof body === "object" && body !== null && "error" in body
						? String((body as { error: unknown }).error)
						: "PDF generation failed";
				throw new TRPCError({
					code:
						response.status === 404
							? "NOT_FOUND"
							: response.status === 403
								? "FORBIDDEN"
								: "INTERNAL_SERVER_ERROR",
					message,
				});
			}

			return (await response.json()) as PdfExportResult;
		},
	};
}

export type ReportService = ReturnType<typeof createReportService>;

/** Default service instance wired with the real repository, event bus, and audit repository. */
export const reportService = createReportService({
	repo: reportRepository,
	events: reportEventBus,
	audit: auditRepository,
});
