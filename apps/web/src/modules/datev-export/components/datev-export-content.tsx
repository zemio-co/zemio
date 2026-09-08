"use client";

import { format } from "date-fns";
import { de } from "date-fns/locale";
import { AlertTriangleIcon, DownloadIcon, InfoIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type {
	PreflightBlocker,
	PreflightNotice,
} from "@/server/modules/datev-export";
import { api } from "@/trpc/react";

/**
 * Selectable months, newest first, as whole UTC days.
 *
 * A month rather than a free range: accounting works in periods, the Kanzlei
 * expects a monthly stapel, and a month can never straddle the fiscal-year
 * boundary the preflight would otherwise refuse. The current month is offered
 * too — reports paid so far in it are exportable, the rest follow next time.
 *
 * UTC because the whole export path reads these dates with `getUTC*`; a local
 * midnight would shift the window by a day east of UTC.
 */
function selectableMonths(count = 18) {
	const now = new Date();
	const anchor = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);

	return Array.from({ length: count }, (_, index) => {
		const from = new Date(anchor);
		from.setUTCMonth(from.getUTCMonth() - index);
		// Day 0 of the next month is the last day of this one.
		const to = new Date(
			Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 0),
		);

		return {
			value: `${from.getUTCFullYear()}-${String(from.getUTCMonth() + 1).padStart(2, "0")}`,
			label: format(from, "LLLL yyyy", { locale: de }),
			periodFrom: from,
			periodTo: to,
		};
	});
}

function DatevExportContent({
	className,
	...props
}: React.ComponentProps<"main">) {
	const t = useTranslations("modules.datevExport");
	const months = selectableMonths();
	// Last month by default: the month just closed is the one a Kanzlei asks for.
	const [selected, setSelected] = useState(months[1]?.value ?? months[0]?.value);
	const month = months.find((option) => option.value === selected) ?? months[0];

	return (
		<main className={cn("py-8", className)} data-slot="datev-export" {...props}>
			<section className="container">
				<h1 className="font-semibold text-2xl text-slate-800">{t("title")}</h1>
				<p className="mt-1 max-w-prose text-slate-500 text-sm/relaxed">
					{t("description")}
				</p>
				<Separator className="mt-4" />
			</section>

			{month && (
				<section className="container mt-8 space-y-6">
					<div className="flex flex-wrap items-end gap-4">
						<div className="space-y-1">
							<span className="block font-medium text-slate-700 text-sm">
								{t("period.label")}
							</span>
							<Select
								items={months.map((option) => ({
									value: option.value,
									label: option.label,
								}))}
								onValueChange={(value) => setSelected(value ?? undefined)}
								value={month.value}
							>
								<SelectTrigger className="w-56">
									<SelectValue placeholder={t("period.placeholder")} />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{months.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												<span>{option.label}</span>
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
					</div>

					<PeriodPanel periodFrom={month.periodFrom} periodTo={month.periodTo} />
				</section>
			)}

			<section className="container mt-12">
				<ExportHistory />
			</section>
		</main>
	);
}

function PeriodPanel({
	periodFrom,
	periodTo,
}: {
	periodFrom: Date;
	periodTo: Date;
}) {
	const t = useTranslations("modules.datevExport");
	const preview = api.datevExport.preview.useQuery({ periodFrom, periodTo });

	if (preview.isPending) {
		return <Skeleton className="h-40 w-full" />;
	}

	if (preview.error) {
		return (
			<Panel tone="danger">
				<p className="font-medium text-sm">{t("loadErrorTitle")}</p>
				<p className="text-xs">{preview.error.message}</p>
			</Panel>
		);
	}

	const { blockers, bookingCount, notices, reportCount } = preview.data;
	const hasBlockers = blockers.length > 0;

	return (
		<div className="space-y-4">
			<p className="text-slate-600 text-sm">
				{bookingCount === 0
					? t("preview.empty")
					: t("preview.summary", {
							bookings: t("preview.bookings", { count: bookingCount }),
							reports: t("preview.reports", { count: reportCount }),
						})}
			</p>

			{hasBlockers && (
				<Panel tone="danger">
					<p className="flex items-center gap-2 font-medium text-sm">
						<AlertTriangleIcon className="size-4 shrink-0" />
						{t("blockers.title")}
					</p>
					<ul className="mt-2 space-y-2 text-sm/relaxed">
						{blockers.map((blocker) => (
							<li key={blockerKey(blocker)}>
								<BlockerMessage blocker={blocker} />
							</li>
						))}
					</ul>
				</Panel>
			)}

			{notices.length > 0 && (
				<Panel tone="info">
					<p className="flex items-center gap-2 font-medium text-sm">
						<InfoIcon className="size-4 shrink-0" />
						{t("notices.title")}
					</p>
					<ul className="mt-2 space-y-1 text-sm/relaxed">
						{notices.map((notice) => (
							<li key={`${notice.kind}-${notice.reportTag}`}>
								<NoticeMessage notice={notice} />
							</li>
						))}
					</ul>
				</Panel>
			)}

			<CreateButton
				disabled={hasBlockers || bookingCount === 0}
				periodFrom={periodFrom}
				periodTo={periodTo}
			/>
		</div>
	);
}

/** Stable within one render; blockers of one kind are already grouped. */
function blockerKey(blocker: PreflightBlocker): string {
	return blocker.kind === "costUnitNotExportable"
		? `${blocker.kind}-${blocker.costUnitTag}`
		: blocker.kind;
}

function BlockerMessage({ blocker }: { blocker: PreflightBlocker }) {
	const t = useTranslations("modules.datevExport");
	const tFields = useTranslations("modules.datevExport.fields");

	switch (blocker.kind) {
		case "missingConfiguration":
			return (
				<>
					{t("blockers.missingConfiguration", {
						fields: blocker.fields.map((field) => tFields(field)).join(", "),
					})}{" "}
					<Link
						className="font-semibold text-accent-600 hover:text-accent-400"
						href={ROUTES.SETTINGS_ORG_DATEV()}
					>
						{t("blockers.settingsLink")}
					</Link>
				</>
			);
		case "costUnitNotExportable":
			return (
				<>
					{t("blockers.costUnitNotExportable", {
						reports: blocker.reportTags.join(", "),
						tag: blocker.costUnitTag,
					})}
				</>
			);
		case "periodCrossesFiscalYear":
			return <>{t("blockers.periodCrossesFiscalYear")}</>;
	}
}

function NoticeMessage({ notice }: { notice: PreflightNotice }) {
	const t = useTranslations("modules.datevExport");

	switch (notice.kind) {
		case "zeroAmountSkipped":
			return (
				<>
					{t("notices.zeroAmountSkipped", {
						count: notice.count,
						tag: notice.reportTag,
					})}
				</>
			);
		case "reportWithoutBookings":
			return <>{t("notices.reportWithoutBookings", { tag: notice.reportTag })}</>;
	}
}

function CreateButton({
	disabled,
	periodFrom,
	periodTo,
}: {
	disabled: boolean;
	periodFrom: Date;
	periodTo: Date;
}) {
	const t = useTranslations("modules.datevExport");
	const utils = api.useUtils();

	const create = api.datevExport.create.useMutation({
		onSuccess: (result) => {
			// A blocked or empty result is not a failure — the panel above already
			// says why, and the freshly invalidated preview will repeat it.
			if (result.status === "created") {
				toast.success(t("create.successTitle"), {
					description: t("create.successDescription"),
				});
				window.open(result.url, "_blank");
			}

			void utils.datevExport.preview.invalidate();
			void utils.datevExport.list.invalidate();
		},
		onError: (error) => {
			toast.error(t("create.errorTitle"), {
				description: error.message ?? t("create.errorFallback"),
			});
		},
	});

	return (
		<Button
			disabled={disabled || create.isPending}
			onClick={() => create.mutate({ periodFrom, periodTo })}
		>
			{create.isPending ? t("create.pending") : t("create.button")}
		</Button>
	);
}

function ExportHistory() {
	const t = useTranslations("modules.datevExport.history");
	const tRoot = useTranslations("modules.datevExport");
	const query = api.datevExport.list.useQuery();

	const download = api.datevExport.download.useMutation({
		onSuccess: (result) => window.open(result.url, "_blank"),
		onError: (error) =>
			toast.error(t("downloadErrorTitle"), { description: error.message }),
	});

	return (
		<div className="space-y-3">
			<div>
				<h2 className="font-semibold text-lg text-slate-800">{t("title")}</h2>
				<p className="mt-1 max-w-prose text-slate-500 text-sm/relaxed">
					{t("description")}
				</p>
			</div>

			{query.isPending && <Skeleton className="h-24 w-full" />}

			{query.error && (
				<Panel tone="danger">
					<p className="font-medium text-sm">{tRoot("loadErrorTitle")}</p>
					<p className="text-xs">{query.error.message}</p>
				</Panel>
			)}

			{query.data?.length === 0 && (
				<p className="rounded-md border border-dashed px-6 py-8 text-center text-slate-500 text-sm">
					{t("empty")}
				</p>
			)}

			{query.data && query.data.length > 0 && (
				<div className="w-full overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="bg-zinc-100">
								<th className="rounded-l-md px-3 py-2 text-left font-medium text-muted-foreground text-xs">
									{t("columnPeriod")}
								</th>
								<th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">
									{t("columnCreated")}
								</th>
								<th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">
									{t("columnCreatedBy")}
								</th>
								<th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">
									{t("columnReports")}
								</th>
								<th className="rounded-r-md px-3 py-2" />
							</tr>
						</thead>
						<tbody>
							{query.data.map((row) => (
								<tr key={row.id}>
									<td className="px-3 py-3 text-sm">
										{format(row.periodFrom, "dd.MM.yyyy")} –{" "}
										{format(row.periodTo, "dd.MM.yyyy")}
									</td>
									<td className="p-3 text-muted-foreground text-sm">
										{format(row.createdAt, "dd.MM.yyyy")}
									</td>
									<td className="p-3 text-muted-foreground text-sm">
										{row.createdByName}
									</td>
									<td className="p-3 text-muted-foreground text-sm">
										{row.reportCount}
									</td>
									<td className="p-3 text-right">
										<Button
											disabled={download.isPending}
											onClick={() => download.mutate({ id: row.id })}
											size="sm"
											variant="ghost"
										>
											<DownloadIcon className="size-4" />
											{t("download")}
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

function Panel({
	children,
	tone,
}: {
	children: React.ReactNode;
	tone: "danger" | "info";
}) {
	return (
		<div
			className={cn(
				"rounded-md border px-4 py-3",
				tone === "danger"
					? "border-red-200 bg-red-50 text-red-800"
					: "border-yellow-200 bg-yellow-50 text-yellow-900",
			)}
		>
			{children}
		</div>
	);
}

export { DatevExportContent };
