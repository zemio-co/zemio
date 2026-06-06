"use client";

import {
	type ColumnFiltersState,
	type ExpandedState,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getGroupedRowModel,
	type RowSelectionState,
	type SortingState,
	type Updater,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import type { ReportStatus } from "@zemio/db";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { DataListGroupHeader } from "@/components/data/data-list";
import {
	isDateRangeFilter,
	isMultiSelectFilter,
} from "@/components/data/filter-types";
import { List, ListItem } from "@/components/list";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { createColumns } from "./reports-list-columns";
import { ReportsListEmpty, ReportsListNoResults } from "./reports-list-empty";
import { ReportsListHeader } from "./reports-list-header";
import { ReportsListSkeleton } from "./reports-list-skeleton";
import type { ListReport } from "./types";

const PAGE_SIZE = 20;

const SERVER_SORT_FIELDS = [
	"createdAt",
	"lastUpdatedAt",
	"status",
	"tag",
	"title",
] as const;

type ServerSortField = (typeof SERVER_SORT_FIELDS)[number];

function isServerSortField(id: string): id is ServerSortField {
	return (SERVER_SORT_FIELDS as readonly string[]).includes(id);
}

function buildReportListSorting(
	sortingState: SortingState,
): Array<{ id: ServerSortField; desc: boolean }> | undefined {
	const sort = sortingState[0];
	if (!sort || !isServerSortField(sort.id)) return undefined;
	return [{ id: sort.id, desc: sort.desc }];
}

const REPORT_STATUSES = [
	"DRAFT",
	"PENDING_APPROVAL",
	"NEEDS_REVISION",
	"ACCEPTED",
	"REJECTED",
] as const satisfies readonly ReportStatus[];

function isReportStatusArray(values: unknown[]): values is ReportStatus[] {
	return values.every(
		(v) =>
			typeof v === "string" && (REPORT_STATUSES as readonly string[]).includes(v),
	);
}

type ReportListFilterRule =
	| { field: "status"; op: "in" | "notIn"; value: ReportStatus[] }
	| { field: "costUnitId"; op: "in" | "notIn"; value: string[] }
	| { field: "createdAt"; op: "between"; value: { start: Date; end: Date } };

type ReportListFilters = {
	logic: "and";
	rules: ReportListFilterRule[];
};

function buildReportListFilters(
	columnFilters: ColumnFiltersState,
): ReportListFilters | undefined {
	const rules: ReportListFilterRule[] = [];

	for (const filter of columnFilters) {
		if (
			filter.id === "status" &&
			isMultiSelectFilter(filter.value) &&
			isReportStatusArray(filter.value.value)
		) {
			rules.push({
				field: "status",
				op: filter.value.operator === "in" ? "in" : "notIn",
				value: filter.value.value,
			});
		}

		if (
			filter.id === "costUnit" &&
			isMultiSelectFilter(filter.value) &&
			filter.value.value.length > 0
		) {
			rules.push({
				field: "costUnitId",
				op: filter.value.operator === "in" ? "in" : "notIn",
				value: filter.value.value,
			});
		}

		if (filter.id === "createdAt" && isDateRangeFilter(filter.value)) {
			rules.push({
				field: "createdAt",
				op: "between",
				value: { end: filter.value.end, start: filter.value.start },
			});
		}
	}

	if (rules.length === 0) return undefined;

	return { logic: "and", rules };
}

function ReportsList({ className, ...props }: React.ComponentProps<"div">) {
	const [page, setPage] = useState<number>(1);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [grouping, setGrouping] = useState<string[]>([]);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [expanded, setExpanded] = useState<ExpandedState>(true);

	const costUnitsQuery = api.costUnit.listCostUnits.useQuery({
		pageSize: 200,
	});

	const costUnitOptions = useMemo(
		() =>
			(costUnitsQuery.data?.items ?? []).map((cu) => ({
				label: cu.tag,
				value: cu.id,
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

	const queryFilters = useMemo(
		() => buildReportListFilters(columnFilters),
		[columnFilters],
	);

	const querySorting = useMemo(() => buildReportListSorting(sorting), [sorting]);

	const reportsQuery = api.report.listOwn.useQuery(
		{
			filters: queryFilters,
			page,
			pageSize: PAGE_SIZE,
			sorting: querySorting,
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
		manualFiltering: true,
		manualSorting: true,
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
		onColumnFiltersChange: (updater: Updater<ColumnFiltersState>) => {
			const next =
				typeof updater === "function" ? updater(columnFilters) : updater;
			setColumnFilters(next);
			setPage(1);
		},
		onExpandedChange: setExpanded,
		onRowSelectionChange: setRowSelection,
		onGroupingChange: setGrouping,
		onSortingChange: (updater: Updater<SortingState>) => {
			const next = typeof updater === "function" ? updater(sorting) : updater;
			setSorting(next);
			setPage(1);
		},
		onColumnVisibilityChange: setColumnVisibility,
		getGroupedRowModel: getGroupedRowModel(),
		getCoreRowModel: getCoreRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
	});

	const rows = table.getRowModel().rows;

	return (
		<div className={cn("", className)} data-slot="reports-list" {...props}>
			<ReportsListHeader table={table} />

			<div
				className="transition-opacity data-[fetching=true]:opacity-50"
				data-fetching={reportsQuery.isFetching}
			>
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
			</div>

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
