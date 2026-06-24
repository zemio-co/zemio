import type { Prisma } from "@zemio/db";

/**
 * Single source of truth for converting a Prisma `Decimal` to a JS `number`.
 *
 * `Number(decimal)` must not be scattered across routers/services; route every
 * monetary conversion through this helper so the contract lives in one place.
 */
export function decimalToNumber(value: Prisma.Decimal): number {
	return value.toNumber();
}

/**
 * Converts a nullable Prisma `Decimal` (e.g. the result of a `_sum` aggregate over
 * zero rows) to a `number`, defaulting to `0` when absent.
 */
export function nullableDecimalToNumber(
	value: Prisma.Decimal | null | undefined,
): number {
	return value ? value.toNumber() : 0;
}
