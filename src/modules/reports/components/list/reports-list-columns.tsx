import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
	ALargeSmallIcon,
	CalendarPlusIcon,
	CircleDotDashedIcon,
	FlameIcon,
	TagIcon,
	UserCircleIcon,
} from "lucide-react";
import Link from "next/link";
import type {
	DateRangeFilterValue,
	MultiSelectFilterValue,
} from "@/components/data/filter-types";
import { ListActionSlot } from "@/components/list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ReportStatus } from "@/generated/prisma/client";
import { StatusIcons } from "@/lib/icons";
import { ROUTES } from "@/lib/routes";
import { cn, formatTimeElapsed, translateReportStatus } from "@/lib/utils";
import type { ListReport } from "./types";

export type CostUnitOption = {
	label: string;
	value: string;
};

export type OwnerOption = {
	label: string;
	value: string;
	image?: string | null;
};

const actionsColumn: ColumnDef<ListReport> = {
	id: "actions",
	enableGrouping: false,
	enableColumnFilter: false,
	enableSorting: false,
	enableHiding: false,
	cell: ({ row }) => {
		return (
			<ListActionSlot>
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={row.getToggleSelectedHandler()}
				/>
			</ListActionSlot>
		);
	},
	meta: {
		label: "Actions",
		icon: FlameIcon,
		placeholder: "Aktion",
		filterType: "none",
	},
};

const statusColumn: ColumnDef<ListReport> = {
	id: "status",
	accessorKey: "status",
	enableGrouping: true,
	enableColumnFilter: true,
	enableSorting: true,
	enableHiding: true,
	sortingFn: (rowA, rowB) => {
		const order = [
			"DRAFT",
			"PENDING_APPROVAL",
			"NEEDS_REVISION",
			"ACCEPTED",
			"REJECTED",
		] satisfies ReportStatus[];

		return (
			order.indexOf(rowA.original.status) - order.indexOf(rowB.original.status)
		);
	},
	filterFn: (row, _columnId, filterValue) => {
		if (!filterValue) return true;

		const { operator, value } =
			filterValue as MultiSelectFilterValue<ReportStatus>;

		return operator === "in"
			? value.includes(row.original.status)
			: !value.includes(row.original.status);
	},
	cell: ({ row }) => {
		const Icon = StatusIcons[row.original.status];
		const translatedStatus = translateReportStatus(row.original.status);
		return (
			<Tooltip>
				<TooltipTrigger
					className="relative z-10"
					render={
						<span>
							<Icon
								className={cn(
									"size-4",
									row.original.status === "DRAFT" && "text-muted-foreground",
									row.original.status === "PENDING_APPROVAL" && "text-yellow-500",
									row.original.status === "NEEDS_REVISION" && "text-orange-500",
									row.original.status === "ACCEPTED" && "text-green-500",
									row.original.status === "REJECTED" && "text-red-500",
								)}
							/>
							<span className="sr-only">{translatedStatus}</span>
						</span>
					}
				/>
				<TooltipContent>{translatedStatus}</TooltipContent>
			</Tooltip>
		);
	},
	meta: {
		label: "Status",
		icon: CircleDotDashedIcon,
		options: (
			[
				"DRAFT",
				"PENDING_APPROVAL",
				"NEEDS_REVISION",
				"ACCEPTED",
				"REJECTED",
			] as const
		).map((status) => ({
			label: translateReportStatus(status),
			value: status,
			icon: StatusIcons[status],
		})),
		placeholder: "Status",
		filterType: "multiselect",
	},
};

const tagColumn: ColumnDef<ListReport> = {
	id: "tag",
	accessorKey: "tag",
	enableGrouping: false,
	enableColumnFilter: false,
	enableSorting: true,
	enableHiding: true,
	cell: ({ row }) => {
		return (
			<span className="font-normal text-muted-foreground">
				#{row.original.tag}
			</span>
		);
	},
	meta: {
		label: "Report ID",
		icon: TagIcon,
		placeholder: "Report ID",
		filterType: "none",
	},
};

const titleColumn: ColumnDef<ListReport> = {
	id: "title",
	accessorKey: "title",
	enableGrouping: false,
	enableColumnFilter: true,
	enableSorting: true,
	enableHiding: false,
	sortingFn: "text",
	cell: ({ row }) => {
		return (
			<Link
				className="max-w-full font-medium text-foreground"
				href={ROUTES.ADMIN_REVIEW_REPORT(row.original.id)}
			>
				<span className="absolute inset-0 z-0 h-full w-full transition-colors" />
				<span className="line-clamp-1">{row.original.title}</span>
			</Link>
		);
	},
	meta: {
		label: "Titel",
		icon: ALargeSmallIcon,
		placeholder: "Titel",
		filterType: "text",
	},
};

const createOwnerColumn = (options: OwnerOption[]): ColumnDef<ListReport> => ({
	id: "owner",
	accessorFn: (row) => row.owner.email,
	enableGrouping: true,
	enableColumnFilter: false,
	enableSorting: true,
	enableHiding: true,
	sortingFn: (rowA, rowB) => {
		return rowA.original.owner.name.localeCompare(rowB.original.owner.name);
	},
	cell: ({ row }) => {
		return (
			<Tooltip>
				<TooltipTrigger className="relative z-10">
					<Avatar className={cn("size-5")}>
						<AvatarImage src={row.original.owner.image ?? undefined} />
						<AvatarFallback>{row.original.owner.name.charAt(0)}</AvatarFallback>
					</Avatar>
				</TooltipTrigger>
				<TooltipContent>
					<p>{row.original.owner.name}</p>
					<p>{row.original.owner.email}</p>
				</TooltipContent>
			</Tooltip>
		);
	},
	meta: {
		label: "Ersteller",
		icon: UserCircleIcon,
		options,
		placeholder: "Ersteller",
		filterType: "none",
	},
});

const lastUpdatedAtColumn: ColumnDef<ListReport> = {
	id: "lastUpdatedAt",
	accessorKey: "lastUpdatedAt",
	enableGrouping: false,
	enableColumnFilter: false,
	enableSorting: true,
	enableHiding: true,
	cell: ({ row }) => {
		return (
			<span
				className="align-text-top font-normal text-muted-foreground text-xs"
				suppressHydrationWarning
			>
				{formatTimeElapsed(row.original.lastUpdatedAt)}
			</span>
		);
	},
	meta: {
		label: "Zuletzt aktualisiert",
		icon: TagIcon,
		placeholder: "Zuletzt aktualisiert",
		filterType: "none",
		hideOnMobile: true,
	},
};

const createCostUnitColumn = (
	options: CostUnitOption[],
): ColumnDef<ListReport> => ({
	id: "costUnit",
	accessorFn: (row) => row.costUnit.tag,
	enableGrouping: true,
	enableColumnFilter: true,
	enableSorting: true,
	enableHiding: true,
	filterFn: (row, _columnId, filterValue) => {
		const { operator = "in", value = [] } = (filterValue ??
			{}) as MultiSelectFilterValue<string>;

		// If no values selected, include all rows
		if (value.length === 0) return true;

		return operator === "in"
			? value.includes(row.original.costUnit.tag)
			: !value.includes(row.original.costUnit.tag);
	},
	cell: ({ row }) => {
		return (
			<Badge variant="outline">
				<TagIcon className="me-0.5 text-purple-500" />
				{row.original.costUnit.tag}
			</Badge>
		);
	},
	meta: {
		label: "Kostenstelle",
		icon: TagIcon,
		options,
		placeholder: "Kostenstelle",
		filterType: "multiselect",
		hideOnMobile: true,
	},
});

const createdAtColumn: ColumnDef<ListReport> = {
	id: "createdAt",
	accessorKey: "createdAt",
	enableGrouping: false,
	enableColumnFilter: true,
	enableSorting: true,
	enableHiding: true,
	filterFn: (row, _columnId, filterValue) => {
		const { start, end } = (filterValue ?? {}) as DateRangeFilterValue;
		if (!start || !end) return true;

		const createdAt = row.original.createdAt;
		return createdAt >= start && createdAt <= end;
	},
	cell: ({ row }) => {
		return (
			<Tooltip>
				<TooltipTrigger className="relative z-10">
					<Badge variant="outline">{format(row.original.createdAt, "dd.MM.")}</Badge>
				</TooltipTrigger>
				<TooltipContent>
					<p>
						Erstellt am {format(row.original.createdAt, "dd.MM.yyyy")} um{" "}
						{format(row.original.createdAt, "HH:mm")} Uhr
					</p>
				</TooltipContent>
			</Tooltip>
		);
	},
	meta: {
		label: "Erstellt am",
		icon: CalendarPlusIcon,
		placeholder: "Erstellt am",
		filterType: "date-past",
	},
};

export type ColumnOptions = {
	costUnits: CostUnitOption[];
	owners: OwnerOption[];
};

export const createColumns = (
	options: ColumnOptions,
): ColumnDef<ListReport>[] => [
	actionsColumn,
	statusColumn,
	tagColumn,
	titleColumn,
	lastUpdatedAtColumn,
	{
		id: "spacer",
		enableGrouping: false,
		enableColumnFilter: false,
		enableSorting: false,
		enableHiding: false,
		cell: () => {
			return <span className="block h-px" data-spacer />;
		},
	},
	createCostUnitColumn(options.costUnits),
	createdAtColumn,
	createOwnerColumn(options.owners),
];
