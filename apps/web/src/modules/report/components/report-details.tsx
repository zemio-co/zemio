"use client";

import { Button as ButtonPrimitive } from "@base-ui/react";
import { useQueries } from "@tanstack/react-query";
import { formatDate, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import {
	CalendarPlusIcon,
	CalendarSyncIcon,
	CheckIcon,
	CopyIcon,
	EuroIcon,
	LandmarkIcon,
	TagIcon,
	UserIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

function ReportDetails({
	className,
	reportId,
	...props
}: React.ComponentProps<"aside"> & {
	reportId: string;
}) {
	const utils = api.useUtils();

	const queries = useQueries({
		queries: [
			utils.report.byId.queryOptions({ id: reportId }),
			utils.report.financialSummary.queryOptions({ id: reportId }),
		],
	});

	const [reportQuery, financialQuery] = queries;

	if (reportQuery.isPending || financialQuery.isPending) {
		return <ReportDetailsLoading className={className} {...props} />;
	}

	if (reportQuery.error || financialQuery.error) {
		return (
			<aside className={cn("", className)} data-slot="report-details" {...props}>
				<h3 className="font-semibold text-lg text-slate-800">Details</h3>
				<p className="mt-6 text-center font-medium text-destructive text-sm">
					Unable to load report details
				</p>
			</aside>
		);
	}

	const { data: report } = reportQuery;

	return (
		<aside className={cn("", className)} data-slot="report-details" {...props}>
			<h3 className="font-semibold text-lg text-slate-800">Details</h3>
			<div className="mt-6 space-y-6">
				<ReportDetail
					icon={<EuroIcon />}
					render={(v) => `${v.toFixed(2)} EUR`}
					title="Summe"
					value={financialQuery.data.totalAmount}
				/>

				<ReportDetail
					icon={<LandmarkIcon />}
					title="IBAN"
					value={financialQuery.data.iban}
				/>

				<ReportDetail
					icon={<UserIcon />}
					title="Kontoname"
					value={financialQuery.data.ownerName}
				/>

				<Separator />

				<ReportDetail
					render={() => (
						<>
							<Avatar className={"mt-0.5 size-4"}>
								<AvatarImage src={report.owner.image ?? undefined} />
								<AvatarFallback className={"text-xs"}>
									{report.owner.name.charAt(0)?.toUpperCase()}
								</AvatarFallback>
							</Avatar>
							{report.owner.name}
						</>
					)}
					title="Antragssteller"
					value={report.owner.name}
				/>

				<ReportDetail
					icon={<TagIcon />}
					render={(v) => `${v} · ${report.costUnit.title}`}
					title="Kostenstelle"
					value={report.costUnit.tag}
				/>

				<ReportDetail
					disableCopy
					icon={<CalendarPlusIcon />}
					render={(v) => {
						return (
							<Tooltip>
								<TooltipTrigger>
									<span>
										{formatDistanceToNow(v, {
											addSuffix: true,
											locale: de,
										})}
									</span>
								</TooltipTrigger>
								<TooltipContent>
									{formatDate(v, "dd. MMM yyyy 'um' HH:mm", {
										locale: de,
									})}
								</TooltipContent>
							</Tooltip>
						);
					}}
					title="Erstellt"
					value={report.createdAt}
				/>

				<ReportDetail
					disableCopy
					icon={<CalendarSyncIcon />}
					render={(v) => {
						return (
							<Tooltip>
								<TooltipTrigger>
									<span>
										{formatDistanceToNow(v, {
											addSuffix: true,
											locale: de,
										})}
									</span>
								</TooltipTrigger>
								<TooltipContent>
									{formatDate(v, "dd. MMM yyyy 'um' HH:mm", {
										locale: de,
									})}
								</TooltipContent>
							</Tooltip>
						);
					}}
					title="Zuletzt bearbeitet"
					value={report.lastUpdatedAt}
				/>
			</div>
		</aside>
	);
}

function ReportDetailsLoading({
	className,
	...props
}: React.ComponentProps<"aside">) {
	return (
		<aside
			className={cn("", className)}
			data-slot="report-details-loading"
			{...props}
		>
			<Skeleton className="h-6" />
			<div className="mt-6 w-full space-y-8">
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
			</div>
		</aside>
	);
}

function ReportDetail<T extends string | number | Date>({
	className,
	title,
	value,
	disableCopy = false,
	icon,
	render,
	...props
}: Omit<React.ComponentProps<"div">, "title" | "value" | "children"> & {
	title: string;
	value: T;
	render?: (value: T) => ReactNode;
	icon?: ReactNode;
	disableCopy?: boolean;
}) {
	const [copied, setCopied] = useState(false);

	function handleCopy() {
		navigator.clipboard.writeText(String(value)).then(
			() => {
				setCopied(true);
				setTimeout(() => setCopied(false), 1500);
			},
			() => {},
		);
	}

	const formatValue = (value: T): string | number => {
		if (value instanceof Date) {
			return value.toLocaleString();
		}

		return value as string | number;
	};

	return (
		<div
			className={cn("space-y-1", className)}
			data-slot="report-detail"
			{...props}
		>
			<p className="font-medium text-slate-800 text-sm">{title}</p>
			<div>
				{disableCopy ? (
					<span className="flex -translate-x-1.5 items-start justify-start gap-2 rounded-sm px-1.5 py-1 text-slate-700 text-sm *:text-start [&_svg:not([class*='mt-'])]:mt-0.5 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-slate-500 [&_svg]:shrink-0">
						{icon}
						{render?.(value) || formatValue(value)}
					</span>
				) : (
					<ButtonPrimitive
						className="group/button flex -translate-x-1.5 cursor-pointer items-start justify-start gap-2"
						onClick={handleCopy}
						type="button"
					>
						<span className="flex items-start justify-start gap-2 rounded-sm px-1.5 py-1 text-start text-slate-700 text-sm transition-colors group-hover/button:bg-slate-100 [&_svg:not([class*='mt-'])]:mt-0.5 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-slate-500 [&_svg]:shrink-0">
							{icon}
							{render?.(value) || formatValue(value)}
						</span>
						<AnimatePresence initial={false} mode="wait">
							{copied ? (
								<motion.span
									animate={{ opacity: 1, scale: 1 }}
									className="mt-1.25 flex size-4 shrink-0 items-center justify-center"
									exit={{ opacity: 0, scale: 0.8 }}
									initial={{ opacity: 0, scale: 0.8 }}
									key="check"
									transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
								>
									<CheckIcon className="size-4 text-slate-500" />
								</motion.span>
							) : (
								<motion.span
									className="mt-1.25 flex size-4 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover/button:opacity-100"
									key="copy"
								>
									<CopyIcon className="size-4 text-slate-500" />
								</motion.span>
							)}
						</AnimatePresence>
					</ButtonPrimitive>
				)}
			</div>
		</div>
	);
}

export { ReportDetails };
