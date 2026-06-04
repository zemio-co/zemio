"use client";

import type { Row, Table } from "@tanstack/react-table";
import type React from "react";
import {
	ListActionSlot,
	ListGroupHeader,
	ListGroupToggle,
} from "@/components/list";
import { cn } from "@/lib/utils";

export function DataListGroupHeader<TData>({
	row,
	countItems = true,
	display,
	...props
}: React.ComponentProps<typeof ListGroupHeader> & {
	display: Table<TData>;
	row: Row<TData>;
	countItems?: boolean;
}) {
	const groupedByColumnId = row.groupingColumnId;

	if (!groupedByColumnId) {
		return null;
	}

	const column = display.getColumn(groupedByColumnId);
	const meta = column?.columnDef.meta;

	if (!meta) return null;

	const option = meta.options?.find(
		(option) => option.value === row.getValue(groupedByColumnId),
	);

	return (
		<ListGroupHeader data-collapsed={!row.getIsExpanded()} {...props}>
			<ListActionSlot>
				{row.getCanExpand() && (
					<ListGroupToggle
						data-expanded={row.getIsExpanded()}
						onClick={row.getToggleExpandedHandler()}
					/>
				)}
			</ListActionSlot>
			{option?.icon && (
				<option.icon className={cn("size-4", option.iconClassName)} />
			)}
			{option?.label ?? "Unbekannt"}
		</ListGroupHeader>
	);
}
