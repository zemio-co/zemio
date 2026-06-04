import type { Column, Table } from "@tanstack/react-table";
import { useIsMobile } from "@/hooks/use-mobile";
import { hasMenuBasedFilter } from "./filter-types";

/**
 * Returns all columns that can be filtered via the filter menu dropdown.
 *
 * This hook filters out columns that:
 * - Cannot be filtered (based on TanStack Table's `getCanFilter`)
 * - Use inline filter inputs (text, number) or have filtering disabled (none)
 *
 * @example
 * ```tsx
 * const filterableColumns = useFilterableColumns(table);
 * ```
 */
export function useFilterableColumns<TData>(
	table: Table<TData>,
): Column<TData, unknown>[] {
	const isMobile = useIsMobile();

	return table.getAllColumns().filter((column) => {
		const meta = column.columnDef.meta;
		return (
			column.getCanFilter() &&
			hasMenuBasedFilter(meta?.filterType) &&
			!(isMobile && meta?.hideOnMobile)
		);
	});
}
