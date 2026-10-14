"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { CostUnit, User } from "@zemio/db";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	DataGridColumnHeader,
} from "@zemio/ui";
import { format } from "date-fns";
import {
	ALargeSmallIcon,
	CalendarPlusIcon,
	CalendarSyncIcon,
	HashIcon,
	LoaderIcon,
	TagIcon,
	UserCircleIcon,
} from "lucide-react";
import Link from "next/link";
import type { useTranslations } from "next-intl";
import type { FilterOption } from "@/components/data/filter-types";
import { COST_UNIT_COLORS } from "@/lib/colors/cost-units";
import { reportStatusLabel } from "@/lib/i18n-labels";
import { StatusIcons } from "@/lib/icons";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { AdminReport } from "./types";

export type CostUnitOption = FilterOption<
	Pick<CostUnit, "id" | "tag" | "title">
>;

export type OwnerOption = FilterOption<
	Pick<User, "id" | "name" | "email" | "image">
>;

/**
 * Translator for the `modules.admin.columns` namespace. Taken as a parameter
 * (instead of building one at module scope) so the caller supplies it from
 * `useTranslations`, which keeps the message keys typed.
 */
type ColumnsTranslator = ReturnType<
	typeof useTranslations<"modules.admin.columns">
>;

type CreateAdminReportsColumnsOptions = {
	t: ColumnsTranslator;
	costUnitOptions: CostUnitOption[];
	ownerOptions: OwnerOption[];
};

function createAdminReportsColumns({
	t,
	costUnitOptions,
	ownerOptions,
}: CreateAdminReportsColumnsOptions): ColumnDef<AdminReport>[] {
	/** Renders a timestamp using the locale-specific date/time pattern. */
	const formatDateTime = (value: Date): string =>
		t("dateTime", {
			date: format(value, "dd.MM.yyyy"),
			time: format(value, "HH:mm"),
		});

	return [
		// Tag
		{
			id: "tag",
			accessorKey: "tag",
			enableGrouping: false,
			enableColumnFilter: true,
			enableSorting: true,
			enableHiding: true,
			cell: ({ row }) => <span>#{row.original.tag}</span>,
			header: ({ column }) => (
				<DataGridColumnHeader
					column={column}
					icon={HashIcon}
					title={t("tag.label")}
				/>
			),
			meta: {
				label: t("tag.label"),
				icon: HashIcon,
				placeholder: t("tag.placeholder"),
				filterType: "none",
			},
		},
		// Title
		{
			id: "title",
			accessorKey: "title",
			enableGrouping: false,
			enableColumnFilter: true,
			enableSorting: true,
			enableHiding: false,
			header: ({ column }) => (
				<DataGridColumnHeader
					column={column}
					icon={ALargeSmallIcon}
					title={t("title.label")}
				/>
			),
			cell: ({ row }) => (
				<Link
					className="font-semibold text-base-800"
					href={ROUTES.ADMIN_REVIEW_REPORT(row.original.id)}
				>
					{row.original.title}
				</Link>
			),
			meta: {
				label: t("title.label"),
				icon: ALargeSmallIcon,
				placeholder: t("title.placeholder"),
				filterType: "text",
			},
		},
		// Cost Unit
		{
			id: "costUnit",
			accessorFn: (row) => row.costUnit.tag,
			enableGrouping: false,
			enableColumnFilter: true,
			enableSorting: true,
			enableHiding: true,
			cell: ({ row }) => {
				const colors = COST_UNIT_COLORS[row.original.costUnit.color];

				return (
					<span className="flex items-center justify-start gap-2">
						<span
							className="block size-2 rounded-xs"
							style={{
								backgroundColor: colors.fill,
							}}
						/>
						{row.original.costUnit.tag} • {row.original.costUnit.title}
					</span>
				);
			},
			header: ({ column }) => (
				<DataGridColumnHeader
					column={column}
					icon={TagIcon}
					title={t("costUnit.label")}
				/>
			),
			meta: {
				label: t("costUnit.label"),
				icon: TagIcon,
				options: costUnitOptions,
				placeholder: t("costUnit.placeholder"),
				filterType: "multiselect",
				hideOnMobile: true,
				searchable: true,
			},
		},
		// Status
		{
			id: "status",
			accessorKey: "status",
			enableGrouping: false,
			enableColumnFilter: true,
			enableSorting: true,
			enableHiding: true,
			header: ({ column }) => (
				<DataGridColumnHeader
					column={column}
					icon={LoaderIcon}
					title={t("status.label")}
				/>
			),
			cell: ({ row }) => {
				const Icon = StatusIcons[row.original.status];
				const translatedStatus = reportStatusLabel(row.original.status);
				return (
					<span
						className={cn(
							"flex items-center justify-start gap-1.5",
							row.original.status === "DRAFT" && "text-muted-foreground",
							row.original.status === "PENDING_APPROVAL" && "text-yellow-600",
							row.original.status === "NEEDS_REVISION" && "text-orange-600",
							row.original.status === "ACCEPTED" && "text-lime-600",
							row.original.status === "PAID" && "text-green-600",
							row.original.status === "REJECTED" && "text-red-600",
						)}
					>
						<Icon className={cn("size-3.5 opacity-80")} />
						<span className="font-medium">{translatedStatus}</span>
					</span>
				);
			},
			meta: {
				label: t("status.label"),
				icon: LoaderIcon,
				options: (
					[
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
		},
		{
			id: "owner",
			accessorFn: (row) => row.owner.email,
			enableGrouping: false,
			enableColumnFilter: true,
			enableSorting: true,
			enableHiding: true,
			header: ({ column }) => (
				<DataGridColumnHeader
					column={column}
					icon={UserCircleIcon}
					title={t("owner.label")}
				/>
			),
			cell: ({ row }) => {
				return (
					<span className="flex items-center justify-start gap-2">
						<Avatar className={cn("size-4")}>
							<AvatarImage src={row.original.owner.image ?? undefined} />
							<AvatarFallback>{row.original.owner.name.charAt(0)}</AvatarFallback>
						</Avatar>

						<p>{row.original.owner.name}</p>
					</span>
				);
			},
			meta: {
				label: t("owner.label"),
				icon: UserCircleIcon,
				options: ownerOptions,
				placeholder: t("owner.placeholder"),
				filterType: "select",
				searchable: true,
			},
		},
		{
			id: "createdAt",
			accessorKey: "createdAt",
			enableGrouping: false,
			enableColumnFilter: true,
			enableSorting: true,
			enableHiding: true,
			cell: ({ row }) => {
				return formatDateTime(row.original.createdAt);
			},
			header: ({ column }) => (
				<DataGridColumnHeader
					column={column}
					icon={CalendarPlusIcon}
					title={t("createdAt.label")}
				/>
			),
			meta: {
				label: t("createdAt.label"),
				icon: CalendarPlusIcon,
				placeholder: t("createdAt.placeholder"),
				filterType: "date-past",
			},
		},
		{
			id: "lastUpdatedAt",
			accessorKey: "lastUpdatedAt",
			enableGrouping: false,
			enableColumnFilter: false,
			enableSorting: true,
			enableHiding: true,
			cell: ({ row }) => {
				return formatDateTime(row.original.lastUpdatedAt);
			},
			header: ({ column }) => (
				<DataGridColumnHeader
					column={column}
					icon={CalendarSyncIcon}
					title={t("lastUpdatedAt.label")}
				/>
			),
			meta: {
				label: t("lastUpdatedAt.label"),
				icon: CalendarSyncIcon,
				placeholder: t("lastUpdatedAt.placeholder"),
				filterType: "none",
				hideOnMobile: true,
			},
		},
	];
}

export { createAdminReportsColumns };
