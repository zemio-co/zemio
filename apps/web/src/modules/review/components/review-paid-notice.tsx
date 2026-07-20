"use client";

import { formatDate } from "date-fns";
import { PaidNotice } from "@/components/paid-notice";
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
		<PaidNotice
			className={className}
			dataSlot="review-paid-notice"
			description={
				<>
					Dieser Antrag wurde{" "}
					{review.report.paidAt &&
						`am ${formatDate(review.report.paidAt, "dd.MM.yyyy 'um' HH:mm")}`}{" "}
					ausgeglichen und kann nicht mehr bearbeitet werden. Du kannst ihn noch
					einsehen und exportieren.
				</>
			}
			title="Antrag wurde ausgeglichen"
			{...props}
		/>
	);
}

export { ReviewPaidNotice };
