"use client";

import {
	type ColumnFiltersState,
	type ExpandedState,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getGroupedRowModel,
	getSortedRowModel,
	type RowSelectionState,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { DataListGroupHeader } from "@/components/data/data-list";
import { List, ListItem } from "@/components/list";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { createColumns } from "./reports-list-columns";
import { ReportsListEmpty, ReportsListNoResults } from "./reports-list-empty";
import { ReportsListHeader } from "./reports-list-header";
import { ReportsListSkeleton } from "./reports-list-skeleton";
import type { ListReport } from "./types";

const _PAGE_SIZE = 20;

function ReportsList({ className, ...props }: React.ComponentProps<"div">) {
	const [page, setPage] = useState<number>(1);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [grouping, setGrouping] = useState<string[]>([]);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [expanded, setExpanded] = useState<ExpandedState>(true);

	const costUnitsQuery = api.costUnit.listCostUnits.useQuery({
		pageSize: 50,
	});

	const costUnitOptions = useMemo(
		() =>
			(costUnitsQuery.data?.items ?? []).map((cu) => ({
				label: cu.tag,
				value: cu.tag,
			})),
		[costUnitsQuery.data],
	);

	const columns = useMemo(
		() =>
			createColumns({
				costUnits: costUnitOptions,
				owners: [],
			}),
		[costUnitOptions],
	);

	const reportsQuery = api.report.listOwn.useQuery(
		{
			page,
			pageSize: _PAGE_SIZE,
		},
		{
			placeholderData: (previousData) => previousData,
		},
	);

	const table = useReactTable<ListReport>({
		autoResetExpanded: false,
		autoResetPageIndex: false, // Prevent state update during render/hydration
		enableExpanding: true,
		groupedColumnMode: false,
		data: reportsQuery.data?.reports ?? [],
		columns,
		state: {
			columnFilters,
			grouping,
			expanded,
			sorting,
			rowSelection,
			columnVisibility,
		},
		onColumnFiltersChange: setColumnFilters,
		onExpandedChange: setExpanded,
		onRowSelectionChange: setRowSelection,
		onGroupingChange: setGrouping,
		onSortingChange: setSorting,
		onColumnVisibilityChange: setColumnVisibility,
		getGroupedRowModel: getGroupedRowModel(),
		getCoreRowModel: getCoreRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
	});

	const rows = table.getRowModel().rows;

	return (
		<div className={cn("", className)} data-slot="reports-list" {...props}>
			<ReportsListHeader table={table} />

			{reportsQuery.isPending && <ReportsListSkeleton />}

			{!reportsQuery.isPending &&
				reportsQuery.data?.reports.length === 0 &&
				columnFilters.length === 0 && <ReportsListEmpty className="mt-32" />}
			{!reportsQuery.isPending &&
				rows.length === 0 &&
				columnFilters.length > 0 && (
					<ReportsListNoResults
						className="mt-32"
						onClearFilters={() => setColumnFilters([])}
					/>
				)}

			{!reportsQuery.isPending && (
				<List>
					{rows.map((row) => {
						if (row.getIsGrouped()) {
							return (
								<DataListGroupHeader
									className="first:border-t-0"
									display={table}
									key={row.id}
									row={row}
								/>
							);
						}
						return (
							<ListItem
								key={row.id}
								{...(row.getIsSelected() ? { "data-selected": true } : {})}
								className="relative pr-8"
							>
								{row.getVisibleCells().map((cell) => (
									<div
										className={cn(
											"has-data-spacer:grow",
											cell.column.columnDef.meta?.hideOnMobile
												? "hidden sm:block"
												: "block",
										)}
										key={cell.id}
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</div>
								))}
							</ListItem>
						);
					})}
				</List>
			)}

			{reportsQuery.data && reportsQuery.data.pagination.pageCount > 1 && (
				<div className="container flex max-w-none items-center justify-end gap-2 py-4">
					<span className="text-xs text-zinc-500">
						Seite {page} von {reportsQuery.data.pagination.pageCount}
					</span>
					<Button
						disabled={page <= 1}
						onClick={() => setPage((p) => p - 1)}
						size="icon-sm"
						variant="outline"
					>
						<ChevronLeftIcon />
					</Button>
					<Button
						disabled={page >= reportsQuery.data.pagination.pageCount}
						onClick={() => setPage((p) => p + 1)}
						size="icon-sm"
						variant="outline"
					>
						<ChevronRightIcon />
					</Button>
				</div>
			)}
		</div>
	);
}

export { ReportsList };
