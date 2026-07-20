"use client";

import { formatDate } from "date-fns";
import { PaidNotice } from "@/components/paid-notice";
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
		<PaidNotice
			className={className}
			dataSlot="report-paid-notice"
			description={
				<>
					Dein Antrag wurde{" "}
					{data.paidAt && `am ${formatDate(data.paidAt, "dd.MM.yyyy 'um' HH:mm")}`}{" "}
					akzeptiert und ausgeglichen. Wende dich bei Fragen bitte an die zuständige
					Person aus deiner Organisation.
				</>
			}
			title="Antrag wurde ausgeglichen"
			{...props}
		/>
	);
}

export { ReportPaidNotice };
