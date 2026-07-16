import type { PrismaClient } from "@zemio/db";
import type { ReportingServiceContext } from "./reporting.service";

type ReportingRequestContext = {
	db: PrismaClient;
	organizationId: string;
	orgRole: string;
	session: { user: { id: string } };
};

export function toReportingServiceContext(
	ctx: ReportingRequestContext,
): ReportingServiceContext {
	return {
		db: ctx.db,
		organizationId: ctx.organizationId,
		userId: ctx.session.user.id,
		orgRole: ctx.orgRole,
	};
}
