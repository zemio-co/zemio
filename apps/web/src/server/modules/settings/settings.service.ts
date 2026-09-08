import type { PrismaClient } from "@zemio/db";
import type { z } from "zod";
import type {
	updateDatevSettingsSchema,
	updateMealAllowancesSchema,
	updateTravelAllowancesSchema,
} from "@/lib/validators";
import { mapPrismaError } from "@/server/shared/errors";
import {
	type DatevSettingsDTO,
	type SettingsDTO,
	toDatevSettingsDTO,
	toSettingsDTO,
} from "./settings.dto";
import {
	type SettingsRepository,
	type SettingsWriteData,
	settingsRepository,
} from "./settings.repository";
import type { UpdateSettingsInput } from "./settings.validators";

export type SettingsServiceContext = {
	db: PrismaClient;
	organizationId: string;
};

type MealAllowancesInput = z.infer<typeof updateMealAllowancesSchema>;
type TravelAllowancesInput = z.infer<typeof updateTravelAllowancesSchema>;
type DatevSettingsInput = z.infer<typeof updateDatevSettingsSchema>;

export function createSettingsService(deps: { repo: SettingsRepository }) {
	const { repo } = deps;

	/**
	 * Settings are created lazily, so every entry point upserts rather than
	 * assuming a row. Returns the row: the two shapes built from it differ in
	 * who may read them.
	 */
	async function upsertRow(
		ctx: SettingsServiceContext,
		data: SettingsWriteData,
	) {
		try {
			return await repo.upsert(ctx.db, {
				organizationId: ctx.organizationId,
				data,
			});
		} catch (error) {
			throw mapPrismaError(error);
		}
	}

	async function upsert(
		ctx: SettingsServiceContext,
		data: SettingsWriteData,
	): Promise<SettingsDTO> {
		return toSettingsDTO(await upsertRow(ctx, data));
	}

	return {
		/** Reading materializes the row, so later writes never race on creation. */
		get(ctx: SettingsServiceContext): Promise<SettingsDTO> {
			return upsert(ctx, {});
		},

		update(
			ctx: SettingsServiceContext,
			input: UpdateSettingsInput,
		): Promise<SettingsDTO> {
			return upsert(ctx, input);
		},

		updateMealAllowances(
			ctx: SettingsServiceContext,
			input: MealAllowancesInput,
		): Promise<SettingsDTO> {
			return upsert(ctx, input);
		},

		/**
		 * The DATEV export configuration (DEV-21), for administrators.
		 *
		 * Separate from `get` because that one is an `orgProcedure` every member's
		 * expense form calls: the Kanzlei's numbers and ledger accounts are the
		 * organization's accounting setup, not something a submitter reads.
		 */
		async getDatevSettings(
			ctx: SettingsServiceContext,
		): Promise<DatevSettingsDTO> {
			return toDatevSettingsDTO(await upsertRow(ctx, {}));
		},

		async updateDatevSettings(
			ctx: SettingsServiceContext,
			input: DatevSettingsInput,
		): Promise<DatevSettingsDTO> {
			return toDatevSettingsDTO(await upsertRow(ctx, input));
		},

		updateTravelAllowances(
			ctx: SettingsServiceContext,
			input: TravelAllowancesInput,
		): Promise<SettingsDTO> {
			return upsert(ctx, input);
		},
	};
}

export type SettingsService = ReturnType<typeof createSettingsService>;

export const settingsService = createSettingsService({
	repo: settingsRepository,
});
