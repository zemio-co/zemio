"use client";

import { formatDate } from "date-fns";
import { StatusIcons } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

function ReviewPaidNotice({
	className,
	reportId,
	...props
}: React.ComponentProps<"div"> & { reportId: string }) {
	const {
		data: review,
		error,
		isPending,
	} = api.report.review.useQuery({
		id: reportId,
	});

	if (isPending) {
		return null;
	}

	if (error) {
		return null;
	}

	if (review.report.status !== "PAID") {
		return null;
	}
	return (
		<div
			className={cn(
				"flex flex-nowrap items-start justify-start gap-3 rounded-md border px-5 py-4",
				className,
			)}
			data-slot="review-paid-notice"
			{...props}
		>
			<StatusIcons.PAID className="mt-0.5 size-4 shrink-0 text-green-500" />
			<div>
				<p className="font-semibold text-sm text-zinc-800">
					Antrag wurde ausgeglichen
				</p>
				<p className="mt-1 max-w-lg text-sm text-zinc-500">
					Dieser Antrag wurde{" "}
					{review.report.paidAt &&
						`am ${formatDate(review.report.paidAt, "dd.MM.yyyy 'um' HH:mm")}`}{" "}
					ausgeglichen und kann nicht mehr bearbeitet werden. Du kannst ihn noch
					einsehen und exportieren.
				</p>
			</div>
		</div>
	);
}

export { ReviewPaidNotice };
