import type { ColumnDef } from "@tanstack/react-table";
import type { CostUnit, ReportStatus, User } from "@zemio/db";
import { createAppTranslator } from "@zemio/i18n";
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
import type { FilterOption } from "@/components/data/filter-types";
import { ListActionSlot } from "@/components/list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { reportStatusLabel } from "@/lib/i18n-labels";
import { StatusIcons } from "@/lib/icons";
import { ROUTES } from "@/lib/routes";
import { cn, formatTimeElapsed } from "@/lib/utils";
import type { ListReport } from "./types";

export type CostUnitOption = FilterOption<
	Pick<CostUnit, "id" | "tag" | "title">
>;

export type OwnerOption = FilterOption<
	Pick<User, "id" | "name" | "email" | "image">
>;

const t = createAppTranslator({ namespace: "modules.reports.columns" });

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
		label: t("actions.label"),
		icon: FlameIcon,
		placeholder: t("actions.placeholder"),
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
			"PAID",
		] satisfies ReportStatus[];

		return (
			order.indexOf(rowA.original.status) - order.indexOf(rowB.original.status)
		);
	},
	cell: ({ row }) => {
		const Icon = StatusIcons[row.original.status];
		const translatedStatus = reportStatusLabel(row.original.status);
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
									row.original.status === "PAID" && "text-green-500",
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
		label: t("status.label"),
		icon: CircleDotDashedIcon,
		options: (
			[
				"DRAFT",
				"PENDING_APPROVAL",
				"NEEDS_REVISION",
				"ACCEPTED",
				"REJECTED",
				"PAID",
			] as const
		).map((status) => ({
			label: reportStatusLabel(status),
			value: status,
			icon: StatusIcons[status],
		})),
		placeholder: t("status.placeholder"),
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
		label: t("reportId.label"),
		icon: TagIcon,
		placeholder: t("reportId.placeholder"),
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
				href={ROUTES.USER_REPORT_DETAILS(row.original.id)}
			>
				<span className="absolute inset-0 z-0 h-full w-full transition-colors" />
				<span className="line-clamp-1">{row.original.title}</span>
			</Link>
		);
	},
	meta: {
		label: t("title.label"),
		icon: ALargeSmallIcon,
		placeholder: t("title.placeholder"),
		filterType: "text",
	},
};

const createOwnerColumn = (options: OwnerOption[]): ColumnDef<ListReport> => ({
	id: "owner",
	accessorFn: (row) => row.owner.email,
	enableGrouping: true,
	enableColumnFilter: false,
	enableSorting: false,
	enableHiding: true,
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
		label: t("owner.label"),
		icon: UserCircleIcon,
		options,
		placeholder: t("owner.placeholder"),
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
		label: t("lastUpdatedAt.label"),
		icon: TagIcon,
		placeholder: t("lastUpdatedAt.placeholder"),
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
	enableSorting: false,
	enableHiding: true,
	cell: ({ row }) => {
		return (
			<Badge variant="outline">
				<TagIcon className="me-0.5 text-purple-500" />
				{row.original.costUnit.tag}
			</Badge>
		);
	},
	meta: {
		label: t("costUnit.label"),
		icon: TagIcon,
		options,
		placeholder: t("costUnit.placeholder"),
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
	cell: ({ row }) => {
		return (
			<Tooltip>
				<TooltipTrigger className="relative z-10">
					<Badge variant="outline">{format(row.original.createdAt, "dd.MM.")}</Badge>
				</TooltipTrigger>
				<TooltipContent>
					<p>
						{t("createdAt.tooltip", {
							date: format(row.original.createdAt, "dd.MM.yyyy"),
							time: format(row.original.createdAt, "HH:mm"),
						})}
					</p>
				</TooltipContent>
			</Tooltip>
		);
	},
	meta: {
		label: t("createdAt.label"),
		icon: CalendarPlusIcon,
		placeholder: t("createdAt.placeholder"),
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
