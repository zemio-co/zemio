"use client";

import { formatDate } from "date-fns";
import { useTranslations } from "next-intl";
import { PaidNotice } from "@/components/paid-notice";
import { api } from "@/trpc/react";

function ReportPaidNotice({
	className,
	reportId,
	...props
}: React.ComponentProps<"div"> & { reportId: string }) {
	const t = useTranslations("modules.report.paidNotice");
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
		<PaidNotice
			className={className}
			dataSlot="report-paid-notice"
			description={t("description", {
				hasDate: data.paidAt ? "yes" : "other",
				date: data.paidAt ? formatDate(data.paidAt, "dd.MM.yyyy 'um' HH:mm") : "",
			})}
			title={t("title")}
			{...props}
		/>
	);
}

export { ReportPaidNotice };
