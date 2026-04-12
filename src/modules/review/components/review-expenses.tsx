"use client";

import React from "react";
import { cn } from "@/lib/utils";

function ReviewExpenses({
	className,
	expenses,
	...props
}: React.ComponentProps<"table"> & {
	expenses: {
		id: string;
	}[];
}) {
	const _sum = React.useMemo(() => {}, []);

	return (
		<table className={cn("w-full", className)} {...props}>
			<thead>
				<tr>
					<ExpensesHead>Titel</ExpensesHead>
					<ExpensesHead>Datum</ExpensesHead>
					<ExpensesHead className="text-right">Betrag</ExpensesHead>
					<ExpensesHead className="text-right">Aktionen</ExpensesHead>
				</tr>
			</thead>
			<tbody>
				{expenses.map((expense) => (
					<tr className="border-t" key={expense.id}>
						<td className="py-3">
							<span className="font-medium text-sm text-zinc-800">Beleg</span>
						</td>
						<td className="py-3">
							<span className="text-sm text-zinc-500">12.04. - 14.04.2026</span>
						</td>
						<td className="py-3 text-right font-medium text-sm text-zinc-800">
							23.14 EUR
						</td>
					</tr>
				))}
				<tr></tr>
			</tbody>
		</table>
	);
}

function ExpensesHead({ className, ...props }: React.ComponentProps<"th">) {
	return (
		<th
			className={cn("py-3 text-left font-medium text-xs text-zinc-500", className)}
			{...props}
		/>
	);
}

export { ReviewExpenses };
