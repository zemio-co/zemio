"use client";

import type { ColumnFilter, Table } from "@tanstack/react-table";
import { useCallback } from "react";
import { renderFilterChipContent } from "./filter-registry";

export type FilterChipProps<TData> = {
	/**
	 * The column filter to render.
	 */
	filter: ColumnFilter;

	/**
	 * The TanStack Table instance.
	 */
	table: Table<TData>;
};

/**
 * Renders a filter chip for an active column filter.
 *
 * The chip's appearance and behavior is determined by the column's `meta.filterType`.
 * It automatically delegates to the appropriate chip component from the filter registry.
 *
 * @example
 * ```tsx
 * {table.getState().columnFilters.map((filter) => (
 *   <FilterChip key={filter.id} filter={filter} table={table} />
 * ))}
 * ```
 */
export function FilterChip<TData>({ filter, table }: FilterChipProps<TData>) {
	const column = table.getColumn(filter.id);

	const handleRemove = useCallback(() => {
		column?.setFilterValue(undefined);
	}, [column]);

	if (!column) return null;

	const chipContent = renderFilterChipContent(
		column,
		table,
		filter.value,
		handleRemove,
	);

	if (!chipContent) return null;

	return <>{chipContent}</>;
}
