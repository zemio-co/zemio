"use client";

import { cn } from "@/lib/utils";

function ExpensesHeader({
	className,
	...props
}: React.ComponentProps<"header">) {
	return (
		<header
			className={cn("", className)}
			data-slot="expenses-header"
			{...props}
		></header>
	);
}

export { ExpensesHeader };
