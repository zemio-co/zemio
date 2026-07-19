import { TRPCError } from "@trpc/server";
import z from "zod";
import { env } from "@/env";
import {
	decryptBankingDetails,
	encryptBankingDetails,
} from "@/lib/banking/cryptic";
import { normalizeIban } from "@/lib/banking/iban";
import { logger } from "@/lib/logger";
import { ibanSchema } from "@/lib/validators";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const ibanValidationResultSchema = z.object({
	valid: z.boolean(),
	bic: z.string().nullable(),
});

export const bankingDetailsRouter = createTRPCRouter({
	/**
	 * Validates an IBAN and resolves its BIC via the internal banking API.
	 * Proxied through the server so the service key never reaches the client.
	 *
	 * A 400 from the banking API is the documented "IBAN is invalid" response
	 * and is returned as a normal result, not an error. Anything else
	 * (network failure, unexpected status, malformed body) means the check
	 * itself couldn't be performed, which is a real failure — it's logged and
	 * thrown rather than silently reported as "invalid", so an outage never
	 * looks identical to a user typo.
	 */
	validateIban: protectedProcedure
		.input(z.object({ iban: z.string().min(1) }))
		.query(async ({ input }) => {
			const iban = normalizeIban(input.iban);
			const url = `${env.API_URL}/banking/iban/${encodeURIComponent(iban)}`;

			let response: Response;
			try {
				response = await fetch(url, {
					headers: { "X-Service-Key": env.INTERNAL_API_SECRET },
				});
			} catch (err) {
				logger.error("banking.validate_iban_unreachable", {
					message: err instanceof Error ? err.message : String(err),
				});
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Unable to reach the banking service",
				});
			}

			if (response.status === 400) {
				return { valid: false, bic: null };
			}

			const body: unknown = await response.json().catch(() => null);
			const parsed = ibanValidationResultSchema.safeParse(body);

			if (!response.ok || !parsed.success) {
				logger.error("banking.validate_iban_failed", {
					status: response.status,
				});
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Unable to validate IBAN",
				});
			}

			return parsed.data;
		}),

	/**
	 * Creates new banking details for the current user.
	 */
	create: protectedProcedure
		.input(
			z.object({
				title: z.string().min(1, "Titel ist erforderlich"),
				iban: ibanSchema,
				fullName: z.string().min(1, "Name ist erforderlich"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { session } = ctx;

			const encrypted = await encryptBankingDetails({
				iban: input.iban,
				fullName: input.fullName,
			});

			return await ctx.db.bankingDetails.create({
				data: {
					title: input.title,
					userId: session.user.id,
					...encrypted,
				},
			});
		}),

	/**
	 * Returns the full decrypted banking details for the given id.
	 *
	 * This function is only intended for the owner of the banking details (e.g. for
	 * editing or deleting them).
	 */
	get: protectedProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const details = await ctx.db.bankingDetails.findUnique({
				where: {
					id: input.id,
				},
			});

			if (!details) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Banking details not found",
				});
			}

			if (details.userId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to these banking details",
				});
			}

			const decrypted = decryptBankingDetails({
				...details,
			});

			return {
				...details,
				iban: decrypted.iban,
				fullName: decrypted.fullName,
			};
		}),

	/**
	 * Returns a list of all banking details for the current user.
	 *
	 * Only the title of each banking detail is returned. Since the IBAN and full name are
	 * encrypted, they have to be fetched separately. Sending all (encrypted) banking details
	 * at once would expose the sensitive data.
	 */
	list: protectedProcedure.query(async ({ ctx }) => {
		const { session } = ctx;

		return await ctx.db.bankingDetails.findMany({
			where: {
				userId: session.user.id,
			},
			select: {
				id: true,
				title: true,
				createdAt: true,
			},
		});
	}),
	/**
	 * Updates existing banking details for the current user.
	 */
	update: protectedProcedure
		.input(
			z.object({
				id: z.string().min(1),
				title: z.string().min(1, "Titel ist erforderlich"),
				iban: ibanSchema,
				fullName: z.string().min(1, "Name ist erforderlich"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const details = await ctx.db.bankingDetails.findUnique({
				where: { id: input.id },
				select: {
					userId: true,
				},
			});

			if (!details) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Banking details not found",
				});
			}

			if (details.userId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to these banking details",
				});
			}

			const encrypted = await encryptBankingDetails({
				iban: input.iban,
				fullName: input.fullName,
			});

			return await ctx.db.bankingDetails.update({
				where: { id: input.id },
				data: {
					title: input.title,
					...encrypted,
				},
			});
		}),

	delete: protectedProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const details = await ctx.db.bankingDetails.findUnique({
				where: { id: input.id },
				select: {
					userId: true,
				},
			});

			if (!details) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Banking details not found",
				});
			}

			if (details.userId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to these banking details",
				});
			}

			return await ctx.db.bankingDetails.delete({
				where: { id: input.id },
			});
		}),
});
