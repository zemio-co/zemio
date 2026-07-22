"use client";

import type {
	ColumnFiltersState,
	ExpandedState,
	RowSelectionState,
	SortingState,
	Updater,
	VisibilityState,
} from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getGroupedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import type { ReportStatus } from "@zemio/db";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	ListFilterIcon,
	Settings2Icon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DataListGroupHeader } from "@/components/data/data-list";
import { DisplayOptions } from "@/components/data/display-options";
import { FilterList } from "@/components/data/filter-list";
import { FilterMenu } from "@/components/data/filter-menu";
import {
	isDateRangeFilter,
	isMultiSelectFilter,
	isSelectFilter,
} from "@/components/data/filter-types";
import { List, ListItem } from "@/components/list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { createColumns, type ExtendedReport } from "./columns";

const PAGE_SIZE = 50;

const DEFAULT_STATUS_FILTER: ColumnFiltersState = [
	{
		id: "status",
		value: {
			filterType: "multiselect",
			operator: "in",
			value: ["PENDING_APPROVAL", "ACCEPTED"] satisfies ReportStatus[],
		},
	},
];

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

type AdminFilterRule =
	| { field: "status"; op: "in" | "notIn"; value: ReportStatus[] }
	| { field: "ownerId"; op: "is" | "isNot"; value: string }
	| { field: "costUnitId"; op: "in" | "notIn"; value: string[] }
	| { field: "createdAt"; op: "between"; value: { start: Date; end: Date } };

type AdminFilters = { logic: "and"; rules: AdminFilterRule[] };

function buildReportListFilters(
	columnFilters: ColumnFiltersState,
): AdminFilters | undefined {
	const rules: AdminFilterRule[] = [];

	for (const filter of columnFilters) {
		if (
			filter.id === "status" &&
			isMultiSelectFilter(filter.value) &&
			filter.value.value.length > 0
		) {
			rules.push({
				field: "status",
				op: filter.value.operator === "in" ? "in" : "notIn",
				value: filter.value.value as ReportStatus[],
			});
		}

		if (filter.id === "owner" && isSelectFilter(filter.value)) {
			rules.push({
				field: "ownerId",
				op: filter.value.operator === "is" ? "is" : "isNot",
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

export function ReportsList() {
	const [page, setPage] = useState<number>(1);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
		DEFAULT_STATUS_FILTER,
	);
	const [grouping, setGrouping] = useState<string[]>([]);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [expanded, setExpanded] = useState<ExpandedState>(true);

	const [filterOptions] = api.reportFilters.options.useSuspenseQuery();

	const queryFilters = useMemo(
		() => buildReportListFilters(columnFilters),
		[columnFilters],
	);
	const querySorting = useMemo(() => buildReportListSorting(sorting), [sorting]);

	const reportsQuery = api.report.list.useQuery(
		{
			scope: "all",
			filters: queryFilters,
			page,
			pageSize: PAGE_SIZE,
			sorting: querySorting,
		},
		{ placeholderData: (previousData) => previousData },
	);

	const columns = useMemo(
		() =>
			createColumns({
				costUnits: filterOptions.costUnits.map((option) => ({
					...option,
					render: (costUnit) => (
						<span className="flex items-center gap-1.5 truncate whitespace-nowrap">
							<span className="text-muted-foreground">{costUnit.tag}</span>
							<span className="font-medium">{costUnit.title}</span>
						</span>
					),
					searchValue: option.data.title,
				})),
				owners: filterOptions.owners.map((option) => ({
					...option,
					render: (owner) => (
						<span className="flex items-center gap-2">
							<Avatar className="size-5">
								<AvatarImage src={owner.image ?? undefined} />
								<AvatarFallback>{owner.name.charAt(0)}</AvatarFallback>
							</Avatar>
							<span>{owner.name}</span>
						</span>
					),
				})),
			}),
		[filterOptions],
	);

	const table = useReactTable<ExtendedReport>({
		autoResetExpanded: false,
		autoResetPageIndex: false,
		enableExpanding: true,
		manualFiltering: true,
		manualSorting: true,
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
	const pageCount = reportsQuery.data?.pagination.pageCount ?? 0;

	return (
		<div className="flex flex-col">
			<div className="container flex flex-nowrap items-start justify-between gap-4 border-b pb-4">
				<FilterList className="grow" table={table}>
					<FilterMenu
						className={"group/filter-menu data-[filtered=true]:size-6"}
						disableAnimation
						size={"xs"}
						table={table}
						variant={"outline"}
					>
						<ListFilterIcon />
						<span className="group-data-[filtered=true]/filter-menu:hidden">
							Filter
						</span>
					</FilterMenu>
				</FilterList>
				<DisplayOptions
					className={"shrink-0"}
					disableAnimation
					display={table}
					size={"sm"}
					variant={"outline"}
				>
					<Settings2Icon /> Display
				</DisplayOptions>
			</div>

			<div
				className="transition-opacity data-[fetching=true]:opacity-50"
				data-fetching={reportsQuery.isFetching}
			>
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
			</div>

			{pageCount > 1 && (
				<div className="container flex max-w-none items-center justify-end gap-2 py-4">
					<span className="text-xs text-zinc-500">
						Seite {page} von {pageCount}
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
						disabled={page >= pageCount}
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
