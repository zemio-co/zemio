import type { Dialog as DialogPrimitive } from "@base-ui/react";
import type { Expense } from "@zemio/db";

export type ClientExpense = Omit<Expense, "amount"> & {
	amount: number;
};

export interface WithHandle<P = unknown> {
	handle: ReturnType<typeof DialogPrimitive.createHandle<P>>;
}
