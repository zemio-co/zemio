import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@zemio/db";
import { z } from "zod";
import { isOrganizationAdminRole } from "@/lib/organization";
import { orgProcedure } from "@/server/api/trpc";
import {
	type AttachmentAction,
	type AttachmentPolicyContext,
	authorizeAttachment,
} from "./attachment.policy";
import { attachmentRepository } from "./attachment.repository";
import type { AttachmentServiceContext } from "./attachment.service";

type AttachmentRequestContext = {
	db: PrismaClient;
	organizationId: string;
	orgRole: string;
	session: { user: { id: string } };
};

export function toAttachmentServiceContext(
	ctx: AttachmentRequestContext,
): AttachmentServiceContext {
	return {
		db: ctx.db,
		organizationId: ctx.organizationId,
		userId: ctx.session.user.id,
		isOrgAdmin: isOrganizationAdminRole(ctx.orgRole),
	};
}

function toAttachmentPolicyContext(
	ctx: AttachmentRequestContext,
): AttachmentPolicyContext {
	return {
		userId: ctx.session.user.id,
		isOrgAdmin: isOrganizationAdminRole(ctx.orgRole),
	};
}

/**
 * Resource-loader procedure factory: loads the attachment scoped to the active org,
 * authorizes the requested action, and attaches the entity to `ctx.attachment`.
 */
export function attachmentProcedure(action: AttachmentAction) {
	return orgProcedure
		.input(z.object({ id: z.string() }))
		.use(async ({ ctx, input, next }) => {
			const attachment = await attachmentRepository.findById(ctx.db, input.id);
			if (!attachment) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Attachment not found",
				});
			}
			if (attachment.expense.report.organizationId !== ctx.organizationId) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Attachment not found",
				});
			}

			authorizeAttachment(action, toAttachmentPolicyContext(ctx), {
				report: attachment.expense.report,
			});

			return next({ ctx: { ...ctx, attachment } });
		});
}
