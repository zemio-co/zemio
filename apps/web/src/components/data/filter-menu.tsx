"use client";

import type { Menu as MenuPrimitive } from "@base-ui/react/menu";
import type { Column, Table } from "@tanstack/react-table";
import type React from "react";
import { memo, useRef } from "react";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { renderFilterMenuContent } from "./filter-registry";
import { useFilterableColumns } from "./use-filterable-columns";

// ============================================================================
// Types
// ============================================================================

export type FilterMenuProps<TData> = React.ComponentProps<typeof Button> & {
	/**
	 * The TanStack Table instance to filter.
	 */
	table: Table<TData>;
};

type FilterMenuItemProps<TData> = {
	column: Column<TData, unknown>;
	table: Table<TData>;
	filterValue?: unknown;
	closeMenu: () => void;
};

// ============================================================================
// FilterMenuItem Component
// ============================================================================

/**
 * Renders a single filter menu item with its submenu content.
 * Memoized to prevent unnecessary re-renders when other columns change.
 */
const FilterMenuItem = memo(function FilterMenuItem<TData>({
	column,
	table,
	closeMenu,
}: // filterValue is intentionally unused — it exists solely to break memo
// when the column's filter value changes, ensuring the submenu re-renders
// with fresh state (fixes stale checked indicators and stale closure in handleToggle)
FilterMenuItemProps<TData>) {
	const meta = column.columnDef.meta;
	const menuContent = renderFilterMenuContent(column, table, closeMenu);

	if (!menuContent) return null;

	return (
		<DropdownMenuSub>
			<DropdownMenuSubTrigger>
				{meta?.icon && <meta.icon className="size-4" />}
				{meta?.label ?? column.id}
			</DropdownMenuSubTrigger>
			{menuContent}
		</DropdownMenuSub>
	);
}) as <TData>(props: FilterMenuItemProps<TData>) => React.ReactNode;

// ============================================================================
// FilterMenu Component
// ============================================================================

/**
 * A dropdown menu that displays filter options for all filterable columns.
 *
 * The menu automatically detects which columns can be filtered based on their
 * `meta.filterType` configuration and renders the appropriate filter UI for each.
 *
 * @example
 * ```tsx
 * <FilterMenu table={table} variant="outline" size="sm">
 *   <FilterIcon />
 *   Filter
 * </FilterMenu>
 * ```
 */
export function FilterMenu<TData>({
	table,
	children,
	...buttonProps
}: FilterMenuProps<TData>) {
	const filterableColumns = useFilterableColumns(table);
	const menuActionsRef = useRef<MenuPrimitive.Root.Actions>(null);

	const hasActiveFilters = table.getState().columnFilters.length >= 1;

	if (filterableColumns.length === 0) {
		return null;
	}

	return (
		<DropdownMenu actionsRef={menuActionsRef}>
			<DropdownMenuTrigger
				data-filtered={hasActiveFilters}
				render={<Button {...buttonProps}>{children}</Button>}
			/>
			<DropdownMenuContent
				aria-label="Filteroptionen"
				className="w-full min-w-48 max-w-72"
			>
				<DropdownMenuGroup>
					{filterableColumns.map((column) => (
						<FilterMenuItem
							closeMenu={() => menuActionsRef.current?.close()}
							column={column}
							filterValue={
								table.getState().columnFilters.find((f) => f.id === column.id)?.value
							}
							key={column.id}
							table={table}
						/>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

// Re-export types for convenience
export type { DateRangeFilterValue, SelectFilterValue } from "./filter-types";
