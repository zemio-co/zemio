import { auditRouter } from "@/server/api/routers/audit";
import { costUnitRouter } from "@/server/api/routers/cost-unit";
import { dashboardRouter } from "@/server/api/routers/dashboard";
import { expenseRouter } from "@/server/api/routers/expense";
import { platformAdminRouter } from "@/server/api/routers/platform-admin";
import { reportRouter } from "@/server/api/routers/report";
import { reportFiltersRouter } from "@/server/api/routers/report-filters";
import { reportingRouter } from "@/server/api/routers/reporting";
import { settingsRouter } from "@/server/api/routers/settings";
import { userRouter } from "@/server/api/routers/user";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { attachmentRouter } from "./routers/attachment";
import { bankingDetailsRouter } from "./routers/banking";
import { preferencesRouter } from "./routers/preferences";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	audit: auditRouter,
	dashboard: dashboardRouter,
	report: reportRouter,
	reportFilters: reportFiltersRouter,
	reporting: reportingRouter,
	expense: expenseRouter,
	settings: settingsRouter,
	preferences: preferencesRouter,
	user: userRouter,
	costUnit: costUnitRouter,
	bankingDetails: bankingDetailsRouter,
	platformAdmin: platformAdminRouter,
	attachment: attachmentRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
