import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@zemio/db";
import { z } from "zod";
import { isOrganizationAdminRole } from "@/lib/organization";
import { orgProcedure } from "@/server/api/trpc";
import {
	authorizeReport,
	type ReportAction,
	type ReportPolicyContext,
} from "./report.policy";
import { reportRepository } from "./report.repository";
import type { ReportServiceContext } from "./report.service";

/** Structural subset of the org-scoped tRPC context the report module needs. */
type ReportRequestContext = {
	db: PrismaClient;
	organizationId: string;
	orgRole: string;
	session: { user: { id: string } };
};

export function toReportServiceContext(
	ctx: ReportRequestContext,
): ReportServiceContext {
	return {
		db: ctx.db,
		organizationId: ctx.organizationId,
		userId: ctx.session.user.id,
		orgRole: ctx.orgRole,
	};
}

function toReportPolicyContext(ctx: ReportRequestContext): ReportPolicyContext {
	return {
		userId: ctx.session.user.id,
		isOrgAdmin: isOrganizationAdminRole(ctx.orgRole),
	};
}

/**
 * Resource-loader procedure factory: loads the report scoped to the active org,
 * authorizes the requested action, and attaches the entity to `ctx.report`.
 */
export function reportProcedure(action: ReportAction) {
	return orgProcedure
		.input(z.object({ id: z.string() }))
		.use(async ({ ctx, input, next }) => {
			const report = await reportRepository.findById(ctx.db, {
				id: input.id,
				organizationId: ctx.organizationId,
			});
			if (!report) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
			}

			authorizeReport(action, toReportPolicyContext(ctx), {
				ownerId: report.ownerId,
				status: report.status,
			});

			return next({ ctx: { ...ctx, report } });
		});
}
