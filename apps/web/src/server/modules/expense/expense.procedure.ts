import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@zemio/db";
import { z } from "zod";
import { isOrganizationAdminRole } from "@/lib/organization";
import { orgProcedure } from "@/server/api/trpc";
import {
	authorizeExpense,
	type ExpenseAction,
	type ExpensePolicyContext,
} from "./expense.policy";
import { expenseRepository } from "./expense.repository";
import type { ExpenseServiceContext } from "./expense.service";

type ExpenseRequestContext = {
	db: PrismaClient;
	organizationId: string;
	orgRole: string;
	session: { user: { id: string } };
};

export function toExpenseServiceContext(
	ctx: ExpenseRequestContext,
): ExpenseServiceContext {
	return {
		db: ctx.db,
		organizationId: ctx.organizationId,
		userId: ctx.session.user.id,
		isOrgAdmin: isOrganizationAdminRole(ctx.orgRole),
	};
}

function toExpensePolicyContext(
	ctx: ExpenseRequestContext,
): ExpensePolicyContext {
	return {
		userId: ctx.session.user.id,
		isOrgAdmin: isOrganizationAdminRole(ctx.orgRole),
	};
}

/**
 * Resource-loader procedure factory: loads the expense scoped to the active org,
 * authorizes the requested action, and attaches the entity to `ctx.expense`.
 */
export function expenseProcedure(action: ExpenseAction) {
	return orgProcedure
		.input(z.object({ id: z.string() }))
		.use(async ({ ctx, input, next }) => {
			const expense = await expenseRepository.findById(ctx.db, input.id);
			if (!expense) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Expense not found" });
			}
			if (expense.report.organizationId !== ctx.organizationId) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Expense not found" });
			}

			authorizeExpense(action, toExpensePolicyContext(ctx), {
				report: expense.report,
			});

			return next({ ctx: { ...ctx, expense } });
		});
}
