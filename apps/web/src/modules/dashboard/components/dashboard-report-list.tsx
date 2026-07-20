"use client";

import type { Report as ReportPrimitive } from "@zemio/db";
import { format } from "date-fns";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { reportStatusKeys } from "@/lib/i18n-labels";
import { StatusIcons } from "@/lib/icons";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

type Report = ReportPrimitive & {
	sum: number;
};

function DashboardReportList({
	className,
	...props
}: React.ComponentProps<"section">) {
	const { data, isPending, error } = api.report.list.useQuery({
		page: 1,
		pageSize: 10,
	});

	const t = useTranslations("modules.dashboard.reportList");

	if (isPending) {
		return (
			<section
				className={cn("max-w-full space-y-4", className)}
				data-slot="dashboard-report-list"
				{...props}
			>
				<ReportListHeader />
				<Skeleton className="min-h-24 w-full" />
			</section>
		);
	}

	if (!data || error) {
		return (
			<section
				className={cn("space-y-4", className)}
				data-slot="dashboard-report-list"
				{...props}
			>
				<ReportListHeader />
				<div className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed px-6 py-10">
					<p className="text-center font-medium text-destructive text-sm">
						{t("loadErrorTitle")}
					</p>
					<p className="text-center text-xs">
						{error?.message ?? t("loadErrorFallback")}
					</p>
				</div>
			</section>
		);
	}

	const { reports } = data;

	if (reports.length === 0) {
		return (
			<section
				className={cn("space-y-4", className)}
				data-slot="dashboard-report-list"
				{...props}
			>
				<ReportListHeader />
				<div className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed px-6 py-10">
					<p className="text-center font-medium text-sm">{t("emptyTitle")}</p>
					<p className="text-center text-muted-foreground text-xs">
						{t("emptyDescription")}
					</p>
				</div>
			</section>
		);
	}

	return (
		<section
			className={cn("space-y-4", className)}
			data-slot="dashboard-report-list"
			{...props}
		>
			<ReportListHeader />
			<ReportList reports={reports} />
		</section>
	);
}

function ReportListHeader({
	className,
	...props
}: React.ComponentProps<"div">) {
	const t = useTranslations("modules.dashboard.reportList.header");

	return (
		<div
			className={cn("flex items-center justify-between gap-2", className)}
			data-slot="component"
			{...props}
		>
			<p className="font-medium">{t("title")}</p>
			<Link
				className={cn(
					buttonVariants({ variant: "ghost", size: "sm" }),
					"translate-x-2.5 text-violet-600 hover:text-violet-600",
				)}
				href={ROUTES.USER_REPORTS_LIST()}
			>
				{t("viewAll")} <ArrowRightIcon className="text-violet-600" />
			</Link>
		</div>
	);
}

function ReportList({
	className,
	reports,
	...props
}: React.ComponentProps<"div"> & { reports: Report[] }) {
	const tStatus = useTranslations("enums.reportStatus");
	const tTable = useTranslations("modules.dashboard.reportList.table");

	return (
		<div
			className={cn("w-full overflow-x-auto bg-white", className)}
			data-slot="report-list"
			{...props}
		>
			<table className="w-full">
				<thead>
					<tr className="bg-zinc-100">
						<th className="rounded-l-md px-3 py-2 text-left font-medium text-muted-foreground text-xs">
							{tTable("title")}
						</th>
						<th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">
							{tTable("date")}
						</th>
						<th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">
							{tTable("expenses")}
						</th>
						<th className="rounded-r-md px-3 py-2 text-left font-medium text-muted-foreground text-xs">
							{tTable("status")}
						</th>
					</tr>
				</thead>
				<tbody>
					{reports.map((report) => {
						const Icon = StatusIcons[report.status];

						return (
							<tr key={report.id}>
								<td className="px-3 py-3">
									<Link
										className="block font-medium text-foreground text-sm"
										href={ROUTES.USER_REPORT_DETAILS(report.id)}
									>
										{report.title}
									</Link>
								</td>
								<td className="p-3 text-muted-foreground text-sm">
									{format(report.createdAt, "dd.MM.yyyy")}
								</td>
								<td className="p-3 text-muted-foreground text-sm">{report.sum} €</td>
								<td className="p-3">
									<span
										className={cn(
											"flex items-center justify-start gap-1.5 font-medium text-sm",
											report.status === "DRAFT" && "text-muted-foreground",
											report.status === "PENDING_APPROVAL" && "text-yellow-500",
											report.status === "NEEDS_REVISION" && "text-orange-500",
											report.status === "ACCEPTED" && "text-green-600",
											report.status === "PAID" && "text-green-600",
											report.status === "REJECTED" && "text-red-600",
										)}
									>
										<Icon className="size-3.5 shrink-0" />
										<span className="block shrink-0 text-slate-600">
											{tStatus(reportStatusKeys[report.status])}
										</span>
									</span>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

export { DashboardReportList };
