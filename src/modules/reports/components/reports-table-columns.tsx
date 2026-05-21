import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
	ALargeSmallIcon,
	BadgeEuroIcon,
	CalendarPlusIcon,
	CircleDotDashedIcon,
	TagIcon,
} from "lucide-react";
import Link from "next/link";
import {
	isDateRangeFilter,
	isSelectFilter,
} from "@/components/data/filter-types";
import { ReportStatusBadge } from "@/components/report-status-badge";
import { Badge } from "@/components/ui/badge";
import type { Report as ReportPrimitive } from "@/generated/prisma/client";
import { StatusIcons } from "@/lib/icons";
import { ROUTES } from "@/lib/routes";
import { translateReportStatus } from "@/lib/utils";

type Report = ReportPrimitive & {
	sum: number;
};

const REPORT_STATUSES: Report["status"][] = [
	"DRAFT",
	"PENDING_APPROVAL",
	"NEEDS_REVISION",
	"ACCEPTED",
	"REJECTED",
];

const EUR_FORMATTER = new Intl.NumberFormat("de-DE", {
	currency: "EUR",
	style: "currency",
});

function isReportStatus(value: string): value is Report["status"] {
	switch (value) {
		case "DRAFT":
		case "PENDING_APPROVAL":
		case "NEEDS_REVISION":
		case "ACCEPTED":
		case "REJECTED":
			return true;
		default:
			return false;
	}
}

const titleColumn: ColumnDef<Report> = {
	id: "title",
	accessorKey: "title",
	header: "Antrag",
	enableColumnFilter: false,
	enableGrouping: false,
	enableHiding: false,
	enableSorting: true,
	sortingFn: "text",
	cell: ({ row }) => (
		<Link
			className="line-clamp-1 font-medium text-foreground"
			href={ROUTES.USER_REPORT_DETAILS(row.original.id)}
		>
			{row.original.title}
		</Link>
	),
	meta: {
		filterType: "none",
		icon: ALargeSmallIcon,
		label: "Antrag",
		placeholder: "Antrag",
	},
};

const tagColumn: ColumnDef<Report> = {
	id: "tag",
	accessorKey: "tag",
	header: "Report ID",
	enableColumnFilter: false,
	enableGrouping: false,
	enableHiding: true,
	enableSorting: true,
	cell: ({ row }) => (
		<span className="font-normal text-muted-foreground">#{row.original.tag}</span>
	),
	meta: {
		filterType: "none",
		icon: TagIcon,
		label: "Report ID",
		placeholder: "Report ID",
	},
};

const createdAtColumn: ColumnDef<Report> = {
	id: "createdAt",
	accessorKey: "createdAt",
	header: "Erstellt am",
	enableColumnFilter: true,
	enableGrouping: false,
	enableHiding: true,
	enableSorting: true,
	filterFn: (row, _columnId, filterValue) => {
		if (!isDateRangeFilter(filterValue)) return true;

		return (
			row.original.createdAt >= filterValue.start &&
			row.original.createdAt <= filterValue.end
		);
	},
	cell: ({ row }) => (
		<Badge variant="outline">
			{format(row.original.createdAt, "dd.MM.yyyy")}
		</Badge>
	),
	meta: {
		filterType: "date-past",
		icon: CalendarPlusIcon,
		label: "Erstellt am",
		placeholder: "Erstellt am",
	},
};

const sumColumn: ColumnDef<Report> = {
	id: "sum",
	accessorKey: "sum",
	header: "Gesamtbetrag",
	enableColumnFilter: false,
	enableGrouping: false,
	enableHiding: true,
	enableSorting: false,
	cell: ({ row }) => (
		<span className="font-medium tabular-nums">
			{EUR_FORMATTER.format(row.original.sum)}
		</span>
	),
	meta: {
		filterType: "none",
		icon: BadgeEuroIcon,
		label: "Gesamtbetrag",
		placeholder: "Gesamtbetrag",
	},
};

const statusColumn: ColumnDef<Report> = {
	id: "status",
	accessorKey: "status",
	header: "Status",
	enableColumnFilter: true,
	enableGrouping: true,
	enableHiding: true,
	enableSorting: true,
	sortingFn: (rowA, rowB) => {
		return (
			REPORT_STATUSES.indexOf(rowA.original.status) -
			REPORT_STATUSES.indexOf(rowB.original.status)
		);
	},
	filterFn: (row, _columnId, filterValue) => {
		if (!isSelectFilter(filterValue) || !isReportStatus(filterValue.value)) {
			return true;
		}

		return filterValue.operator === "is"
			? row.original.status === filterValue.value
			: row.original.status !== filterValue.value;
	},
	cell: ({ row }) => <ReportStatusBadge status={row.original.status} />,
	meta: {
		filterType: "select",
		icon: CircleDotDashedIcon,
		label: "Status",
		options: REPORT_STATUSES.map((status) => ({
			icon: StatusIcons[status],
			label: translateReportStatus(status),
			value: status,
		})),
		placeholder: "Status",
	},
};

export const columns: ColumnDef<Report>[] = [
	titleColumn,
	tagColumn,
	createdAtColumn,
	sumColumn,
	statusColumn,
];
