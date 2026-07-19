"use client";

import { formatDate } from "date-fns";
import { StatusIcons } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

function ReportPaidNotice({
	className,
	reportId,
	...props
}: React.ComponentProps<"div"> & { reportId: string }) {
	const reportQuery = api.report.byId.useQuery({ id: reportId });

	if (reportQuery.isPending) {
		return null;
	}

	if (reportQuery.error) {
		return null;
	}

	const { data } = reportQuery;

	if (data.status !== "PAID") {
		return null;
	}
	return (
		<div
			className={cn(
				"flex flex-nowrap items-start justify-start gap-3 rounded-md border px-5 py-4",
				className,
			)}
			data-slot="report-paid-notice"
			{...props}
		>
			<StatusIcons.PAID className="mt-0.5 size-4 shrink-0 text-green-500" />
			<div>
				<p className="font-semibold text-sm text-zinc-800">
					Antrag wurde ausgeglichen
				</p>
				<p className="mt-1 max-w-lg text-sm text-zinc-500">
					Dein Antrag wurde{" "}
					{data.paidAt && `am ${formatDate(data.paidAt, "dd.MM.yyyy 'um' HH:mm")}`}{" "}
					akzeptiert und ausgeglichen. Wende dich bei Fragen bitte an die zuständige
					Person aus deiner Organisation.
				</p>
			</div>
		</div>
	);
}

export { ReportPaidNotice };
