"use client";

import type {
	ColumnFiltersState,
	ExpandedState,
	VisibilityState,
} from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getGroupedRowModel,
	getSortedRowModel,
	type RowSelectionState,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ListFilterIcon, Loader2Icon, Settings2Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataListGroupHeader } from "@/components/data/data-list";
import { DisplayOptions } from "@/components/data/display-options";
import { FilterList } from "@/components/data/filter-list";
import { FilterMenu } from "@/components/data/filter-menu";
import { List, ListItem } from "@/components/list";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { createColumns, type ExtendedReport } from "./columns";

const PAGE_SIZE = 50;
const ROW_HEIGHT = 40; // Default row height in pixels
const OVERSCAN = 5; // Number of items to render outside visible area

export function ReportsList() {
	// Fetch filter options from server (separate query, cached independently)
	const [filterOptions] = api.admin.getFilterOptions.useSuspenseQuery();

	// Infinite query for paginated reports
	const {
		data: reportsData,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = api.admin.listAllPaginated.useInfiniteQuery(
		{ limit: PAGE_SIZE },
		{
			getNextPageParam: (lastPage) => lastPage.nextCursor,
		},
	);

	// Flatten all pages into a single array
	const data = useMemo(() => {
		return reportsData?.pages.flatMap((page) => page.items) ?? [];
	}, [reportsData]);

	const totalCount = reportsData?.pages[0]?.totalCount ?? 0;

	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [grouping, setGrouping] = useState<string[]>([]);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [expanded, setExpanded] = useState<ExpandedState>(true);

	// Create columns with server-provided filter options
	const columns = useMemo(
		() =>
			createColumns({
				costUnits: filterOptions.costUnits,
				owners: filterOptions.owners,
			}),
		[filterOptions],
	);

	const table = useReactTable<ExtendedReport>({
		autoResetExpanded: false,
		autoResetPageIndex: false, // Prevent state update during render/hydration
		enableExpanding: true,
		data,
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
		groupedColumnMode: false,
		getGroupedRowModel: getGroupedRowModel(),
		getCoreRowModel: getCoreRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
	});

	const { rows } = table.getRowModel();

	// Container ref for virtualization
	const parentRef = useRef<HTMLDivElement>(null);

	// Set up virtualizer
	const virtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => ROW_HEIGHT,
		overscan: OVERSCAN,
	});

	const virtualItems = virtualizer.getVirtualItems();

	// Load more when scrolling near the bottom
	const handleScroll = useCallback(() => {
		if (!parentRef.current) return;

		const { scrollHeight, scrollTop, clientHeight } = parentRef.current;
		const scrollBottom = scrollHeight - scrollTop - clientHeight;

		// Load more when within 200px of the bottom
		if (scrollBottom < 200 && hasNextPage && !isFetchingNextPage) {
			void fetchNextPage();
		}
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	useEffect(() => {
		const element = parentRef.current;
		if (!element) return;

		element.addEventListener("scroll", handleScroll);
		return () => element.removeEventListener("scroll", handleScroll);
	}, [handleScroll]);

	return (
		<div className="flex flex-col">
			<div className="container flex flex-nowrap items-start justify-between gap-4 border-b pb-4">
				<FilterList className="grow" table={table}>
					<FilterMenu
						className={"group/filter-menu data-[filtered=true]:size-6"}
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
				<div className="flex items-center gap-2">
					<span className="text-muted-foreground text-sm">
						{rows.length} / {totalCount}
					</span>
					<DisplayOptions
						className={"shrink-0"}
						display={table}
						size={"sm"}
						variant={"outline"}
					>
						<Settings2Icon /> Display
					</DisplayOptions>
				</div>
			</div>
			<div className="max-h-[calc(100vh-200px)] overflow-auto" ref={parentRef}>
				<List
					style={{
						height: `${virtualizer.getTotalSize()}px`,
						position: "relative",
					}}
				>
					{virtualItems.map((virtualRow) => {
						const row = rows[virtualRow.index];
						if (!row) return null;

						if (row.getIsGrouped()) {
							return (
								<DataListGroupHeader
									className="first:border-t-0"
									display={table}
									key={row.id}
									row={row}
									style={{
										position: "absolute",
										top: 0,
										left: 0,
										width: "100%",
										height: `${virtualRow.size}px`,
										transform: `translateY(${virtualRow.start}px)`,
									}}
								/>
							);
						}
						return (
							<ListItem
								key={row.id}
								{...(row.getIsSelected() ? { "data-selected": true } : {})}
								className="relative pr-8"
								style={{
									position: "absolute",
									top: 0,
									left: 0,
									width: "100%",
									height: `${virtualRow.size}px`,
									transform: `translateY(${virtualRow.start}px)`,
								}}
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
				{isFetchingNextPage && (
					<div className="flex items-center justify-center py-4">
						<Loader2Icon className="size-6 animate-spin text-muted-foreground" />
					</div>
				)}
			</div>
		</div>
	);
}
