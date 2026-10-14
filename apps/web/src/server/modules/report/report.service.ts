import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@zemio/db";
import { NotificationPreference, ReportStatus } from "@zemio/db";
import type { z } from "zod";
import { env } from "@/env";
import { isOrganizationAdminRole } from "@/lib/organization";
import type { createReportSchema } from "@/lib/validators";
import { type AuditRepository, auditRepository } from "@/server/modules/audit";
import {
	isTransientContentionError,
	mapPrismaError,
} from "@/server/shared/errors";
import { nullableDecimalToNumber } from "@/server/shared/money";
import {
	offsetPageArgs,
	type PageMeta,
	toPageMeta,
} from "@/server/shared/pagination";
import {
	type FinancialSummaryDTO,
	type ReportListItemDTO,
	type ReviewDTO,
	toFinancialSummaryDTO,
	toReportListItemDTO,
	toReviewDTO,
} from "./report.dto";
import { type ReportEventEmitter, reportEventBus } from "./report.events";
import { reportPolicy } from "./report.policy";
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
import {
	assertAdminTransition,
	assertSubmittable,
	isEditable,
} from "./report.state";
import type {
	transitionReportSchema,
	updateReportSchema,
} from "./report.validators";

/** Runs a repository write, mapping Prisma errors (P2002/P2025/…) to typed TRPCErrors. */
async function runWrite<T>(operation: () => Promise<T>): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		throw mapPrismaError(error);
	}
}

const maxTransactionAttempts = 3;
/**
 * Ceiling on time spent retrying, checked before each further attempt. An
 * attempt can block for a while before failing — a pool wait runs until the
 * connection timeout — so the attempt count alone does not bound how long a
 * mutation takes. Without this, retries stack into a request that outlives the
 * gateway and reaches the user as an opaque 504.
 */
const maxTransactionRetryMs = 5_000;

/**
 * Runs an interactive transaction, passing a typed DB client to the callback.
 * Maps Prisma errors to typed TRPCErrors on failure.
 * The `tx as unknown as PrismaClient` cast is justified: Prisma's transaction
 * client exposes the same model operations as PrismaClient — only lifecycle
 * methods ($connect, $transaction, etc.) are omitted. Repository methods that
 * use one (`financialSummary` batches with $transaction) must therefore be
 * called with the request client, not from inside a body passed here.
 *
 * Transactions that provably committed nothing (see
 * {@link isTransientContentionError}) are retried with a short jittered backoff
 * instead of surfacing — a burst of creates in one organization queues on the
 * organization row while each holder issues its report number, and the waiters
 * that cannot open a transaction in time are exactly the ones worth repeating.
 * Replaying is safe only because every body passed here is free of external
 * side effects: notification events are emitted after the transaction returns,
 * never inside it. Errors that leave the outcome unknown, such as a transaction
 * expiring around COMMIT, are deliberately *not* retried — repeating one could
 * duplicate a report and burn a second report number.
 */
async function transact<T>(
	db: PrismaClient,
	fn: (db: PrismaClient) => Promise<T>,
): Promise<T> {
	const deadline = Date.now() + maxTransactionRetryMs;
	for (let attempt = 1; ; attempt++) {
		try {
			return await db.$transaction((tx) => fn(tx as unknown as PrismaClient));
		} catch (error) {
			// Jittered so the waiters that just collided don't retry in lockstep.
			const backoffMs = 25 * 2 ** attempt * (0.5 + Math.random());
			if (
				attempt >= maxTransactionAttempts ||
				!isTransientContentionError(error) ||
				// The next attempt must start within the budget, so the backoff has
				// to fit too — checking only the elapsed time would let a retry begin
				// just before the deadline and then block for a full attempt.
				Date.now() + backoffMs >= deadline
			) {
				throw mapPrismaError(error);
			}
			await new Promise((resolve) => setTimeout(resolve, backoffMs));
		}
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
type UpdateReportInput = z.infer<typeof updateReportSchema>;
type TransitionInput = z.infer<typeof transitionReportSchema>;

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
			pagination: PageMeta;
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
				pagination: toPageMeta(input, count),
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

			reportPolicy.authorize(
				"read",
				{
					userId: ctx.userId,
					isOrgAdmin: isOrganizationAdminRole(ctx.orgRole),
				},
				{ ownerId: report.ownerId, status: report.status },
			);

			// Editable reports show the live details (what the next submission
			// would snapshot) — never an old snapshot, which would present stale
			// account data after the owner deleted the live details. Finalized
			// reports show the submitted snapshot.
			const banking = isEditable(report.status)
				? report.bankingDetails
				: (report.bankingSnapshot ?? report.bankingDetails);

			return toFinancialSummaryDTO(banking, totalAmount);
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
					payload: {
						title: input.title,
						costUnitId: input.costUnitId,
						bankingDetailsId: input.bankingDetailsId,
					},
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

			const { bankingDetailsId } = report;
			if (!bankingDetailsId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"The banking details of this report were deleted. Select new banking details before submitting.",
				});
			}

			await transact(ctx.db, async (db) => {
				const snapshotted = await repo.snapshotBankingDetails(db, {
					reportId: report.id,
					bankingDetailsId,
				});
				if (!snapshotted) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message:
							"The banking details of this report were deleted. Select new banking details before submitting.",
					});
				}
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
				ownerNotificationPref:
					report.owner.preferences?.notifications ?? NotificationPreference.ALL,
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

			// Moving an editable report into review is a submission: it must
			// snapshot the banking details exactly like the owner submit flow,
			// otherwise the report finalizes without one and reads fall back to
			// the mutable live details. Re-review transitions (from ACCEPTED /
			// REJECTED) keep the snapshot taken at the original submission.
			const requiresSnapshot =
				input.status === ReportStatus.PENDING_APPROVAL && isEditable(report.status);
			const missingBankingDetailsError = () =>
				new TRPCError({
					code: "BAD_REQUEST",
					message:
						"The banking details of this report were deleted. The owner must select new banking details before it can be submitted.",
				});
			if (requiresSnapshot && !report.bankingDetailsId) {
				throw missingBankingDetailsError();
			}

			const updated = await transact(ctx.db, async (db) => {
				if (requiresSnapshot && report.bankingDetailsId) {
					const snapshotted = await repo.snapshotBankingDetails(db, {
						reportId: report.id,
						bankingDetailsId: report.bankingDetailsId,
					});
					if (!snapshotted) {
						throw missingBankingDetailsError();
					}
				}
				const result = await repo.setStatus(db, {
					id: report.id,
					status: input.status,
					paidAt: input.status === ReportStatus.PAID ? new Date() : undefined,
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
				ownerNotificationPref:
					report.owner.preferences?.notifications ?? NotificationPreference.ALL,
				notify: input.notify ?? false,
			});

			return updated;
		},

		/**
		 * Delegates rendering to the PDF service, which re-checks org and
		 * ownership itself because its endpoint is independently reachable. The
		 * report is loaded and authorized here too, so this app never forwards an
		 * id it has not already validated.
		 */
		async exportToPdf(
			ctx: ReportServiceContext,
			report: ReportDetail,
		): Promise<PdfExportResult> {
			const response = await fetch(`${env.API_URL}/pdf/report/${report.id}`, {
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
