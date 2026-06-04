import type { Expense } from "@/generated/prisma/client";

export type ClientExpense = Omit<Expense, "amount"> & {
	amount: number;
};
