import type { RowData } from "@tanstack/react-table";
import type {
	ColumnFilterType,
	DateRangePreset,
	FilterOption,
} from "@/components/data/filter-types";

declare module "@tanstack/react-table" {
	interface ColumnMeta<TData extends RowData, TValue> {
		/**
		 * Display label for the column in filter menus and chips.
		 */
		label?: string;

		/**
		 * Placeholder text for search inputs.
		 */
		placeholder?: string;

		/**
		 * The filter type of the column. Determines which filter UI is rendered.
		 */
		filterType?: ColumnFilterType;

		/**
		 * Icon component to display alongside the column label.
		 */
		icon?: React.FC<React.SVGProps<SVGSVGElement>>;

		/**
		 * Options for select/multiselect filter types.
		 */
		options?: FilterOption[];

		/**
		 * Custom date range presets. If not provided, default presets are used
		 * based on whether the filter type is "date-past" or "date-future".
		 */
		datePresets?: DateRangePreset[];

		/**
		 * When true, cell cannot be displayed on mobile devices.
		 */
		hideOnMobile?: boolean;

		/**
		 * When true, renders a search input at the top of the filter menu's
		 * select/multiselect submenu to filter the available options.
		 */
		searchable?: boolean;
	}
}
