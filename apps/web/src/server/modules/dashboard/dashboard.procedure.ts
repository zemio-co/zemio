import type { PrismaClient } from "@zemio/db";
import type { DashboardServiceContext } from "./dashboard.service";

type DashboardRequestContext = {
	db: PrismaClient;
	organizationId: string;
	session: { user: { id: string } };
};

export function toDashboardServiceContext(
	ctx: DashboardRequestContext,
): DashboardServiceContext {
	return {
		db: ctx.db,
		organizationId: ctx.organizationId,
		userId: ctx.session.user.id,
	};
}
