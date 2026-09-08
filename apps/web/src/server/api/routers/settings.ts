import {
	updateDatevSettingsSchema,
	updateMealAllowancesSchema,
	updateTravelAllowancesSchema,
} from "@/lib/validators";
import {
	createTRPCRouter,
	orgAdminProcedure,
	orgProcedure,
} from "@/server/api/trpc";
import {
	settingsService,
	toSettingsServiceContext,
	updateSettingsSchema,
} from "@/server/modules/settings";

export const settingsRouter = createTRPCRouter({
	get: orgProcedure.query(({ ctx }) =>
		settingsService.get(toSettingsServiceContext(ctx)),
	),

	update: orgAdminProcedure
		.input(updateSettingsSchema)
		.mutation(({ ctx, input }) =>
			settingsService.update(toSettingsServiceContext(ctx), input),
		),

	updateMealAllowances: orgAdminProcedure
		.input(updateMealAllowancesSchema)
		.mutation(({ ctx, input }) =>
			settingsService.updateMealAllowances(toSettingsServiceContext(ctx), input),
		),

	updateDatevSettings: orgAdminProcedure
		.input(updateDatevSettingsSchema)
		.mutation(({ ctx, input }) =>
			settingsService.updateDatevSettings(toSettingsServiceContext(ctx), input),
		),

	updateTravelAllowances: orgAdminProcedure
		.input(updateTravelAllowancesSchema)
		.mutation(({ ctx, input }) =>
			settingsService.updateTravelAllowances(toSettingsServiceContext(ctx), input),
		),
});
