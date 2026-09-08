import type { PrismaClient } from "@zemio/db";
import type { z } from "zod";
import type {
	updateDatevSettingsSchema,
	updateMealAllowancesSchema,
	updateTravelAllowancesSchema,
} from "@/lib/validators";
import { mapPrismaError } from "@/server/shared/errors";
import { type SettingsDTO, toSettingsDTO } from "./settings.dto";
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

	async function upsert(
		ctx: SettingsServiceContext,
		data: SettingsWriteData,
	): Promise<SettingsDTO> {
		try {
			const row = await repo.upsert(ctx.db, {
				organizationId: ctx.organizationId,
				data,
			});
			return toSettingsDTO(row);
		} catch (error) {
			throw mapPrismaError(error);
		}
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

		/** The DATEV export configuration (DEV-21). */
		updateDatevSettings(
			ctx: SettingsServiceContext,
			input: DatevSettingsInput,
		): Promise<SettingsDTO> {
			return upsert(ctx, input);
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
