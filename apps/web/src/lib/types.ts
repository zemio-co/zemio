import type { Expense } from "@zemio/db";

export type ClientExpense = Omit<Expense, "amount"> & {
	amount: number;
};
