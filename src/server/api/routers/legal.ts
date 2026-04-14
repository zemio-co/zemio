import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import {
	CURRENT_LEGAL_RELEASE,
	getCurrentLegalDocumentVersionSnapshots,
} from "@/server/legal";
import { authenticatedProcedure, createTRPCRouter } from "../trpc";

const acceptCurrentReleaseSchema = z.object({
	releaseVersion: z.string(),
});

export const legalRouter = createTRPCRouter({
	getCurrentRelease: authenticatedProcedure.query(() => {
		return CURRENT_LEGAL_RELEASE;
	}),

	acceptCurrentRelease: authenticatedProcedure
		.input(acceptCurrentReleaseSchema)
		.mutation(async ({ ctx, input }) => {
			if (input.releaseVersion !== CURRENT_LEGAL_RELEASE.version) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"The legal documents changed. Refresh the page and review the latest version.",
				});
			}

			const existingAcceptance = await ctx.db.legalAcceptance.findUnique({
				where: {
					userId_releaseVersion: {
						userId: ctx.session.user.id,
						releaseVersion: CURRENT_LEGAL_RELEASE.version,
					},
				},
				select: {
					id: true,
					acceptedAt: true,
					releaseVersion: true,
				},
			});

			const documentVersions: Prisma.InputJsonArray =
				getCurrentLegalDocumentVersionSnapshots().map(
					(documentVersion): Prisma.InputJsonObject => ({
						key: documentVersion.key,
						title: documentVersion.title,
						version: documentVersion.version,
					}),
				);

			const acceptance =
				existingAcceptance ??
				(await ctx.db.legalAcceptance.create({
					data: {
						userId: ctx.session.user.id,
						releaseVersion: CURRENT_LEGAL_RELEASE.version,
						acceptanceType: CURRENT_LEGAL_RELEASE.acceptanceType,
						documentVersions,
					},
					select: {
						id: true,
						acceptedAt: true,
						releaseVersion: true,
					},
				}));

			await ctx.db.session.updateMany({
				where: {
					userId: ctx.session.user.id,
				},
				data: {
					legalAcceptedAt: acceptance.acceptedAt,
					legalAcceptedReleaseVersion: acceptance.releaseVersion,
				},
			});

			return acceptance;
		}),
});
