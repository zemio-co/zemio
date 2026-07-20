"use client";

import { formatDate } from "date-fns";
import { useTranslations } from "next-intl";
import { PaidNotice } from "@/components/paid-notice";
import { api } from "@/trpc/react";

function ReviewPaidNotice({
	className,
	reportId,
	...props
}: React.ComponentProps<"div"> & { reportId: string }) {
	const t = useTranslations("modules.review.paidNotice");
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

	const date = review.report.paidAt
		? ` am ${formatDate(review.report.paidAt, "dd.MM.yyyy 'um' HH:mm")}`
		: "";

	return (
		<PaidNotice
			className={className}
			dataSlot="review-paid-notice"
			description={t("description", { date })}
			title={t("title")}
			{...props}
		/>
	);
}

export { ReviewPaidNotice };
