"use client";

import { format, isSameDay } from "date-fns";
import { DownloadIcon, EllipsisIcon } from "lucide-react";
import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { expenseTypeLabel, useExpenseTypeLabel } from "@/lib/i18n-labels";
import { cn } from "@/lib/utils";
import type { ReviewExpense, ReviewLoadState } from "./review-types";

const CSV_MIME_TYPE = "text/csv;charset=utf-8";
const EUR_FORMATTER = new Intl.NumberFormat("de-DE", {
	currency: "EUR",
	style: "currency",
});

function escapeCsvValue(value: string | number): string {
	const stringValue = String(value);
	const requiresEscaping = /[";\n\r]/.test(stringValue);

	if (!requiresEscaping) {
		return stringValue;
	}

	return `"${stringValue.replaceAll('"', '""')}"`;
}

function buildExpensesCsv(expenses: ReviewExpense[]): string {
	const headers = [
		"Titel",
		"Startdatum",
		"Enddatum",
		"Betrag",
		"Beschreibung",
		"Metadaten",
	];
	const rows = expenses.map((expense) => [
		expenseTypeLabel(expense.type),
		format(expense.startDate, "yyyy-MM-dd"),
		format(expense.endDate, "yyyy-MM-dd"),
		expense.amount.toFixed(2),
		expense.description ?? "",
		expense.meta?.toString() ?? "",
	]);

	return [headers, ...rows]
		.map((row) => row.map(escapeCsvValue).join(";"))
		.join("\n");
}

function downloadCsvFile(csvContent: string, filename: string): void {
	const blob = new Blob([csvContent], { type: CSV_MIME_TYPE });
	const objectUrl = URL.createObjectURL(blob);
	const link = document.createElement("a");

	link.href = objectUrl;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(objectUrl);
}

function ReviewExpenses({
	className,
	errorMessage,
	expenses,
	loading,
	totalAmount,
	...props
}: React.ComponentProps<"section"> & {
	expenses?: ReviewExpense[];
	totalAmount?: number;
} & ReviewLoadState) {
	if (loading) {
		return (
			<section className={cn("space-y-4", className)} {...props}>
				<ExpensesHeader expenses={[]} loading />
				<Skeleton className="min-h-32 w-full" />
			</section>
		);
	}

	if (errorMessage || !expenses || totalAmount === undefined) {
		return (
			<section className={cn("space-y-4", className)} {...props}>
				<ExpensesHeader expenses={[]} />
				<div className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed px-6 py-10">
					<p className="text-center font-medium text-destructive text-sm">
						Fehler beim Laden der Ausgaben
					</p>
					<p className="text-center text-xs">
						{errorMessage ?? "Ein unbekannter Fehler ist aufgetreten"}
					</p>
				</div>
			</section>
		);
	}

	if (expenses.length === 0) {
		return (
			<section className={cn("space-y-4", className)} {...props}>
				<ExpensesHeader expenses={expenses} />
				<div className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed px-6 py-10">
					<p className="text-center font-medium text-sm">Keine Ausgaben gefunden.</p>
					<p className="text-center text-muted-foreground text-xs">
						Für diesen Spesenbericht wurden noch keine Ausgaben eingetragen
					</p>
				</div>
			</section>
		);
	}

	return (
		<section className={cn("space-y-4", className)} {...props}>
			<ExpensesHeader expenses={expenses} />
			<ExpensesTable expenses={expenses} totalAmount={totalAmount} />
		</section>
	);
}

function ExpensesTable({
	className,
	expenses,
	totalAmount,
	...props
}: React.ComponentProps<"table"> & {
	expenses: ReviewExpense[];
	totalAmount: number;
}) {
	return (
		<table className={cn("w-full", className)} data-slot="component" {...props}>
			<thead>
				<tr className="border-b">
					<th className="py-3 text-left font-medium text-xs text-zinc-500">Titel</th>
					<th className="py-3 text-left font-medium text-xs text-zinc-500">Datum</th>
					<th className="py-3 text-right font-medium text-xs text-zinc-500">
						Betrag
					</th>
					<th className="py-3 text-right font-medium text-xs text-zinc-500">
						Aktionen
					</th>
				</tr>
			</thead>
			<tbody>
				{expenses.map((expense) => (
					<ExpenseRow expense={expense} key={expense.id} />
				))}
				<tr className="border-t bg-muted">
					<td
						className="rounded-bl-md py-3 text-right font-medium text-muted-foreground text-sm"
						colSpan={2}
					>
						Summe
					</td>
					<td className="border-t py-3 text-right font-medium text-sm">
						{EUR_FORMATTER.format(totalAmount)}
					</td>
					<td className="rounded-br-md" />
				</tr>
			</tbody>
		</table>
	);
}

function ExpenseRow({
	className,
	expense,
	...props
}: React.ComponentProps<"tr"> & {
	expense: ReviewExpense;
}) {
	const expenseTypeLabelText = useExpenseTypeLabel(expense.type);

	return (
		<tr className={cn("", className)} data-slot="component" {...props}>
			<td className="py-3">
				<span className="font-medium text-sm text-zinc-800">
					{expenseTypeLabelText}
				</span>
			</td>
			<td className="py-3">
				<span className="text-sm text-zinc-500">
					{isSameDay(expense.endDate, expense.startDate) ? (
						<span>{format(expense.endDate, "dd.MM.yyyy")}</span>
					) : (
						<span>
							{format(expense.startDate, "dd.MM.")} -{" "}
							{format(expense.endDate, "dd.MM.yyyy")}
						</span>
					)}
				</span>
			</td>
			<td className="py-3 text-right font-medium text-sm text-zinc-800">
				{EUR_FORMATTER.format(expense.amount)}
			</td>
			<td className="text-right">
				<Button size={"icon-sm"} variant={"ghost"}>
					<EllipsisIcon />
				</Button>
			</td>
		</tr>
	);
}

function ExpensesHeader({
	className,
	expenses,
	loading,
	...props
}: React.ComponentProps<"div"> & {
	expenses: ReviewExpense[];
	loading?: boolean;
}) {
	return (
		<div
			className={cn("flex items-center justify-start gap-2", className)}
			data-slot="expenses-header"
			{...props}
		>
			<p className="font-semibold text-zinc-800">Kostenaufstellung</p>
			{loading ? (
				<Skeleton className="h-5 w-7 rounded-full" />
			) : (
				<Badge variant={"secondary"}>{expenses.length}</Badge>
			)}
			<ExportButton
				className={"ml-auto translate-x-2.5"}
				disabled={loading}
				expenses={expenses}
			/>
		</div>
	);
}

function ExportButton({
	className,
	disabled,
	expenses,
	onClick,
	...props
}: React.ComponentProps<typeof Button> & {
	expenses: ReviewExpense[];
}) {
	const handleExport: NonNullable<
		React.ComponentProps<typeof Button>["onClick"]
	> = (event) => {
		onClick?.(event);

		if (event.defaultPrevented || expenses.length === 0) {
			return;
		}

		const csvContent = buildExpensesCsv(expenses);
		const filename = `expenses-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`;
		downloadCsvFile(csvContent, filename);
	};

	return (
		<Button
			className={cn("text-blue-500 hover:text-blue-500", className)}
			data-slot="attachments-download-all"
			disabled={disabled || expenses.length === 0}
			onClick={handleExport}
			variant={"ghost"}
			{...props}
		>
			Exportieren
			<DownloadIcon />
		</Button>
	);
}

export { ReviewExpenses };
