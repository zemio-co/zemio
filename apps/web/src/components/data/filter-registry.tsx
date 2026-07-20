"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import type { Column, Table } from "@tanstack/react-table";
import { differenceInDays } from "date-fns";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "../ui/button";
import { ButtonGroup } from "../ui/button-group";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSubContent,
	DropdownMenuSubSearchEmpty,
	DropdownMenuSubSearchInput,
	DropdownMenuSubSearchItem,
	DropdownMenuSubSearchList,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
	type ColumnFilterType,
	DATE_FUTURE_PRESETS,
	DATE_PAST_PRESETS,
	type DateRangeFilterValue,
	type DateRangePreset,
	type FilterChipProps,
	type FilterMenuContentProps,
	type FilterOption,
	isDateRangeFilter,
	isMultiSelectFilter,
	isSelectFilter,
	type MultiSelectFilterValue,
	type SelectFilterValue,
} from "./filter-types";

// ============================================================================
// Shared Option Rendering
// ============================================================================

/**
 * Renders a single filter option's content for a dropdown row.
 * Uses the option's custom `render` when both `render` and `data` are set,
 * otherwise falls back to the default icon+label row.
 */
function renderOptionContent(option: FilterOption): ReactNode {
	if (option.render && option.data !== undefined) {
		return option.render(option.data);
	}

	return (
		<>
			{option.icon && <option.icon className={option.iconClassName} />}
			{option.label}
		</>
	);
}

/**
 * Matches a filter option against a search query, considering both its
 * `label` and its optional `searchValue`.
 */
function useOptionFilter() {
	const filter = ComboboxPrimitive.useFilter();

	return (option: FilterOption, query: string) =>
		filter.contains(option, query, (o) => `${o.label} ${o.searchValue ?? ""}`);
}

// ============================================================================
// Filter Registry Definition
// ============================================================================

type FilterRegistryEntry<TData, TValue = unknown> = {
	/**
	 * Renders the dropdown menu content for this filter type.
	 */
	MenuContent: React.FC<FilterMenuContentProps<TData, TValue>>;

	/**
	 * Renders the filter chip for active filters of this type.
	 */
	ChipContent: React.FC<FilterChipProps<TData, TValue>>;
};

// ============================================================================
// Date Range Filter Components
// ============================================================================

function DateRangeMenuContent<TData, TValue>({
	column,
	presets,
}: FilterMenuContentProps<TData, TValue> & { presets: DateRangePreset[] }) {
	const handleSelect = (preset: DateRangePreset) => {
		const range = preset.getRange();
		const value: DateRangeFilterValue = {
			filterType: "date-range",
			start: range.start,
			end: range.end,
			label: preset.label,
		};
		column.setFilterValue(value);
	};

	return (
		<DropdownMenuSubContent>
			{presets.map((preset) => (
				<DropdownMenuItem key={preset.label} onClick={() => handleSelect(preset)}>
					{preset.label}
				</DropdownMenuItem>
			))}
		</DropdownMenuSubContent>
	);
}

type DateRangeChipContentProps<TData, TValue> = FilterChipProps<
	TData,
	TValue
> & {
	presets: DateRangePreset[];
	direction: "past" | "future";
};

function DateRangeChipContent<TData, TValue>({
	column,
	value,
	onRemove,
	presets,
	direction,
}: DateRangeChipContentProps<TData, TValue>) {
	const t = useTranslations("modules.shared.filterRegistry");
	const meta = column.columnDef.meta;

	if (!isDateRangeFilter(value)) return null;

	const days = differenceInDays(value.end, value.start);
	const daysLabel = t("days", { count: days });
	const directionLabel = direction === "past" ? t("daysAgo") : t("daysIn");

	const handlePresetChange = (preset: DateRangePreset) => {
		const range = preset.getRange();
		const newValue: DateRangeFilterValue = {
			filterType: "date-range",
			start: range.start,
			end: range.end,
			label: preset.label,
		};
		column.setFilterValue(newValue);
	};

	return (
		<ButtonGroup>
			<Button
				className="disabled:opacity-100"
				disabled
				size="xs"
				variant="outline"
			>
				{meta?.icon && <meta.icon className="size-3.5" />}
				{meta?.label}
			</Button>

			{/* Direction indicator */}
			<Button
				className="disabled:opacity-100"
				disabled
				size="xs"
				variant="outline"
			>
				{directionLabel}
			</Button>

			{/* Time range dropdown */}
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button disableAnimation size="xs" variant="outline">
							{daysLabel}
						</Button>
					}
				/>
				<DropdownMenuContent className="min-w-48">
					{presets.map((preset) => (
						<DropdownMenuItem
							key={preset.label}
							onClick={() => handlePresetChange(preset)}
						>
							{preset.label}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>

			<Button disableAnimation onClick={onRemove} size="icon-xs" variant="outline">
				<XIcon />
				<span className="sr-only">{t("removeFilter")}</span>
			</Button>
		</ButtonGroup>
	);
}

// ============================================================================
// Select Filter Components
// ============================================================================

function SelectMenuContent<TData, TValue>({
	column,
	closeMenu,
}: FilterMenuContentProps<TData, TValue>) {
	const t = useTranslations("modules.shared.filterRegistry");
	const meta = column.columnDef.meta;
	const options = meta?.options ?? [];
	const filterOption = useOptionFilter();

	const handleSelect = (optionValue: string, operator: "is" | "is-not") => {
		const value: SelectFilterValue = {
			filterType: "select",
			operator,
			value: optionValue,
		};
		column.setFilterValue(value);
	};

	if (meta?.searchable) {
		return (
			<DropdownMenuSubContent className="flex max-h-72 w-64 flex-col overflow-hidden">
				<ComboboxPrimitive.Root filter={filterOption} inline items={options} open>
					<DropdownMenuSubSearchInput placeholder={t("search")} />
					<DropdownMenuSubSearchEmpty>{t("noResults")}</DropdownMenuSubSearchEmpty>
					<DropdownMenuSubSearchList>
						{(option: FilterOption) => (
							<DropdownMenuSubSearchItem
								key={option.value}
								onClick={() => {
									handleSelect(option.value, "is");
									closeMenu?.();
								}}
								value={option}
							>
								{renderOptionContent(option)}
							</DropdownMenuSubSearchItem>
						)}
					</DropdownMenuSubSearchList>
				</ComboboxPrimitive.Root>
			</DropdownMenuSubContent>
		);
	}

	return (
		<DropdownMenuSubContent className="min-w-48">
			{options.map((option) => (
				<DropdownMenuItem
					key={option.value}
					onClick={() => handleSelect(option.value, "is")}
				>
					{renderOptionContent(option)}
				</DropdownMenuItem>
			))}
		</DropdownMenuSubContent>
	);
}

function SelectChipContent<TData, TValue>({
	column,
	value,
	onRemove,
}: FilterChipProps<TData, TValue>) {
	const t = useTranslations("modules.shared.filterRegistry");
	const meta = column.columnDef.meta;

	if (!isSelectFilter(value)) return null;

	const options = meta?.options ?? [];
	const selectedOption = options.find((opt) => opt.value === value.value);

	const handleOperatorChange = (newOperator: "is" | "is-not") => {
		const newValue: SelectFilterValue = {
			filterType: "select",
			operator: newOperator,
			value: value.value,
		};
		column.setFilterValue(newValue);
	};

	const handleValueChange = (newOptionValue: string) => {
		const newValue: SelectFilterValue = {
			filterType: "select",
			operator: value.operator,
			value: newOptionValue,
		};
		column.setFilterValue(newValue);
	};

	return (
		<ButtonGroup>
			<Button
				className="disabled:opacity-100"
				disabled
				size="xs"
				variant="outline"
			>
				{meta?.icon && <meta.icon className="size-3.5" />}
				{meta?.label}
			</Button>

			{/* Operator dropdown */}
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button disableAnimation size="xs" variant="outline">
							{value.operator === "is" ? t("is") : t("isNot")}
						</Button>
					}
				/>
				<DropdownMenuContent>
					<DropdownMenuItem onClick={() => handleOperatorChange("is")}>
						{t("is")}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => handleOperatorChange("is-not")}>
						{t("isNot")}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Value dropdown */}
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button disableAnimation size="xs" variant="outline">
							{selectedOption?.icon && (
								<selectedOption.icon className={selectedOption.iconClassName} />
							)}
							{selectedOption?.label ?? String(value.value)}
						</Button>
					}
				/>
				<DropdownMenuContent className="min-w-48">
					{options.map((option) => (
						<DropdownMenuItem
							key={option.value}
							onClick={() => handleValueChange(option.value)}
						>
							{renderOptionContent(option)}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>

			<Button onClick={onRemove} size="icon-xs" variant="outline">
				<XIcon />
				<span className="sr-only">{t("removeFilter")}</span>
			</Button>
		</ButtonGroup>
	);
}

// ============================================================================
// Multi Select Filter Components
// ============================================================================
function MultiSelectMenuContent<TData, TValue>({
	column,
}: FilterMenuContentProps<TData, TValue>) {
	const t = useTranslations("modules.shared.filterRegistry");
	const meta = column.columnDef.meta;
	const options = meta?.options ?? [];
	const filterOption = useOptionFilter();
	const filterValue = column.getFilterValue();
	const selectedValues: string[] = isMultiSelectFilter(filterValue)
		? filterValue.value
		: [];

	const handleToggle = (optionValue: string) => {
		const latestFilterValue = column.getFilterValue();
		const latestSelected: string[] = isMultiSelectFilter(latestFilterValue)
			? latestFilterValue.value
			: [];

		const isSelected = latestSelected.includes(optionValue);
		const newValues = isSelected
			? latestSelected.filter((v) => v !== optionValue)
			: [...latestSelected, optionValue];

		if (newValues.length === 0) {
			column.setFilterValue(undefined);
			return;
		}

		const value: MultiSelectFilterValue = {
			filterType: "multiselect",
			operator: isMultiSelectFilter(latestFilterValue)
				? latestFilterValue.operator
				: "in",
			value: newValues,
		};

		column.setFilterValue(value);
	};

	if (meta?.searchable) {
		return (
			<DropdownMenuSubContent className="flex max-h-72 w-64 flex-col overflow-hidden">
				<ComboboxPrimitive.Root filter={filterOption} inline items={options} open>
					<DropdownMenuSubSearchInput placeholder={t("search")} />
					<DropdownMenuSubSearchEmpty>{t("noResults")}</DropdownMenuSubSearchEmpty>
					<DropdownMenuSubSearchList>
						{(option: FilterOption) => (
							<DropdownMenuSubSearchItem
								checked={selectedValues.includes(option.value)}
								key={option.value}
								onClick={() => handleToggle(option.value)}
								value={option}
							>
								{renderOptionContent(option)}
							</DropdownMenuSubSearchItem>
						)}
					</DropdownMenuSubSearchList>
				</ComboboxPrimitive.Root>
			</DropdownMenuSubContent>
		);
	}

	return (
		<DropdownMenuSubContent className="min-w-48">
			{options.map((option) => (
				<DropdownMenuCheckboxItem
					checked={selectedValues.includes(option.value)}
					key={option.value}
					onCheckedChange={() => handleToggle(option.value)}
				>
					{renderOptionContent(option)}
				</DropdownMenuCheckboxItem>
			))}
		</DropdownMenuSubContent>
	);
}

function MultiSelectChipContent<TData, TValue>({
	column,
	value,
	onRemove,
}: FilterChipProps<TData, TValue>) {
	const t = useTranslations("modules.shared.filterRegistry");
	const meta = column.columnDef.meta;

	if (!isMultiSelectFilter(value)) return null;

	const options = meta?.options ?? [];
	const selectedOptions = options.filter((opt) =>
		value.value.includes(opt.value),
	);

	const handleOperatorChange = (newOperator: "in" | "not-in") => {
		const newValue: MultiSelectFilterValue = {
			filterType: "multiselect",
			operator: newOperator,
			value: value.value,
		};
		column.setFilterValue(newValue);
	};

	const handleValueToggle = (optionValue: string) => {
		const isSelected = value.value.includes(optionValue);
		let newValues: string[];

		if (isSelected) {
			newValues = value.value.filter((v) => v !== optionValue);
		} else {
			newValues = [...value.value, optionValue];
		}

		if (newValues.length === 0) {
			column.setFilterValue(undefined);
			return;
		}

		const newValue: MultiSelectFilterValue = {
			filterType: "multiselect",
			operator: value.operator,
			value: newValues,
		};
		column.setFilterValue(newValue);
	};

	// Get first selected option for single-item display
	const firstSelectedOption = selectedOptions[0];

	// Display label for selected values
	const displayLabel =
		selectedOptions.length === 1 && firstSelectedOption
			? firstSelectedOption.label
			: t("selectedCount", { count: selectedOptions.length });

	// Get icon component for single selection
	const FirstOptionIcon = firstSelectedOption?.icon;

	return (
		<ButtonGroup>
			<Button
				className="disabled:opacity-100"
				disabled
				size="xs"
				variant="outline"
			>
				{meta?.icon && <meta.icon className="size-3.5" />}
				{meta?.label}
			</Button>

			{/* Operator dropdown */}
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button disableAnimation size="xs" variant="outline">
							{value.operator === "in" ? t("contains") : t("containsNot")}
						</Button>
					}
				/>
				<DropdownMenuContent>
					<DropdownMenuItem onClick={() => handleOperatorChange("in")}>
						{t("contains")}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => handleOperatorChange("not-in")}>
						{t("containsNot")}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Value dropdown with checkboxes */}
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button disableAnimation size="xs" variant="outline">
							{selectedOptions.length === 1 && FirstOptionIcon && (
								<FirstOptionIcon className={firstSelectedOption?.iconClassName} />
							)}
							{displayLabel}
						</Button>
					}
				/>
				<DropdownMenuContent className="min-w-48">
					{options.map((option) => (
						<DropdownMenuCheckboxItem
							checked={value.value.includes(option.value)}
							key={option.value}
							onCheckedChange={() => handleValueToggle(option.value)}
						>
							{renderOptionContent(option)}
						</DropdownMenuCheckboxItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>

			<Button onClick={onRemove} size="icon-xs" variant="outline">
				<XIcon />
				<span className="sr-only">{t("removeFilter")}</span>
			</Button>
		</ButtonGroup>
	);
}

// ============================================================================
// Registry Factory Functions
// ============================================================================

/**
 * Creates filter registry entries for date range filters.
 */
function createDateRangeFilter<TData, TValue>(
	presets: DateRangePreset[],
	direction: "past" | "future",
): FilterRegistryEntry<TData, TValue> {
	return {
		MenuContent: (props) => <DateRangeMenuContent {...props} presets={presets} />,
		ChipContent: (props) => (
			<DateRangeChipContent {...props} direction={direction} presets={presets} />
		),
	};
}

/**
 * Creates filter registry entries for select filters.
 */
function createSelectFilter<TData, TValue>(): FilterRegistryEntry<
	TData,
	TValue
> {
	return {
		MenuContent: SelectMenuContent,
		ChipContent: SelectChipContent,
	};
}

/**
 * Creates filter registry entries for multi select filters.
 */
function createMultiSelectFilter<TData, TValue>(): FilterRegistryEntry<
	TData,
	TValue
> {
	return {
		MenuContent: MultiSelectMenuContent,
		ChipContent: MultiSelectChipContent,
	};
}
// ============================================================================
// Main Registry
// ============================================================================

/**
 * Gets the filter registry entry for a given filter type.
 * Returns null for filter types that don't have a UI (text, number, none).
 */
export function getFilterEntry<TData, TValue>(
	filterType: ColumnFilterType | undefined,
	customPresets?: DateRangePreset[],
): FilterRegistryEntry<TData, TValue> | null {
	switch (filterType) {
		case "date-past":
			return createDateRangeFilter(customPresets ?? DATE_PAST_PRESETS, "past");
		case "date-future":
			return createDateRangeFilter(customPresets ?? DATE_FUTURE_PRESETS, "future");
		case "select":
			return createSelectFilter();
		case "multiselect":
			return createMultiSelectFilter();
		// case "text":
		// case "number":
		// case "none":
		default:
			return null;
	}
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Renders the appropriate menu content for a column based on its filter type.
 */
export function renderFilterMenuContent<TData, TValue>(
	column: Column<TData, TValue>,
	table: Table<TData>,
	closeMenu?: () => void,
): ReactNode {
	const meta = column.columnDef.meta;
	const entry = getFilterEntry<TData, TValue>(
		meta?.filterType,
		meta?.datePresets,
	);

	if (!entry) return null;

	return (
		<entry.MenuContent closeMenu={closeMenu} column={column} table={table} />
	);
}

/**
 * Renders the appropriate chip content for a column based on its filter type.
 */
export function renderFilterChipContent<TData, TValue>(
	column: Column<TData, TValue>,
	table: Table<TData>,
	value: unknown,
	onRemove: () => void,
): ReactNode {
	const meta = column.columnDef.meta;
	const entry = getFilterEntry<TData, TValue>(
		meta?.filterType,
		meta?.datePresets,
	);

	if (!entry) return null;

	// Type guard to ensure value is a valid FilterValue
	if (
		!isDateRangeFilter(value) &&
		!isSelectFilter(value) &&
		!isMultiSelectFilter(value)
	) {
		return null;
	}

	return (
		<entry.ChipContent
			column={column}
			onRemove={onRemove}
			table={table}
			value={value}
		/>
	);
}
