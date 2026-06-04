"use client";

import { formatDate } from "date-fns";
import React from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { ClientExpense } from "@/lib/types";
import { cn, translateExpenseType } from "@/lib/utils";
import {
	foodExpenseMetaSchema,
	receiptExpenseMetaSchema,
	travelExpenseMetaSchema,
} from "@/lib/validators";

export function ExpenseDetails({
	expense,
	...props
}: React.ComponentProps<typeof Dialog> & { expense: ClientExpense }) {
	return (
		<Dialog {...props}>
			<DialogContent className="max-w-xl sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle className={"text-lg"}>
						{translateExpenseType(expense.type)}
					</DialogTitle>
					<DialogDescription>{expense.description}</DialogDescription>
				</DialogHeader>
				<dl className="grid grid-cols-2 gap-4 border-t pt-4">
					<DetailItem
						className="col-span-2"
						label="Beschreibung"
						value={
							expense.description && expense.description.length > 0
								? expense.description
								: "Keine Beschreibung"
						}
					/>
					<DetailItem
						label="Startdatum"
						value={formatDate(expense.startDate, "dd.MM.yyyy")}
					/>
					<DetailItem
						label="Enddatum"
						value={formatDate(expense.endDate, "dd.MM.yyyy")}
					/>
					<DetailItem label="Betrag" value={expense.amount.toFixed(2)} />
					<Separator className="col-span-2" />
					<MetaItems expense={expense} />
				</dl>
			</DialogContent>
		</Dialog>
	);
}

function DetailItem({
	label,
	value,
	className,
	...props
}: React.ComponentProps<"div"> & { label: string; value: string }) {
	return (
		<div className={cn("grid gap-2", className)} {...props}>
			<dt className="font-medium text-foreground text-sm">{label}</dt>
			<dd className="max-w-prose text-muted-foreground text-sm">{value}</dd>
		</div>
	);
}

function MetaItems({ expense }: { expense: ClientExpense }) {
	if (expense.type === "RECEIPT") {
		const meta = receiptExpenseMetaSchema.safeParse(expense.meta);

		if (!meta.success) {
			return null;
		}

		return null;
	}

	if (expense.type === "TRAVEL") {
		const meta = travelExpenseMetaSchema.safeParse(expense.meta);

		if (!meta.success) {
			return null;
		}

		return (
			<React.Fragment>
				<DetailItem label="Startpunkt" value={meta.data.from} />
				<DetailItem label="Endpunkt" value={meta.data.to} />
				<DetailItem
					className="col-span-2"
					label="Entfernung"
					value={`${meta.data.distance.toFixed(2)} km`}
				/>
			</React.Fragment>
		);
	}
	if (expense.type === "FOOD") {
		const meta = foodExpenseMetaSchema.safeParse(expense.meta);

		if (!meta.success) {
			return null;
		}

		return (
			<React.Fragment>
				<DetailItem label="Tage" value={meta.data.days.toString()} />
				<DetailItem
					label="Frühstücksabzug"
					value={meta.data.breakfastDeduction.toString()}
				/>
				<DetailItem
					label="Mittagessenabzug"
					value={meta.data.lunchDeduction.toString()}
				/>
				<DetailItem
					label="Abendessenabzug"
					value={meta.data.dinnerDeduction.toString()}
				/>
			</React.Fragment>
		);
	}
}
