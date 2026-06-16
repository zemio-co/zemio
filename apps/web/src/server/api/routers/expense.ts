import { z } from "zod";
import {
	createFoodExpenseSchema,
	createReceiptExpenseSchema,
	createTravelExpenseSchema,
} from "@/lib/validators";
import { createTRPCRouter, orgProcedure } from "@/server/api/trpc";
import {
	expenseProcedure,
	toExpenseServiceContext,
} from "@/server/modules/expense/expense.procedure";
import { expenseService } from "@/server/modules/expense/expense.service";

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
		.input(
			z.object({
				description: z.string().optional(),
				amount: z.number().min(0).optional(),
				startDate: z.date().optional(),
				endDate: z.date().optional(),
				from: z.string().min(1).optional(),
				to: z.string().min(1).optional(),
				distance: z.number().min(1).optional(),
				days: z.number().min(1).optional(),
				breakfastDeduction: z.number().min(0).optional(),
				lunchDeduction: z.number().min(0).optional(),
				dinnerDeduction: z.number().min(0).optional(),
			}),
		)
		.mutation(({ ctx, input }) =>
			expenseService.update(toExpenseServiceContext(ctx), ctx.expense, input),
		),

	delete: expenseProcedure("delete").mutation(({ ctx }) =>
		expenseService.remove(toExpenseServiceContext(ctx), ctx.expense),
	),
});
