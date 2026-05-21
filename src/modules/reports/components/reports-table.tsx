"use client";

import type {
	ColumnFiltersState,
	PaginationState,
	SortingState,
	Updater,
	VisibilityState,
} from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	ListFilterIcon,
} from "lucide-react";
import { parseAsInteger, parseAsJson, useQueryStates } from "nuqs";
import { useMemo } from "react";
import { DisplayOptions } from "@/components/data/display-options";
import { FilterList } from "@/components/data/filter-list";
import { FilterMenu } from "@/components/data/filter-menu";
import {
	isDateRangeFilter,
	isSelectFilter,
} from "@/components/data/filter-types";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { columns } from "./reports-table-columns";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS: number[] = [10, 20, 50];
const REPORT_STATUSES = [
	"DRAFT",
	"PENDING_APPROVAL",
	"NEEDS_REVISION",
	"ACCEPTED",
	"REJECTED",
] as const;
const SORTABLE_COLUMN_IDS = [
	"createdAt",
	"lastUpdatedAt",
	"status",
	"tag",
	"title",
] as const;
const FILTERABLE_COLUMN_IDS = ["createdAt", "status"] as const;
const SKELETON_ROW_IDS = [
	"skeleton-row-1",
	"skeleton-row-2",
	"skeleton-row-3",
	"skeleton-row-4",
	"skeleton-row-5",
] as const;

type ReportStatus = (typeof REPORT_STATUSES)[number];
type SortableColumnId = (typeof SORTABLE_COLUMN_IDS)[number];
type FilterableColumnId = (typeof FILTERABLE_COLUMN_IDS)[number];
type ReportListSorting = {
	desc: boolean;
	id: SortableColumnId;
}[];
type ReportListFilters = {
	createdAt?: {
		end: Date;
		start: Date;
	};
	status?: {
		operator: "is" | "is-not";
		value: ReportStatus;
	};
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isReportStatus(value: unknown): value is ReportStatus {
	return (
		typeof value === "string" &&
		REPORT_STATUSES.some((status) => status === value)
	);
}

function isSortableColumnId(value: unknown): value is SortableColumnId {
	return (
		typeof value === "string" &&
		SORTABLE_COLUMN_IDS.some((columnId) => columnId === value)
	);
}

function isFilterableColumnId(value: unknown): value is FilterableColumnId {
	return (
		typeof value === "string" &&
		FILTERABLE_COLUMN_IDS.some((columnId) => columnId === value)
	);
}

function parseDate(value: unknown): Date | null {
	if (typeof value !== "string") return null;

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;

	return date;
}

function parseColumnFilters(value: unknown): ColumnFiltersState | null {
	if (!Array.isArray(value)) return null;

	const filters: ColumnFiltersState = [];

	for (const item of value) {
		if (!isRecord(item) || !isFilterableColumnId(item.id)) {
			return null;
		}

		if (item.id === "status") {
			const filterValue = item.value;
			if (!isRecord(filterValue)) return null;

			const operator = filterValue.operator;
			if (operator !== "is" && operator !== "is-not") return null;
			if (!isReportStatus(filterValue.value)) return null;

			filters.push({
				id: item.id,
				value: {
					filterType: "select",
					operator,
					value: filterValue.value,
				},
			});
			continue;
		}

		const filterValue = item.value;
		if (!isRecord(filterValue)) return null;

		const start = parseDate(filterValue.start);
		const end = parseDate(filterValue.end);
		if (!start || !end || typeof filterValue.label !== "string") return null;

		filters.push({
			id: item.id,
			value: {
				end,
				filterType: "date-range",
				label: filterValue.label,
				start,
			},
		});
	}

	return filters;
}

function parseSortingState(value: unknown): ReportListSorting | null {
	if (!Array.isArray(value)) return null;

	const sorting: ReportListSorting = [];

	for (const item of value) {
		if (!isRecord(item) || !isSortableColumnId(item.id)) return null;
		if (typeof item.desc !== "boolean") return null;

		sorting.push({
			desc: item.desc,
			id: item.id,
		});
	}

	return sorting.slice(0, 1);
}

function parseColumnVisibility(value: unknown): VisibilityState | null {
	if (!isRecord(value)) return null;

	const visibility: VisibilityState = {};

	for (const [columnId, isVisible] of Object.entries(value)) {
		if (typeof isVisible !== "boolean") return null;
		visibility[columnId] = isVisible;
	}

	return visibility;
}

function isUpdaterFunction<TValue>(
	updater: Updater<TValue>,
): updater is (oldValue: TValue) => TValue {
	return typeof updater === "function";
}

function resolveUpdater<TValue>(
	updater: Updater<TValue>,
	currentValue: TValue,
): TValue {
	if (isUpdaterFunction(updater)) {
		return updater(currentValue);
	}

	return updater;
}

function normalizePageSize(pageSize: number): number {
	return PAGE_SIZE_OPTIONS.includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE;
}

function buildReportListFilters(
	columnFilters: ColumnFiltersState,
): ReportListFilters | undefined {
	const filters: ReportListFilters = {};

	for (const filter of columnFilters) {
		if (filter.id === "createdAt" && isDateRangeFilter(filter.value)) {
			filters.createdAt = {
				end: filter.value.end,
				start: filter.value.start,
			};
		}

		if (
			filter.id === "status" &&
			isSelectFilter(filter.value) &&
			isReportStatus(filter.value.value)
		) {
			filters.status = {
				operator: filter.value.operator,
				value: filter.value.value,
			};
		}
	}

	if (!filters.createdAt && !filters.status) {
		return undefined;
	}

	return filters;
}

function sanitizeSortingState(sorting: SortingState): ReportListSorting {
	const sort = sorting[0];
	if (!sort || !isSortableColumnId(sort.id)) {
		return [];
	}

	return [{ desc: sort.desc, id: sort.id }];
}

const queryStateParsers = {
	columns: parseAsJson(parseColumnVisibility).withDefault({}),
	filters: parseAsJson(parseColumnFilters).withDefault([]),
	page: parseAsInteger.withDefault(DEFAULT_PAGE),
	pageSize: parseAsInteger.withDefault(DEFAULT_PAGE_SIZE),
	sorting: parseAsJson(parseSortingState).withDefault([]),
};

function ReportsTable({ className, ...props }: React.ComponentProps<"div">) {
	const [queryState, setQueryState] = useQueryStates(queryStateParsers);
	const page = Math.max(queryState.page, DEFAULT_PAGE);
	const pageSize = normalizePageSize(queryState.pageSize);
	const queryFilters = useMemo(
		() => buildReportListFilters(queryState.filters),
		[queryState.filters],
	);

	const reportsQuery = api.report.listOwn.useQuery(
		{
			filters: queryFilters,
			limit: pageSize + 1,
			page,
			pageSize,
			sorting: queryState.sorting,
		},
		{
			placeholderData: (previousData) => previousData,
		},
	);

	const table = useReactTable({
		autoResetPageIndex: false,
		columns,
		data: reportsQuery.data ?? [],
		manualFiltering: true,
		manualPagination: true,
		manualSorting: true,
		onColumnFiltersChange: (updater) => {
			const filters = resolveUpdater(updater, queryState.filters);
			void setQueryState({ filters, page: DEFAULT_PAGE });
		},
		onColumnVisibilityChange: (updater) => {
			const nextColumns = resolveUpdater(updater, queryState.columns);
			void setQueryState({ columns: nextColumns });
		},
		onPaginationChange: (updater: Updater<PaginationState>) => {
			const pagination = resolveUpdater(updater, {
				pageIndex: page - 1,
				pageSize,
			});
			void setQueryState({
				page: pagination.pageIndex + 1,
				pageSize: normalizePageSize(pagination.pageSize),
			});
		},
		onSortingChange: (updater: Updater<SortingState>) => {
			const sorting = sanitizeSortingState(
				resolveUpdater(updater, queryState.sorting),
			);
			void setQueryState({ page: DEFAULT_PAGE, sorting });
		},
		pageCount: -1,
		state: {
			columnFilters: queryState.filters,
			columnVisibility: queryState.columns,
			pagination: {
				pageIndex: page - 1,
				pageSize,
			},
			sorting: queryState.sorting,
		},
		getCoreRowModel: getCoreRowModel(),
	});

	const rows = table.getRowModel().rows;
	const visibleRows = rows.slice(0, pageSize);
	const hasRows = rows.length > 0;
	const canGoNext = rows.length > pageSize;
	const isInitialLoading = reportsQuery.isPending && !reportsQuery.data;

	return (
		<div
			className={cn("space-y-4", className)}
			data-slot="reports-table"
			{...props}
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<FilterList className="grow" table={table}>
					<FilterMenu
						className="group/filter-menu data-[filtered=true]:size-6"
						size="xs"
						table={table}
						variant="outline"
					>
						<ListFilterIcon />
						<span className="group-data-[filtered=true]/filter-menu:hidden">
							Filter
						</span>
					</FilterMenu>
				</FilterList>
				<DisplayOptions
					className="shrink-0"
					display={table}
					grouping={false}
					size="sm"
					variant="outline"
				>
					Ansicht
				</DisplayOptions>
			</div>

			<div
				className={cn(
					"overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-zinc-700/15",
					reportsQuery.isFetching && "opacity-70",
				)}
			>
				<table className="w-full min-w-[760px] table-fixed">
					<thead>
						{table.getHeaderGroups().map((headerGroup) => (
							<tr className="bg-zinc-100" key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<th
										className={cn(
											"px-3 py-2 text-left font-medium text-muted-foreground text-xs",
											header.column.columnDef.meta?.hideOnMobile && "hidden sm:table-cell",
										)}
										key={header.id}
									>
										{header.isPlaceholder
											? null
											: flexRender(header.column.columnDef.header, header.getContext())}
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody>
						{isInitialLoading &&
							SKELETON_ROW_IDS.map((rowId) => (
								<tr key={rowId}>
									<td className="p-3" colSpan={table.getAllLeafColumns().length}>
										<Skeleton className="h-6 w-full" />
									</td>
								</tr>
							))}

						{reportsQuery.error && (
							<tr>
								<td
									className="px-6 py-10 text-center text-destructive text-sm"
									colSpan={table.getAllLeafColumns().length}
								>
									Reports konnten nicht geladen werden.
								</td>
							</tr>
						)}

						{!isInitialLoading && !reportsQuery.error && !hasRows && (
							<tr>
								<td
									className="px-6 py-10 text-center text-muted-foreground text-sm"
									colSpan={table.getAllLeafColumns().length}
								>
									Keine Reports gefunden.
								</td>
							</tr>
						)}

						{visibleRows.map((row) => (
							<tr
								className="border-t transition-colors hover:bg-muted/50"
								key={row.id}
							>
								{row.getVisibleCells().map((cell) => (
									<td
										className={cn(
											"px-3 py-3 align-middle text-sm",
											cell.column.columnDef.meta?.hideOnMobile && "hidden sm:table-cell",
										)}
										key={cell.id}
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<div className="flex items-center justify-between gap-3">
				<Select
					itemToStringLabel={(value) => `${value} Einträge`}
					onValueChange={(value) =>
						void setQueryState({
							page: DEFAULT_PAGE,
							pageSize: normalizePageSize(Number(value)),
						})
					}
					value={String(pageSize)}
				>
					<SelectTrigger className="w-32">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{PAGE_SIZE_OPTIONS.map((size) => (
								<SelectItem key={size} value={String(size)}>
									{size} Einträge
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>

				<div className="flex items-center gap-1">
					<span className="me-2 text-muted-foreground text-xs">Seite {page}</span>
					<Button
						disabled={page <= DEFAULT_PAGE || reportsQuery.isFetching}
						onClick={() => void setQueryState({ page: page - 1 })}
						size="icon-sm"
						variant="ghost"
					>
						<ChevronLeftIcon />
					</Button>
					<Button
						disabled={!canGoNext || reportsQuery.isFetching}
						onClick={() => void setQueryState({ page: page + 1 })}
						size="icon-sm"
						variant="ghost"
					>
						<ChevronRightIcon />
					</Button>
				</div>
			</div>
		</div>
	);
}

export { ReportsTable };
