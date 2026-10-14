"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react";
import { keepPreviousData } from "@tanstack/react-query";
import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	type PaginationState,
	type SortingState,
	type Table as TanstackTable,
	type Updater,
	useReactTable,
} from "@tanstack/react-table";
import type { CostUnitStatus } from "@zemio/db";
import {
	Badge,
	Button,
	DataGridColumnHeader,
	Grid,
	GridBody,
	GridCell,
	GridFooter,
	GridHead,
	GridHeader,
	GridRow,
	getPinningStyles,
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@zemio/ui";
import { format } from "date-fns";
import {
	CalendarPlusIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	CircleIcon,
	EllipsisIcon,
	ListFilterIcon,
	ListIcon,
	LoaderIcon,
	SearchIcon,
	TagIcon,
	TextIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsString, useQueryState } from "nuqs";
import React from "react";
import { toast } from "sonner";
import { FilterList } from "@/components/data/filter-list";
import { FilterMenu } from "@/components/data/filter-menu";
import {
	type FilterOption,
	isMultiSelectFilter,
} from "@/components/data/filter-types";
import { COST_UNIT_COLORS } from "@/lib/colors/cost-units";
import {
	COST_UNIT_SORT_FIELDS,
	COST_UNIT_STATUSES,
	COST_UNITS_PAGE_SIZE,
	type CostUnitSortField,
	NO_COST_UNIT_GROUP,
} from "@/lib/consts";
import { cn } from "@/lib/utils";
import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";
import { SettingsSubtitle, SettingsTitle } from "../settings-typography";
import {
	type CreateCostUnitHandle,
	CreateCostUnitSheet,
	CreateCostUnitSheetTrigger,
	createCostUnitCreateHandle,
} from "./create-cost-unit";
import {
	CreateCostUnitGroupSheet,
	CreateCostUnitGroupSheetTrigger,
} from "./create-cost-unit-group";
import {
	createCostUnitUpdateHandle,
	type UpdateCostUnitHandle,
	UpdateCostUnitSheet,
} from "./update-cost-unit";

function OrgSettingsCostUnits({
	className,
	...props
}: React.ComponentProps<"main">) {
	const t = useTranslations("modules.settings.costUnits");

	return (
		<main
			className={cn("py-16", className)}
			data-slot="org-settings-cost-units"
			{...props}
		>
			<div className="container flex max-w-4xl flex-wrap items-start justify-between gap-6">
				<div className="space-y-1">
					<SettingsTitle>{t("title")}</SettingsTitle>
					<SettingsSubtitle>{t("description")}</SettingsSubtitle>
				</div>
				<OrgSettingsCostUnitsActions className="flex items-center justify-center gap-4" />
			</div>
			<div className="mt-12 max-w-full">
				<CostUnitsGrid />
			</div>
		</main>
	);
}

function OrgSettingsCostUnitsActions({
	className,
	...props
}: React.ComponentProps<"div">) {
	const t = useTranslations("modules.settings.costUnits");
	const createHandleRef = React.useRef<CreateCostUnitHandle | null>(null);
	if (!createHandleRef.current)
		createHandleRef.current = createCostUnitCreateHandle();
	const createHandle = createHandleRef.current;

	const createGroupHandleRef = React.useRef<CreateCostUnitHandle | null>(null);
	if (!createGroupHandleRef.current)
		createGroupHandleRef.current = createCostUnitCreateHandle();
	const createGroupHandle = createGroupHandleRef.current;

	return (
		<>
			<div
				className={cn("", className)}
				data-slot="org-settings-cost-units-actions"
				{...props}
			>
				<CreateCostUnitGroupSheetTrigger
					handle={createGroupHandle}
					variant={"outline"}
				>
					{t("newGroupButton")}
				</CreateCostUnitGroupSheetTrigger>
				<CreateCostUnitSheetTrigger handle={createHandle}>
					{t("newCostUnitButton")}
				</CreateCostUnitSheetTrigger>
			</div>
			<CreateCostUnitSheet handle={createHandle} />
			<CreateCostUnitGroupSheet closeOnSuccess handle={createGroupHandle} />
		</>
	);
}

// ========= COST UNITS GRID =============================================

const SEARCH_DEBOUNCE_MS = 300;

type CostUnitListInput = RouterInputs["costUnit"]["list"];
type CostUnitListFilters = NonNullable<CostUnitListInput["filters"]>;
type CostUnitListSorting = NonNullable<CostUnitListInput["sorting"]>;

/** Row shape, derived from the endpoint rather than restated by hand. */
type FetchedCostUnit = RouterOutputs["costUnit"]["list"]["costUnits"][number];

/** Translator for this component's namespace — keeps message keys type-checked. */
type CostUnitsTranslator = ReturnType<
	typeof useTranslations<"modules.settings.costUnits">
>;

function isCostUnitSortField(id: string): id is CostUnitSortField {
	return (COST_UNIT_SORT_FIELDS as readonly string[]).includes(id);
}

function isCostUnitStatusArray(values: string[]): values is CostUnitStatus[] {
	return values.every((value) =>
		(COST_UNIT_STATUSES as readonly string[]).includes(value),
	);
}

/**
 * Translates the table's column filters into the list endpoint's rule set.
 *
 * The guards below are unreachable by construction — `status` values come from
 * `COST_UNIT_STATUSES` and only `status`/`group` set `enableColumnFilter` — and
 * they exist so a malformed value can't reach the server. Dropping a rule is
 * still the wrong outcome (the chip would stay visible over unfiltered data),
 * so `hasUnmappableFilter` reports it back to the caller instead of hiding it.
 */
function buildCostUnitFilters(columnFilters: ColumnFiltersState): {
	filters: CostUnitListFilters | undefined;
	hasUnmappableFilter: boolean;
} {
	const rules: CostUnitListFilters = [];
	let hasUnmappableFilter = false;

	for (const filter of columnFilters) {
		if (!isMultiSelectFilter(filter.value) || filter.value.value.length === 0) {
			hasUnmappableFilter = true;
			continue;
		}
		const op = filter.value.operator === "in" ? "in" : "notIn";

		if (filter.id === "group") {
			rules.push({ field: "costUnitGroupId", op, value: filter.value.value });
			continue;
		}

		if (filter.id === "status" && isCostUnitStatusArray(filter.value.value)) {
			rules.push({ field: "status", op, value: filter.value.value });
			continue;
		}

		hasUnmappableFilter = true;
	}

	return {
		filters: rules.length > 0 ? rules : undefined,
		hasUnmappableFilter,
	};
}

/**
 * Every sortable column is in `COST_UNIT_SORT_FIELDS` (see `isServerSortable`
 * in the column factory), so the guard is a safety net rather than a filter.
 */
function buildCostUnitSorting(
	sortingState: SortingState,
): CostUnitListSorting | undefined {
	const sort = sortingState[0];
	if (!sort || !isCostUnitSortField(sort.id)) return undefined;
	return [{ id: sort.id, desc: sort.desc }];
}

/**
 * Sorting is server-side, so a column is only sortable if the endpoint can
 * order by it. Deriving this from the shared list keeps the header menu from
 * offering a sort the server would silently ignore.
 */
function isServerSortable(id: string): boolean {
	return isCostUnitSortField(id);
}

function createCostUnitsGridColumns(
	handle: UpdateCostUnitHandle,
	t: CostUnitsTranslator,
	groupOptions: FilterOption[],
): ColumnDef<FetchedCostUnit>[] {
	return [
		{
			id: "tag",
			accessorKey: "tag",
			enableSorting: isServerSortable("tag"),
			enableColumnFilter: false,
			header: ({ column }) => (
				<DataGridColumnHeader
					column={column}
					icon={TagIcon}
					title={t("table.tag")}
				/>
			),
		},
		{
			id: "title",
			accessorKey: "title",
			enableSorting: isServerSortable("title"),
			enableColumnFilter: false,
			cell: ({ row }) => {
				return (
					<span className="flex items-center justify-start gap-2 font-semibold text-slate-800">
						<span
							className="block size-2 rounded-xs"
							style={{
								backgroundColor: COST_UNIT_COLORS[row.original.color]?.fill,
							}}
						/>
						{row.original.title}
					</span>
				);
			},
			header: ({ column }) => (
				<DataGridColumnHeader
					column={column}
					icon={TextIcon}
					title={t("table.title")}
				/>
			),
		},

		{
			id: "group",
			// Load-bearing despite manual sorting/filtering: TanStack's
			// `getCanSort()` and `getCanFilter()` both require an accessor, so
			// removing this silently drops the column's sort and filter UI.
			accessorFn: (original) => {
				return original.costUnitGroup?.title ?? t("table.noGroup");
			},
			enableSorting: isServerSortable("group"),
			header: ({ column }) => (
				<DataGridColumnHeader
					column={column}
					icon={CalendarPlusIcon}
					title={t("table.group")}
				/>
			),
			cell: ({ row }) => {
				return (
					<Badge variant={"outline"}>
						{row.original.costUnitGroup?.title ?? t("table.noGroup")}
					</Badge>
				);
			},
			meta: {
				label: t("table.group"),
				icon: CalendarPlusIcon,
				options: groupOptions,
				filterType: "multiselect",
				searchable: true,
			},
		},
		{
			id: "status",
			// See the `group` column: the accessor unlocks the sort/filter UI.
			accessorFn: (original) => {
				return original.status;
			},
			enableSorting: isServerSortable("status"),
			header: ({ column }) => (
				<DataGridColumnHeader
					column={column}
					icon={LoaderIcon}
					title={t("table.status")}
				/>
			),
			meta: {
				label: t("table.status"),
				icon: LoaderIcon,
				options: [
					{ label: t("table.statusActive"), value: "ACTIVE" },
					{ label: t("table.statusArchived"), value: "ARCHIVED" },
				],
				filterType: "multiselect",
			},
			cell: ({ row }) => {
				if (row.original.status === "ARCHIVED") {
					return (
						<Badge className="pl-1.25" variant={"outline"}>
							<CircleIcon className="text-white **:fill-orange-500" />
							{t("table.statusArchived")}
						</Badge>
					);
				}

				return (
					<Badge className="pl-1.25" variant={"outline"}>
						<CircleIcon className="text-white **:fill-green-500" />
						{t("table.statusActive")}
					</Badge>
				);
			},
		},
		{
			id: "examples",
			accessorFn: (original) => {
				return original.examples.length;
			},
			// Not in COST_UNIT_SORT_FIELDS: Postgres can't order by an array length
			// without a computed column, so this column stays display-only.
			enableSorting: isServerSortable("examples"),
			enableColumnFilter: false,
			cell: ({ row }) => {
				return (
					<span>
						{t("table.examplesCount", { count: row.original.examples.length })}
					</span>
				);
			},
			header: ({ column }) => (
				<DataGridColumnHeader
					column={column}
					icon={ListIcon}
					title={t("table.examples")}
				/>
			),
		},
		{
			id: "createdAt",
			accessorFn: (original) => {
				return original.createdAt;
			},
			enableSorting: isServerSortable("createdAt"),
			enableColumnFilter: false,
			cell: ({ row }) => {
				return format(row.original.createdAt, "dd.MM.yyyy, HH:mm");
			},
			header: ({ column }) => (
				<DataGridColumnHeader
					column={column}
					icon={CalendarPlusIcon}
					title={t("table.createdAt")}
				/>
			),
		},
		{
			id: "action",
			cell: ({ row }) => (
				<DialogPrimitive.Trigger
					handle={handle}
					payload={{
						id: row.original.id,
					}}
					render={
						<Button
							className={
								"shadow-none ring-0 group-hover/row:shadow-sm group-hover/row:ring-1"
							}
							size={"icon-sm"}
							variant={"outline"}
						>
							<EllipsisIcon />
						</Button>
					}
				/>
			),
		},
	];
}

function CostUnitsGrid({ className, ...props }: React.ComponentProps<"div">) {
	const t = useTranslations("modules.settings.costUnits");

	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: COST_UNITS_PAGE_SIZE,
	});
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[],
	);
	const [sorting, setSorting] = React.useState<SortingState>([]);

	// The server page reads `?search` and prefetches with it, so the client has
	// to read the same parameter or the prefetched entry is never matched.
	const [search, setSearch] = useQueryState("search", parseAsString);

	const updateHandleRef = React.useRef<UpdateCostUnitHandle | null>(null);
	if (!updateHandleRef.current)
		updateHandleRef.current = createCostUnitUpdateHandle();
	const updateHandle = updateHandleRef.current;

	const groupsQuery = api.costUnit.groups.list.useQuery();

	const groupOptions = React.useMemo<FilterOption[]>(
		() => [
			{ label: t("table.noGroup"), value: NO_COST_UNIT_GROUP },
			...(groupsQuery.data ?? []).map((group) => ({
				label: group.title,
				value: group.id,
			})),
		],
		[groupsQuery.data, t],
	);

	const columns = React.useMemo(() => {
		return createCostUnitsGridColumns(updateHandle, t, groupOptions);
	}, [updateHandle, t, groupOptions]);

	const { filters: queryFilters, hasUnmappableFilter } = React.useMemo(
		() => buildCostUnitFilters(columnFilters),
		[columnFilters],
	);
	const querySorting = React.useMemo(
		() => buildCostUnitSorting(sorting),
		[sorting],
	);

	// Narrowing the result set can strand the viewer on a page that no longer
	// exists, and `manualPagination` disables TanStack's own reset.
	const resetToFirstPage = React.useCallback(() => {
		setPagination((prev) =>
			prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 },
		);
	}, []);

	// `search` lands via a nuqs URL transition, one render after the commit that
	// set it. Resetting the page here instead of in the commit handler keeps the
	// two in the same render, so no request is ever issued for the new search at
	// the old page index.
	const [lastSearch, setLastSearch] = React.useState(search);
	if (search !== lastSearch) {
		setLastSearch(search);
		resetToFirstPage();
	}

	const dataQuery = api.costUnit.list.useQuery(
		{
			page: pagination.pageIndex + 1,
			pageSize: pagination.pageSize,
			search: search ?? undefined,
			filters: queryFilters,
			sorting: querySorting,
		},
		{
			placeholderData: keepPreviousData,
		},
	);

	const handleSearchChange = React.useCallback(
		(value: string) => {
			void setSearch(value.length > 0 ? value : null);
		},
		[setSearch],
	);

	// A filter the mapper can't translate would leave its chip visible over
	// unfiltered rows. Unreachable by construction, so surface it loudly rather
	// than letting the grid quietly disagree with its own controls.
	React.useEffect(() => {
		if (hasUnmappableFilter) {
			toast.error(t("table.filterUnsupported"));
		}
	}, [hasUnmappableFilter, t]);

	React.useEffect(() => {
		if (dataQuery.error) {
			toast.error(t("table.loadError"), {
				description: dataQuery.error.message,
			});
		}
	}, [dataQuery.error, t]);

	const table = useReactTable({
		data: dataQuery.data?.costUnits ?? [],
		rowCount: dataQuery.data?.pagination.totalCount,
		columns,
		getRowId: (row) => row.id,
		state: {
			pagination,
			columnFilters,
			sorting,
		},
		getCoreRowModel: getCoreRowModel(),
		onPaginationChange: setPagination,
		onColumnFiltersChange: (updater: Updater<ColumnFiltersState>) => {
			setColumnFilters(
				typeof updater === "function" ? updater(columnFilters) : updater,
			);
			resetToFirstPage();
		},
		onSortingChange: (updater: Updater<SortingState>) => {
			setSorting(typeof updater === "function" ? updater(sorting) : updater);
			resetToFirstPage();
		},
		manualPagination: true,
		manualFiltering: true,
		manualSorting: true,
	});

	const { data } = dataQuery;

	return (
		<div className={cn("", className)} data-slot="cost-units-table" {...props}>
			<CostUnitsGridToolbar
				className="container max-w-4xl"
				onSearchChange={handleSearchChange}
				search={search ?? ""}
				table={table}
			/>
			<div
				className="border-base-200 border-t transition-opacity data-[fetching=true]:opacity-50"
				data-fetching={dataQuery.isFetching}
			>
				<Grid className="w-full">
					<GridHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<GridRow className="border-b" key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
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
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<GridRow className="group/row" key={row.id}>
									{row.getVisibleCells().map((cell) => (
										<GridCell key={cell.id} style={{ ...getPinningStyles(cell.column) }}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</GridCell>
									))}
								</GridRow>
							))
						) : (
							<tr>
								<td
									className="h-24 text-center"
									colSpan={table.getVisibleFlatColumns().length}
								>
									{dataQuery.isPending && t("table.loading")}
									{!dataQuery.isPending && dataQuery.error && (
										<div className="flex flex-col items-center gap-2">
											<span>{t("table.loadError")}</span>
											<Button
												disabled={dataQuery.isFetching}
												onClick={() => void dataQuery.refetch()}
												size={"sm"}
												variant={"outline"}
											>
												{t("table.retry")}
											</Button>
										</div>
									)}
									{!dataQuery.isPending && !dataQuery.error && t("table.noResults")}
								</td>
							</tr>
						)}
					</GridBody>
					<GridFooter>
						<GridRow>
							<GridCell colSpan={columns.length}>
								<div className="flex flex-wrap justify-between gap-4 border-slate-200">
									<span className="text-slate-500 text-sm">
										{t("table.unitsCount", {
											count: data?.pagination.totalCount ?? 0,
										})}
									</span>
									<div className="flex items-center justify-center gap-2">
										<span className="me-2 text-slate-500 text-sm">
											{t("table.pageIndicator", {
												current: pagination.pageIndex + 1,
												total: data?.pagination.pageCount ?? 0,
											})}
										</span>
										<Button
											disabled={!table.getCanPreviousPage()}
											onClick={() => table.previousPage()}
											size={"icon-sm"}
											variant={"outline"}
										>
											<ChevronLeftIcon />
										</Button>
										<Button
											disabled={!table.getCanNextPage()}
											onClick={() => table.nextPage()}
											size={"icon-sm"}
											variant={"outline"}
										>
											<ChevronRightIcon />
										</Button>
									</div>
								</div>
							</GridCell>
						</GridRow>
					</GridFooter>
				</Grid>
			</div>
			<UpdateCostUnitSheet handle={updateHandle} />
		</div>
	);
}

/**
 * Search box, filter menu and the active-filter chips. The input keeps its own
 * value so typing stays responsive, and only commits on a debounce — every
 * commit changes the query key and hits the server.
 */
function CostUnitsGridToolbar({
	className,
	table,
	search,
	onSearchChange,
	...props
}: React.ComponentProps<"div"> & {
	table: TanstackTable<FetchedCostUnit>;
	search: string;
	onSearchChange: (value: string) => void;
}) {
	const t = useTranslations("modules.settings.costUnits");
	const [value, setValue] = React.useState(search);
	const hasActiveFilters = table.getState().columnFilters.length >= 1;

	// Tracks what this box last sent upstream. Syncing on `search` alone would
	// overwrite characters typed while a commit was in flight, because the
	// committed value arrives back one render later; comparing against what we
	// sent means only a genuinely external change (history navigation, a reset
	// elsewhere) moves the cursor out from under the user.
	const sentRef = React.useRef(search);
	const [lastExternal, setLastExternal] = React.useState(search);
	if (search !== lastExternal) {
		setLastExternal(search);
		if (search !== sentRef.current) {
			sentRef.current = search;
			setValue(search);
		}
	}

	// Held in a ref so an unrelated re-render can't restart the timer and stop
	// the debounce from ever firing.
	const commitRef = React.useRef(onSearchChange);
	commitRef.current = onSearchChange;

	React.useEffect(() => {
		if (value === search) return;

		const timer = setTimeout(() => {
			sentRef.current = value;
			commitRef.current(value);
		}, SEARCH_DEBOUNCE_MS);

		return () => clearTimeout(timer);
	}, [value, search]);

	return (
		<div className={cn("space-y-3 pb-4", className)} {...props}>
			<div className="flex items-center justify-between gap-4">
				<InputGroup className="w-full max-w-xs">
					<InputGroupInput
						aria-label={t("table.searchLabel")}
						onChange={(e) => setValue(e.target.value)}
						placeholder={t("table.searchPlaceholder")}
						value={value}
					/>
					<InputGroupAddon>
						<SearchIcon />
					</InputGroupAddon>
				</InputGroup>

				<FilterMenu size={"icon-sm"} table={table} variant={"outline"}>
					<ListFilterIcon />
				</FilterMenu>
			</div>
			{hasActiveFilters && (
				<div className="rounded-lg bg-base-100 p-4">
					<FilterList table={table} />
				</div>
			)}
		</div>
	);
}

export { OrgSettingsCostUnits };
