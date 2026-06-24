import { TRPCError } from "@trpc/server";

type PrismaKnownError = {
	code: string;
	meta?: { target?: string[] };
};

function isPrismaKnownError(error: unknown): error is PrismaKnownError {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		typeof (error as { code: unknown }).code === "string"
	);
}

/**
 * Maps a thrown error to a typed {@link TRPCError}.
 *
 * - Existing `TRPCError`s pass through unchanged.
 * - Prisma `P2002` (unique constraint) → `CONFLICT`.
 * - Prisma `P2025` (record not found)   → `NOT_FOUND`.
 * - Everything else                     → `INTERNAL_SERVER_ERROR`.
 *
 * Use at service/repository boundaries instead of throwing bare `Error`s.
 */
export function mapPrismaError(error: unknown): TRPCError {
	if (error instanceof TRPCError) {
		return error;
	}

	if (isPrismaKnownError(error)) {
		switch (error.code) {
			case "P2002":
				return new TRPCError({
					code: "CONFLICT",
					message: "A resource with these values already exists.",
				});
			case "P2025":
				return new TRPCError({
					code: "NOT_FOUND",
					message: "The requested resource was not found.",
				});
		}
	}

	return new TRPCError({
		code: "INTERNAL_SERVER_ERROR",
		message: "An unexpected error occurred.",
	});
}
