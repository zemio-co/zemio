import type { Table } from "@tanstack/react-table";
import { ArrowDownNarrowWideIcon, ArrowUpNarrowWideIcon } from "lucide-react";
import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ListLayout } from "../list";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { NativeSelect, NativeSelectOption } from "../ui/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Separator } from "../ui/separator";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

export function DisplayOptions<TData>({
	layout,
	onLayoutChange,
	display,
	grouping = true,
	sorting = true,
	...props
}: React.ComponentProps<typeof Button> & {
	display: Table<TData>;
	layout?: ListLayout;
	onLayoutChange?: (layout: ListLayout) => void;
	grouping?: boolean;
	sorting?: boolean;
}) {
	return (
		<Popover>
			<PopoverTrigger render={<Button {...props} />} />
			<PopoverContent align="end" className={"p-0"}>
				<div className="grid gap-4 p-4">
					{layout && onLayoutChange && (
						<div className="grid gap-2">
							<Label htmlFor="layout">Layout</Label>
							<Tabs onValueChange={onLayoutChange} value={layout}>
								<TabsList className="w-full">
									<TabsTrigger value="compact">Compact</TabsTrigger>
									<TabsTrigger value="default">Default</TabsTrigger>
									<TabsTrigger value="loose">Loose</TabsTrigger>
								</TabsList>
							</Tabs>
						</div>
					)}

					{grouping && (
						<div className="grid grid-cols-5 gap-2">
							<Label className="col-span-2" htmlFor="grouping">
								Grouping
							</Label>
							<div className="col-span-3">
								<DataDisplayGrouping display={display} id="grouping" />
							</div>
						</div>
					)}
					{sorting && (
						<div className="grid grid-cols-5 gap-2">
							<Label className="col-span-2" htmlFor="sorting">
								Sorting
							</Label>
							<div className="col-span-3">
								<DataDisplaySorting display={display} id="sorting" />
							</div>
						</div>
					)}
				</div>
				<Separator />
				<div className="grid gap-2 p-4">
					<Label>Column Visibility</Label>
					<DataDisplayColumnVisibility display={display} />
				</div>
			</PopoverContent>
		</Popover>
	);
}

function DataDisplayGrouping<TData>({
	display,
	...props
}: React.ComponentProps<typeof NativeSelect> & {
	display: Table<TData>;
}) {
	const grouping = display.getState().grouping;

	const groupableColumns = React.useMemo(() => {
		return display.getAllColumns().filter((column) => column.getCanGroup());
	}, [display]);

	return (
		<NativeSelect
			className="w-full"
			onChange={(e) => {
				const value = e.target.value;

				if (value === "") {
					display.setGrouping([]);
					return;
				}

				// TODO: With this implementation, the list can only be grouped by
				// one column at a time. This should be improved to allow grouping by
				// multiple columns.
				display.setGrouping([value]);
				display.toggleAllRowsExpanded(true);
			}}
			size="sm"
			value={grouping[0] ?? undefined}
			{...props}
		>
			<NativeSelectOption value="">No Grouping</NativeSelectOption>

			{groupableColumns.map((column) => {
				return (
					<NativeSelectOption key={column.id} value={column.id}>
						{column.columnDef.meta?.label}
					</NativeSelectOption>
				);
			})}
		</NativeSelect>
	);
}

function DataDisplaySorting<TData>({
	display,
	...props
}: React.ComponentProps<typeof NativeSelect> & {
	display: Table<TData>;
}) {
	const sorting = display.getState().sorting;

	const sortableColumns = React.useMemo(() => {
		return display.getAllColumns().filter((column) => column.getCanSort());
	}, [display]);

	const handleSortingDirectionChange = (columnId: string) => {
		const currentSorting = display.getState().sorting;
		const currentDirection = currentSorting[0]?.desc ?? false;
		display.setSorting([{ id: columnId, desc: !currentDirection }]);
	};

	return (
		<div className="flex items-center gap-2">
			{sorting[0] !== undefined && (
				<Button
					className="shrink-0"
					onClick={() => handleSortingDirectionChange(sorting[0]?.id ?? "")}
					size="icon-sm"
					variant="outline"
				>
					{sorting[0]?.desc ? (
						<ArrowDownNarrowWideIcon />
					) : (
						<ArrowUpNarrowWideIcon />
					)}
				</Button>
			)}
			<NativeSelect
				className="grow"
				onChange={(e) => {
					const value = e.target.value;

					if (value === "") {
						display.setSorting([]);
						return;
					}

					// TODO: With this implementation, the list can only be sorted by
					// one column at a time. This should be improved to allow sorting by
					// multiple columns with different directions.
					display.setSorting([{ id: value, desc: false }]);
				}}
				size="sm"
				value={sorting[0]?.id ?? ""}
				{...props}
			>
				<NativeSelectOption value="">No Sorting</NativeSelectOption>

				{sortableColumns.map((column) => {
					return (
						<NativeSelectOption key={column.id} value={column.id}>
							{column.columnDef.meta?.label ?? column.id}
						</NativeSelectOption>
					);
				})}
			</NativeSelect>
		</div>
	);
}

function DataDisplayColumnVisibility<TData>({
	display,
	...props
}: React.ComponentProps<"div"> & {
	display: Table<TData>;
}) {
	const isMobile = useIsMobile();

	const toggleableColumns = React.useMemo(() => {
		return display
			.getAllColumns()
			.filter(
				(column) =>
					column.getCanHide() && !(isMobile && column.columnDef.meta?.hideOnMobile),
			);
	}, [display, isMobile]);

	return (
		<div className="flex flex-wrap gap-1" {...props}>
			{toggleableColumns.map((column) => (
				<Button
					className="data-[hidden=true]:opacity-50"
					data-hidden={!column.getIsVisible()}
					key={column.id}
					onClick={column.getToggleVisibilityHandler()}
					size={"xs"}
					variant={"outline"}
				>
					{column.columnDef.meta?.label}
				</Button>
			))}
		</div>
	);
}
