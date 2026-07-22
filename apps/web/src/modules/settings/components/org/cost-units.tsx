"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react";
import { keepPreviousData } from "@tanstack/react-query";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	type PaginationState,
	useReactTable,
} from "@tanstack/react-table";
import type { CostUnitStatus } from "@zemio/db";
import { format } from "date-fns";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	CircleIcon,
	EllipsisIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
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

function OrgSettingsCostUnits() {
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
		<section className="container">
			<header className="flex flex-wrap items-start justify-between gap-8">
				<div className="space-y-1">
					<h1 className="font-bold text-2xl text-zinc-800">{t("title")}</h1>
					<p className="text-sm text-zinc-700">{t("description")}</p>
				</div>
				<div className="flex flex-nowrap items-center justify-center gap-4">
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
			</header>

			<CostUnitsTable className="mt-12" />

			<CreateCostUnitSheet handle={createHandle} />
			<CreateCostUnitGroupSheet closeOnSuccess handle={createGroupHandle} />
		</section>
	);
}

// ========= COST UNITS LIST =============================================

type FetchedCostUnit = {
	id: string;
	tag: string;
	title: string;
	examples: string[];
	costUnitGroupId: string | null;
	costUnitGroup: {
		title: string;
	} | null;
	createdAt: Date;
	status: CostUnitStatus;
};

type ColumnTranslator = (
	key: string,
	values?: Record<string, string | number>,
) => string;

function createMembersTableColumns(
	handle: UpdateCostUnitHandle,
	t: ColumnTranslator,
): ColumnDef<FetchedCostUnit>[] {
	return [
		{
			id: "tag",
			accessorKey: "tag",
			header: t("table.tag"),
		},
		{
			id: "title",
			accessorKey: "title",
			header: t("table.title"),
			cell: ({ row }) => {
				return (
					<span className="font-semibold text-slate-800">{row.original.title}</span>
				);
			},
		},
		{
			id: "examples",
			accessorFn: (original) => {
				return original.examples.length;
			},
			cell: ({ row }) => {
				return (
					<span>
						{t("table.examplesCount", { count: row.original.examples.length })}
					</span>
				);
			},
			header: undefined,
		},
		{
			id: "createdAt",
			accessorKey: "",
			header: t("table.createdAt"),
			cell: ({ row }) => {
				return format(row.original.createdAt, "dd.MM.yyyy, HH:mm");
			},
		},
		{
			id: "group",
			accessorFn: (original) => {
				return original.costUnitGroup?.title ?? t("table.noGroup");
			},
			header: t("table.group"),
			cell: ({ row }) => {
				return (
					<Badge variant={"outline"}>
						{row.original.costUnitGroup?.title ?? t("table.noGroup")}
					</Badge>
				);
			},
		},
		{
			id: "status",
			accessorFn: (original) => {
				return original.status;
			},
			header: t("table.status"),
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

function CostUnitsTable({ className, ...props }: React.ComponentProps<"div">) {
	const t = useTranslations("modules.settings.costUnits");
	const PAGE_SIZE = 20;

	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: PAGE_SIZE,
	});

	const updateHandleRef = React.useRef<UpdateCostUnitHandle | null>(null);
	if (!updateHandleRef.current)
		updateHandleRef.current = createCostUnitUpdateHandle();
	const updateHandle = updateHandleRef.current;

	const columns = React.useMemo(() => {
		return createMembersTableColumns(updateHandle, t as ColumnTranslator);
	}, [updateHandle, t]);

	const dataQuery = api.costUnit.listCostUnits.useQuery(
		{
			page: pagination.pageIndex + 1,
			pageSize: pagination.pageSize,
			search: undefined,
		},
		{
			placeholderData: keepPreviousData,
		},
	);

	const table = useReactTable({
		data: dataQuery.data?.items ?? [],
		rowCount: dataQuery.data?.totalCount,
		columns,
		state: {
			pagination,
		},
		getCoreRowModel: getCoreRowModel(),
		onPaginationChange: setPagination,
		manualPagination: true,
	});

	if (dataQuery.isPending) {
		return null;
	}

	if (dataQuery.error) {
		return <p>{JSON.stringify(dataQuery.error)}</p>;
	}

	const { data } = dataQuery;

	return (
		<div className={cn("", className)} data-slot="cost-units-table" {...props}>
			<div
				className="transition-opacity data-[fetching=true]:opacity-50"
				data-fetching={dataQuery.isFetching}
			>
				<table className="w-full">
					<thead>
						{table.getHeaderGroups().map((headerGroup) => (
							<tr className="border-b" key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<th
											className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-800 text-xs"
											key={header.id}
										>
											{header.isPlaceholder
												? null
												: flexRender(header.column.columnDef.header, header.getContext())}
										</th>
									);
								})}
							</tr>
						))}
					</thead>
					<tbody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<tr className="group/row" key={row.id}>
									{row.getVisibleCells().map((cell) => (
										<td
											className="whitespace-nowrap px-3 py-2 text-slate-700 text-sm"
											key={cell.id}
										>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</td>
									))}
								</tr>
							))
						) : (
							<tr>
								<td
									className="h-24 text-center"
									colSpan={table.getVisibleFlatColumns().length}
								>
									{t("table.noResults")}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
			<div className="mt-8 flex flex-wrap justify-between gap-4 border-slate-200 border-t pt-4">
				<span className="text-slate-500 text-sm">
					{t("table.unitsCount", { count: data.totalCount })}
				</span>
				<div className="flex items-center justify-center gap-2">
					<span className="me-2 text-slate-500 text-sm">
						{t("table.pageIndicator", {
							current: pagination.pageIndex + 1,
							total: Math.ceil(data.totalCount / PAGE_SIZE),
						})}
					</span>
					<Button
						disabled={!table.getCanPreviousPage()}
						onClick={() => table.previousPage()}
						size={"icon-xs"}
						variant={"outline"}
					>
						<ChevronLeftIcon />
					</Button>
					<Button
						disabled={!table.getCanNextPage()}
						onClick={() => table.nextPage()}
						size={"icon-xs"}
						variant={"outline"}
					>
						<ChevronRightIcon />
					</Button>
				</div>
			</div>
			<UpdateCostUnitSheet handle={updateHandle} />
		</div>
	);
}

export { OrgSettingsCostUnits };
