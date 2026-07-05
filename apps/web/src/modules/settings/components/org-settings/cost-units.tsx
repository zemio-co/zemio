"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react";
import { useQueries } from "@tanstack/react-query";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { EllipsisIcon } from "lucide-react";
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
					<h1 className="font-bold text-2xl text-zinc-800">Kostenstellen</h1>
					<p className="text-sm text-zinc-700">
						Kostenstellen werden verwendet um Ausgaben einfacher zuordnen zu können
					</p>
				</div>
				<div className="flex flex-nowrap items-center justify-center gap-4">
					<CreateCostUnitGroupSheetTrigger
						handle={createGroupHandle}
						variant={"outline"}
					>
						Neue Gruppe
					</CreateCostUnitGroupSheetTrigger>
					<CreateCostUnitSheetTrigger handle={createHandle}>
						Neue Kostenstelle
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
};

const costUnitColumns: ColumnDef<FetchedCostUnit>[] = [
	{
		id: "tag",
		accessorKey: "tag",
		header: "Tag",
	},
	{
		id: "title",
		accessorKey: "title",
		header: "Titel",
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
			return <span>{row.original.examples.length} Beispiele</span>;
		},
		header: undefined,
	},
	{
		id: "createdAt",
		accessorKey: "",
		header: "Erstellt",
		cell: ({ row }) => {
			return format(row.original.createdAt, "dd.MM.yyyy, HH:mm");
		},
	},
	{
		id: "group",
		accessorFn: (original) => {
			return original.costUnitGroup?.title ?? "Keine Gruppe";
		},
		header: "Gruppe",
		cell: ({ row }) => {
			return (
				<Badge variant={"outline"}>
					{row.original.costUnitGroup?.title ?? "Keine Gruppe"}
				</Badge>
			);
		},
	},
	{
		id: "actions",
		cell: () => {
			return (
				<Button
					className={
						"shadow-none ring-0 group-hover/row:shadow-sm group-hover/row:ring-1"
					}
					onClick={(e) => {
						e.stopPropagation();
					}}
					onPointerDown={(e) => {
						e.stopPropagation();
					}}
					size={"icon-sm"}
					variant={"outline"}
				>
					<EllipsisIcon />
				</Button>
			);
		},
	},
];

function CostUnitsTable({ className, ...props }: React.ComponentProps<"div">) {
	const updateHandleRef = React.useRef<UpdateCostUnitHandle | null>(null);
	if (!updateHandleRef.current)
		updateHandleRef.current = createCostUnitUpdateHandle();
	const updateHandle = updateHandleRef.current;

	const utils = api.useUtils();

	const [dataQuery] = useQueries({
		queries: [
			utils.costUnit.listCostUnits.queryOptions({
				page: 1,
				pageSize: 20,
				search: undefined,
			}),
		],
	});

	const table = useReactTable({
		data: dataQuery.data?.items ?? [],
		columns: costUnitColumns,
		getCoreRowModel: getCoreRowModel(),
	});

	if (dataQuery.error) {
		return <p>{JSON.stringify(dataQuery.error)}</p>;
	}

	return (
		<div className={cn("", className)} data-slot="cost-units-table" {...props}>
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
							<DialogPrimitive.Trigger
								handle={updateHandle}
								key={row.id}
								nativeButton={false}
								payload={{ id: row.original.id }}
								render={
									<tr className="group/row" key={row.id}>
										{row.getVisibleCells().map((cell) => (
											<td
												className="cursor-pointer whitespace-nowrap px-3 py-2 text-slate-700 text-sm"
												key={cell.id}
											>
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</td>
										))}
									</tr>
								}
							/>
						))
					) : (
						<tr>
							<td
								className="h-24 text-center"
								colSpan={table.getVisibleFlatColumns().length}
							>
								No results.
							</td>
						</tr>
					)}
				</tbody>
			</table>
			<UpdateCostUnitSheet handle={updateHandle} />
		</div>
	);
}

export { OrgSettingsCostUnits };
