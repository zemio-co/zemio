import { format } from "date-fns";
import Link from "next/link";
import type { Report } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { ReportStatusBadge } from "./report-status-badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "./ui/card";

export function ReportCard<T extends Report>({
	className,
	report,
	children,
	reportRoute,
	...props
}: React.ComponentProps<typeof Card> & {
	report: T;
	reportRoute: string;
}) {
	return (
		<Card
			className={cn(
				"relative flex h-full flex-col transition-colors group-hover/list-item:bg-muted",
				className,
			)}
			data-slot="report-card"
			{...props}
		>
			<CardHeader>
				<div className="flex flex-col flex-wrap items-start justify-between gap-2 sm:flex-row sm:flex-wrap-reverse">
					<CardTitle className="order-2 sm:order-1">
						<Link
							className="group/list-item focus:outline-0"
							href={reportRoute.replace(":reportId", report.id)}
						>
							<span
								aria-hidden="true"
								className={cn(
									"absolute inset-0 z-50 h-full w-full rounded-lg transition-colors",
									"group-focus/list-item:ring-2 group-focus/list-item:ring-ring group-focus/list-item:ring-offset-4 group-focus/list-item:ring-offset-background",
								)}
							/>
							{report.title}
						</Link>
					</CardTitle>
					<ReportStatusBadge className="sm:order-2" status={report.status} />
				</div>
				<CardDescription className="line-clamp-2">
					{report.description}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex-1 border-t pt-4">
				<dl className="grid gap-4">{children}</dl>
			</CardContent>
			<CardFooter className="py-2">
				<span className="text-xs">
					Erstellt am {format(report.createdAt, "dd.MM.yyyy")} um{" "}
					{format(report.createdAt, "HH:mm")} Uhr
				</span>
			</CardFooter>
		</Card>
	);
}

export function ReportCardField({
	className,
	label,
	value,
	...props
}: React.ComponentProps<"div"> & { label: string; value: string }) {
	return (
		<div
			className={cn("grid grid-cols-2", className)}
			data-slot="report-card-field"
			{...props}
		>
			<dt className="text-muted-foreground text-sm">{label}</dt>
			<dd className="font-medium text-foreground text-sm">{value}</dd>
		</div>
	);
}
