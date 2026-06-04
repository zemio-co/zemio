"use client";

import type { Table } from "@tanstack/react-table";
import { XIcon } from "lucide-react";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { FilterChip } from "./filter-chip";

export type FilterListProps<TData> = React.ComponentProps<"div"> & {
	/**
	 * The TanStack Table instance.
	 */
	table: Table<TData>;
};

/**
 * Renders a list of active filter chips with a clear-all button.
 *
 * This component automatically displays chips for all active column filters
 * and provides a button to clear all filters at once.
 *
 * @example
 * ```tsx
 * <FilterList table={table} className="gap-2">
 *   <FilterMenu table={table}>
 *     <FilterIcon />
 *     Add Filter
 *   </FilterMenu>
 * </FilterList>
 * ```
 */
export function FilterList<TData>({
	table,
	className,
	children,
	...props
}: FilterListProps<TData>) {
	const columnFilters = table.getState().columnFilters;
	const hasActiveFilters = columnFilters.length >= 1;

	const handleClearAll = useCallback(() => {
		table.resetColumnFilters();
	}, [table]);

	return (
		<div
			className={cn("flex flex-wrap items-center gap-2", className)}
			data-filtered={hasActiveFilters}
			data-slot="filter-list"
			{...props}
		>
			{columnFilters.map((filter) => (
				<FilterChip filter={filter} key={filter.id} table={table} />
			))}

			{hasActiveFilters && (
				<Button
					aria-label="Alle Filter löschen"
					onClick={handleClearAll}
					size="icon-xs"
					variant="outline"
				>
					<XIcon />
				</Button>
			)}

			{children}
		</div>
	);
}

// Re-export types for convenience
export type { DateRangeFilterValue, SelectFilterValue } from "./filter-types";
