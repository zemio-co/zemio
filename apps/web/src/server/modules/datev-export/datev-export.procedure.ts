import type { PrismaClient } from "@zemio/db";
import type { DatevExportServiceContext } from "./datev-export.service";

type DatevExportRequestContext = {
	db: PrismaClient;
	organizationId: string;
	session: { user: { id: string } };
};

export function toDatevExportServiceContext(
	ctx: DatevExportRequestContext,
): DatevExportServiceContext {
	return {
		db: ctx.db,
		organizationId: ctx.organizationId,
		userId: ctx.session.user.id,
	};
}
