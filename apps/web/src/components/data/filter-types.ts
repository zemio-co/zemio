import type { Column, Table } from "@tanstack/react-table";
import {
	addDays,
	addMonths,
	addYears,
	subDays,
	subMonths,
	subYears,
} from "date-fns";

// ============================================================================
// Filter Value Types (Discriminated Unions)
// ============================================================================

/**
 * Date range filter value with start/end dates and a display label.
 */
export type DateRangeFilterValue = {
	readonly filterType: "date-range";
	start: Date;
	end: Date;
	label: string;
};

/**
 * Select filter value with an operator (is/is-not) and the selected value.
 */
export type SelectFilterValue<T = string> = {
	readonly filterType: "select";
	operator: "is" | "is-not";
	value: T;
};

export type MultiSelectFilterValue<T = string> = {
	readonly filterType: "multiselect";
	operator: "in" | "not-in";
	value: T[];
};

/**
 * Union of all possible filter values.
 * The `filterType` discriminant allows type-safe handling.
 */
export type FilterValue =
	| DateRangeFilterValue
	| SelectFilterValue
	| MultiSelectFilterValue;

// ============================================================================
// Filter Type Guards
// ============================================================================

export function isDateRangeFilter(
	value: unknown,
): value is DateRangeFilterValue {
	return (
		typeof value === "object" &&
		value !== null &&
		"filterType" in value &&
		value.filterType === "date-range"
	);
}

export function isSelectFilter(value: unknown): value is SelectFilterValue {
	return (
		typeof value === "object" &&
		value !== null &&
		"filterType" in value &&
		value.filterType === "select"
	);
}

export function isMultiSelectFilter(
	value: unknown,
): value is MultiSelectFilterValue {
	return (
		typeof value === "object" &&
		value !== null &&
		"filterType" in value &&
		value.filterType === "multiselect"
	);
}

/**
 * Checks if a filter type has a menu-based UI (dropdown with options).
 * Returns false for filter types that use inline inputs (text, number) or are disabled (none).
 */
export function hasMenuBasedFilter(
	filterType: ColumnFilterType | undefined,
): boolean {
	return (
		filterType !== undefined &&
		filterType !== "none" &&
		filterType !== "text" &&
		filterType !== "number"
	);
}

// ============================================================================
// Filter Preset Types
// ============================================================================

export type DateRangePreset = {
	label: string;
	getRange: () => { start: Date; end: Date };
};

// ============================================================================
// Default Presets
// ============================================================================

export const DATE_PAST_PRESETS: DateRangePreset[] = [
	{
		label: "Letzte 24 Stunden",
		getRange: () => ({ start: subDays(new Date(), 1), end: new Date() }),
	},
	{
		label: "Letzte 3 Tage",
		getRange: () => ({ start: subDays(new Date(), 3), end: new Date() }),
	},
	{
		label: "Letzte Woche",
		getRange: () => ({ start: subDays(new Date(), 7), end: new Date() }),
	},
	{
		label: "Letzter Monat",
		getRange: () => ({ start: subMonths(new Date(), 1), end: new Date() }),
	},
	{
		label: "Letzte 3 Monate",
		getRange: () => ({ start: subMonths(new Date(), 3), end: new Date() }),
	},
	{
		label: "Letzte 6 Monate",
		getRange: () => ({ start: subMonths(new Date(), 6), end: new Date() }),
	},
	{
		label: "Letztes Jahr",
		getRange: () => ({ start: subYears(new Date(), 1), end: new Date() }),
	},
];

export const DATE_FUTURE_PRESETS: DateRangePreset[] = [
	{
		label: "Nächste 24 Stunden",
		getRange: () => ({ start: new Date(), end: addDays(new Date(), 1) }),
	},
	{
		label: "Nächste 3 Tage",
		getRange: () => ({ start: new Date(), end: addDays(new Date(), 3) }),
	},
	{
		label: "Nächste Woche",
		getRange: () => ({ start: new Date(), end: addDays(new Date(), 7) }),
	},
	{
		label: "Nächster Monat",
		getRange: () => ({ start: new Date(), end: addMonths(new Date(), 1) }),
	},
	{
		label: "Nächste 3 Monate",
		getRange: () => ({ start: new Date(), end: addMonths(new Date(), 3) }),
	},
	{
		label: "Nächste 6 Monate",
		getRange: () => ({ start: new Date(), end: addMonths(new Date(), 6) }),
	},
	{
		label: "Nächstes Jahr",
		getRange: () => ({ start: new Date(), end: addYears(new Date(), 1) }),
	},
];

// ============================================================================
// Component Props Types
// ============================================================================

export type FilterMenuContentProps<TData, TValue = unknown> = {
	column: Column<TData, TValue>;
	table: Table<TData>;
};

export type FilterChipProps<TData, TValue = unknown> = {
	column: Column<TData, TValue>;
	table: Table<TData>;
	value: FilterValue;
	onRemove: () => void;
};

// ============================================================================
// Column Meta Filter Types
// ============================================================================

export type ColumnFilterType =
	| "text"
	| "number"
	| "date-past"
	| "date-future"
	| "select"
	| "multiselect"
	| "none";

export type FilterOption = {
	label: string;
	value: string;
	icon?: React.FC<React.SVGProps<SVGSVGElement>>;
	iconClassName?: string;
};
