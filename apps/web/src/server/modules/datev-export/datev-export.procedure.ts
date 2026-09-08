import type { PrismaClient } from "@zemio/db";
import type { DatevExportServiceContext } from "./datev-export.service";

type DatevExportRequestContext = {
	db: PrismaClient;
	organizationId: string;
	// The name too, not just the id: it is written into the file as "Exportiert
	// von", the one field that tells the Kanzlei who produced it.
	session: { user: { id: string; name: string } };
};

export function toDatevExportServiceContext(
	ctx: DatevExportRequestContext,
): DatevExportServiceContext {
	return {
		db: ctx.db,
		organizationId: ctx.organizationId,
		userId: ctx.session.user.id,
		userName: ctx.session.user.name,
	};
}
