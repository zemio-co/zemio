"use client";

import { keepPreviousData } from "@tanstack/react-query";
import type {
	ColumnFiltersState,
	RowSelectionState,
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
	Avatar,
	AvatarFallback,
	AvatarImage,
	Button,
	Grid,
	GridBody,
	GridCell,
	GridFooter,
	GridHead,
	GridHeader,
	GridRow,
	getPinningStyles,
} from "@zemio/ui";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type React from "react";
import { useMemo, useState } from "react";
import { COST_UNIT_COLORS } from "@/lib/colors/cost-units";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { ADMIN_REPORTS_PAGE_SIZE } from "../lib/constants";
import { createAdminReportsColumns } from "../lib/create-columns";
import { buildReportGridFilters } from "../lib/grid-filters";
import { buildReportGridSorting } from "../lib/grid-sorting";
import type { AdminReport } from "../lib/types";
import { AdminReportsGridToolbar } from "./admin-reports-grid-toolbar";

function AdminReportsGrid({
	className,
	...props
}: React.ComponentProps<"div">) {
	// translations
	const t = useTranslations("modules.admin.grid");
	const tColumns = useTranslations("modules.admin.columns");

	// grid state
	const [page, setPage] = useState<number>(1);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

	// queries
	const [filterOptions] = api.reportFilters.options.useSuspenseQuery();

	const queryFilters = useMemo(
		() => buildReportGridFilters(columnFilters),
		[columnFilters],
	);
	const querySorting = useMemo(() => buildReportGridSorting(sorting), [sorting]);

	const reportsQuery = api.report.list.useQuery(
		{
			scope: "all",
			filters: queryFilters,
			page,
			pageSize: ADMIN_REPORTS_PAGE_SIZE,
			sorting: querySorting,
		},
		{ placeholderData: keepPreviousData },
	);

	const { data } = reportsQuery;

	// grid
	const columns = useMemo(
		() =>
			createAdminReportsColumns({
				t: tColumns,
				costUnitOptions: filterOptions.costUnits.map((option) => ({
					...option,
					render: (costUnit) => (
						<span className="flex items-center gap-1.5 truncate whitespace-nowrap">
							<span
								className="block size-2 shrink-0 rounded-xs"
								style={{ backgroundColor: COST_UNIT_COLORS[option.color].fill }}
							/>

							<span className="text-muted-foreground">{costUnit.tag}</span>
							<span className="font-medium">{costUnit.title}</span>
						</span>
					),
					// `label` is the cost unit tag, so only the title has to be added
					// to make the option searchable by tag *and* title.
					searchValue: option.data.title,
				})),
				ownerOptions: filterOptions.owners.map((option) => ({
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
					// `label` is the owner name, so only the email has to be added.
					searchValue: option.data.email,
				})),
			}),
		[filterOptions, tColumns],
	);

	const grid = useReactTable<AdminReport>({
		autoResetPageIndex: false,
		manualFiltering: true,
		manualSorting: true,
		data: data?.reports ?? [],
		columns,
		state: {
			columnFilters,
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
		onRowSelectionChange: setRowSelection,
		onSortingChange: (updater: Updater<SortingState>) => {
			const next = typeof updater === "function" ? updater(sorting) : updater;
			setSorting(next);
			setPage(1);
		},
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
	});

	const visibleColumnCount = grid.getVisibleFlatColumns().length;

	return (
		<div className={className} data-slot="admin-reports-grid" {...props}>
			<AdminReportsGridToolbar className="container" table={grid} />
			<Grid
				className={cn("border-t data-[loading=true]:opacity-50")}
				data-loading={reportsQuery.isFetching}
			>
				<GridHeader>
					{grid.getHeaderGroups().map((group) => (
						<GridRow className="border-b" key={group.id}>
							{group.headers.map((header) => {
								return (
									<GridHead
										className="p-0"
										key={header.id}
										style={{ ...getPinningStyles(header.column) }}
									>
										{header.isPlaceholder
											? null
											: flexRender(header.column.columnDef.header, header.getContext())}
									</GridHead>
								);
							})}
						</GridRow>
					))}
				</GridHeader>
				<GridBody>
					{grid.getRowModel().rows?.length ? (
						grid.getRowModel().rows.map((row) => (
							<GridRow className="group/row" key={row.id}>
								{row.getVisibleCells().map((cell) => (
									<GridCell key={cell.id} style={{ ...getPinningStyles(cell.column) }}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</GridCell>
								))}
							</GridRow>
						))
					) : (
						<GridRow>
							<GridCell className="h-24 text-center" colSpan={visibleColumnCount}>
								{t("noResults")}
							</GridCell>
						</GridRow>
					)}
				</GridBody>
				<GridFooter>
					<GridRow>
						<GridCell colSpan={visibleColumnCount}>
							{/* The first render has no server response yet — there is no
							    meaningful page count to show or paginate against. */}
							{data === undefined ? null : (
								<div className="flex flex-wrap justify-between gap-4 border-slate-200">
									<span className="text-slate-500 text-sm">
										{t("reportsCount", { count: data.pagination.totalCount })}
									</span>
									<div className="flex items-center justify-center gap-2">
										<span className="me-2 text-slate-500 text-sm">
											{t("pageIndicator", {
												current: page,
												total: data.pagination.pageCount,
											})}
										</span>
										<Button
											disabled={page <= 1}
											onClick={() => setPage((current) => current - 1)}
											size={"icon-sm"}
											variant={"outline"}
										>
											<ChevronLeftIcon />
										</Button>
										<Button
											disabled={page >= data.pagination.pageCount}
											onClick={() => setPage((current) => current + 1)}
											size={"icon-sm"}
											variant={"outline"}
										>
											<ChevronRightIcon />
										</Button>
									</div>
								</div>
							)}
						</GridCell>
					</GridRow>
				</GridFooter>
			</Grid>
		</div>
	);
}

export { AdminReportsGrid };
