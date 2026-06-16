import { z } from "zod";
import { createTRPCRouter, orgProcedure } from "@/server/api/trpc";
import {
	createFoodExpenseSchema,
	createReceiptExpenseSchema,
	createTravelExpenseSchema,
	expenseProcedure,
	expenseService,
	toExpenseServiceContext,
	updateExpenseSchema,
} from "@/server/modules/expense";

export const expenseRouter = createTRPCRouter({
	list: orgProcedure
		.input(z.object({ reportId: z.string() }))
		.query(({ ctx, input }) =>
			expenseService.list(toExpenseServiceContext(ctx), input),
		),

	byId: expenseProcedure("read").query(({ ctx }) =>
		expenseService.byId(ctx.expense),
	),

	createReceipt: orgProcedure
		.input(createReceiptExpenseSchema)
		.mutation(({ ctx, input }) =>
			expenseService.createReceipt(toExpenseServiceContext(ctx), input),
		),

	createTravel: orgProcedure
		.input(createTravelExpenseSchema)
		.mutation(({ ctx, input }) =>
			expenseService.createTravel(toExpenseServiceContext(ctx), input),
		),

	createFood: orgProcedure
		.input(createFoodExpenseSchema)
		.mutation(({ ctx, input }) =>
			expenseService.createFood(toExpenseServiceContext(ctx), input),
		),

	update: expenseProcedure("update")
		.input(updateExpenseSchema)
		.mutation(({ ctx, input }) =>
			expenseService.update(toExpenseServiceContext(ctx), ctx.expense, input),
		),

	delete: expenseProcedure("delete").mutation(({ ctx }) =>
		expenseService.remove(toExpenseServiceContext(ctx), ctx.expense),
	),
});
