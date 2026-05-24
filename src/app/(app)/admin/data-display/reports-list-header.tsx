import type { Table } from "@tanstack/react-table";
import { FilterList } from "@/components/data/filter-list";
import type { MultiSelectFilterValue } from "@/components/data/filter-types";
import { Button } from "@/components/ui/button";
import type { ReportStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import type { ListReport } from "./types";

function ReportsListHeader({
	className,
	table,
	...props
}: React.ComponentProps<"div"> & {
	table: Table<ListReport>;
}) {
	const columnFilters = table.getState().columnFilters;
	const hasActiveFilters = columnFilters.length >= 1;

	return (
		<div
			className={cn("space-y-3 py-3", className)}
			data-slot="reports-list-header"
			{...props}
		>
			<div className="container">
				<ReportsListQuickActions table={table} />
			</div>
			<div
				className={cn(
					"container hidden rounded-lg bg-zinc-100 p-4",
					hasActiveFilters && "block",
				)}
			>
				<FilterList table={table} />
			</div>
		</div>
	);
}

function ReportsListQuickActions({
	className,
	table,
	...props
}: React.ComponentProps<"div"> & {
	table: Table<ListReport>;
}) {
	return (
		<div
			className={cn("flex items-center justify-center gap-4", className)}
			data-slot="component"
			{...props}
		>
			<Button
				onClick={() => {
					const column = table.getColumn("status");
					column?.setFilterValue(undefined);
				}}
				size={"sm"}
				variant={"outline"}
			>
				Alle
			</Button>
			<Button
				onClick={() => {
					const column = table.getColumn("status");

					const filter: MultiSelectFilterValue<ReportStatus> = {
						filterType: "multiselect",
						operator: "in",
						value: ["REJECTED", "ACCEPTED"],
					};

					column?.setFilterValue(filter);
				}}
				size={"sm"}
				variant={"outline"}
			>
				Abgeschlossen
			</Button>
		</div>
	);
}

export { ReportsListHeader };
