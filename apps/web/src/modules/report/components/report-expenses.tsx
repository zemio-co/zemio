"use client";

import {
	AlertDialog as AlertDialogPrimitive,
	Dialog as DialogPrimitive,
} from "@base-ui/react";
import { useQueries } from "@tanstack/react-query";
import { formatDate, isSameDay } from "date-fns";
import {
	MoreHorizontalIcon,
	PencilIcon,
	PlusIcon,
	ReceiptIcon,
	TrashIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { expenseTypeKeys } from "@/lib/i18n-labels";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { CreateExpense } from "./create-expense";
import { ReportUpdateExpense } from "./report-update-expense";

function ReportExpenses({
	className,
	reportId,
	...props
}: React.ComponentProps<"section"> & {
	reportId: string;
}) {
	const t = useTranslations("enums.expenseType");
	const tExpenses = useTranslations("modules.report.expenses");
	const utils = api.useUtils();

	const [expensesQuery, financialQuery] = useQueries({
		queries: [
			utils.expense.list.queryOptions({ reportId }),
			utils.report.financialSummary.queryOptions({ id: reportId }),
		],
	});

	if (expensesQuery.isPending || financialQuery.isPending) {
		return (
			<ReportExpensesLoading
				className={className}
				reportId={reportId}
				{...props}
			/>
		);
	}

	if (expensesQuery.error || financialQuery.error) {
		return null;
	}

	const { data: expenses } = expensesQuery;
	const { data: financialData } = financialQuery;

	if (!expenses || expenses.length === 0) {
		return (
			<ReportExpensesEmpty className={className} reportId={reportId} {...props} />
		);
	}

	return (
		<section className={cn("", className)} data-slot="report-expenses" {...props}>
			<ReportExpensesHeader reportId={reportId} />

			<div className="mt-6">
				<table className="w-full">
					<thead>
						<tr>
							<th className="border-slate-200 border-b px-2 py-2 pl-0 text-left font-semibold text-slate-800 text-xs">
								{tExpenses("table.type")}
							</th>
							<th className="border-slate-200 border-b px-2 py-2 text-left font-semibold text-slate-800 text-xs">
								{tExpenses("table.description")}
							</th>
							<th className="border-slate-200 border-b px-2 py-2 text-left font-semibold text-slate-800 text-xs">
								{tExpenses("table.date")}
							</th>
							<th className="border-slate-200 border-b px-2 py-2 text-right font-semibold text-slate-800 text-xs">
								{tExpenses("table.amount")}
							</th>
							<th className="w-8 border-slate-200 border-b" />
						</tr>
					</thead>
					<tbody>
						{expenses.map((expense) => (
							<tr className="border-slate-200 border-b" key={expense.id}>
								<td className="px-3 py-2.5 pl-0 text-left font-medium text-slate-800">
									{t(expenseTypeKeys[expense.type])}
								</td>
								<td className="px-3 py-2.5 text-left text-slate-700 text-sm">
									{expense.description}
								</td>
								<td className="px-3 py-2.5 text-left text-slate-700 text-sm">
									{isSameDay(expense.startDate, expense.endDate) ? (
										formatDate(expense.startDate, "dd.MM.yyyy")
									) : (
										<>
											{formatDate(expense.startDate, "dd.MM.yyyy")} –{" "}
											{formatDate(expense.endDate, "dd.MM.yyyy")}
										</>
									)}
								</td>
								<td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-slate-700 text-sm">
									{expense.amount.toFixed(2)} <span className="ml-1">€</span>
								</td>
								<td className="pl-2">
									<ExpenseActionMenu
										expenseId={expense.id}
										reportId={reportId}
										size={"icon-sm"}
										variant={"ghost"}
									>
										<MoreHorizontalIcon />
									</ExpenseActionMenu>
								</td>
							</tr>
						))}
						<tr>
							<td></td>
							<td></td>
							<td className="px-2 py-2.5 text-right font-semibold text-slate-800 text-sm">
								{tExpenses("table.sum")}
							</td>
							<td className="px-2 py-2.5 text-right font-semibold text-slate-800 text-sm">
								{financialData.totalAmount.toFixed(2)}
								<span className="ml-1">€</span>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>
	);
}

function ReportExpensesHeader({
	className,
	disabled,
	reportId,
	...props
}: React.ComponentProps<"div"> & {
	disabled?: boolean;
	reportId: string;
}) {
	const t = useTranslations("modules.report.expenses");

	return (
		<div
			className={cn(
				"flex flex-wrap items-center justify-between gap-4",
				className,
			)}
			data-slot="report-expenses-header"
			{...props}
		>
			<h3 className="font-semibold text-lg text-slate-800">{t("header")}</h3>
			<CreateExpense
				disabled={disabled}
				reportId={reportId}
				size={"xs"}
				variant={"outline"}
			>
				<PlusIcon />
				{t("add")}
			</CreateExpense>
		</div>
	);
}

function ReportExpensesLoading({
	className,
	reportId,
	...props
}: React.ComponentProps<"section"> & {
	reportId: string;
}) {
	return (
		<section
			className={cn("", className)}
			data-slot="report-expenses-loading"
			{...props}
		>
			<ReportExpensesHeader disabled reportId={reportId} />
			<div className="mt-6 w-full space-y-4">
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
			</div>
		</section>
	);
}

function ReportExpensesEmpty({
	className,
	reportId,
	...props
}: React.ComponentProps<"section"> & {
	reportId: string;
}) {
	const t = useTranslations("modules.report.expenses");

	return (
		<section
			className={cn("", className)}
			data-slot="report-expenses-empty"
			{...props}
		>
			<ReportExpensesHeader reportId={reportId} />
			<div className="mt-12 flex w-full flex-col items-center justify-center rounded-lg">
				<div className="max-w-xs">
					<div className="w-fit rounded-sm bg-slate-100 p-2">
						<ReceiptIcon className="size-5 text-slate-500" />
					</div>
					<p className="mt-6 font-medium text-slate-800 text-sm">
						{t("emptyTitle")}
					</p>
					<p className="mt-1 text-slate-500 text-sm">{t("emptyDescription")}</p>
				</div>
			</div>
		</section>
	);
}

function ExpenseActionMenu({
	expenseId,
	reportId,
	...props
}: React.ComponentProps<typeof Button> & {
	expenseId: string;
	reportId: string;
}) {
	const t = useTranslations("modules.report.expenses");
	const deleteHandleRef = useRef<ReturnType<
		typeof AlertDialogPrimitive.createHandle
	> | null>(null);
	if (!deleteHandleRef.current)
		deleteHandleRef.current = AlertDialogPrimitive.createHandle();
	const deleteHandle = deleteHandleRef.current;

	const editHandleRef = useRef<ReturnType<
		typeof DialogPrimitive.createHandle
	> | null>(null);
	if (!editHandleRef.current)
		editHandleRef.current = DialogPrimitive.createHandle();
	const editHandle = editHandleRef.current;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger render={<Button {...props} />} />
				<DropdownMenuContent>
					<DropdownMenuGroup>
						<DropdownMenuItem onClick={() => editHandle.open(null)}>
							<PencilIcon /> {t("menu.edit")}
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => deleteHandle.open(null)}
							variant="destructive"
						>
							<TrashIcon /> {t("menu.delete")}
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
			<DeleteExpense
				expenseId={expenseId}
				handle={deleteHandle}
				reportId={reportId}
			/>
			<ReportUpdateExpense expenseId={expenseId} handle={editHandle} />
		</>
	);
}

function DeleteExpense({
	expenseId,
	reportId,
	...props
}: React.ComponentProps<typeof AlertDialog> & {
	expenseId: string;
	reportId: string;
}) {
	const t = useTranslations("modules.report.expenses");
	const tCommon = useTranslations("modules.report.common");
	const utils = api.useUtils();
	const deleteMutation = api.expense.delete.useMutation({
		onSuccess: () => {
			utils.report.financialSummary.invalidate({ id: reportId });
			utils.expense.list.invalidate({ reportId });
			props.handle?.close();
		},
		onError: (error) => {
			toast.error(t("toasts.deleteErrorTitle"), {
				description: error.message ?? tCommon("toasts.unexpectedError"),
			});
		},
	});

	return (
		<AlertDialog {...props}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
					<AlertDialogDescription>
						{t("deleteDialog.description")}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
					<AlertDialogAction
						onClick={() => deleteMutation.mutate({ id: expenseId })}
						variant={"destructive"}
					>
						<TrashIcon />
						{t("deleteDialog.confirm")}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export { ReportExpenses };
