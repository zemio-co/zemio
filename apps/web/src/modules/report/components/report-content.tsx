import { cn } from "@/lib/utils";
import { ReportActivity } from "./report-activity";
import { ReportAttachments } from "./report-attachments";
import { ReportDetails } from "./report-details";
import { ReportExpenses } from "./report-expenses";
import { ReportHeader } from "./report-header";
import { ReportPaidNotice } from "./report-paid-notice";

function ReportContent({
	className,
	reportId,
	...props
}: React.ComponentProps<"div"> & {
	reportId: string;
}) {
	return (
		<div className={cn("py-12", className)} data-slot="report-content" {...props}>
			<div className="container mb-8">
				<ReportPaidNotice reportId={reportId} />
			</div>
			<ReportHeader reportId={reportId} />
			<div className="container mt-20 grid gap-24 lg:grid-cols-4 lg:gap-12">
				<div className="space-y-24 lg:col-span-3">
					<ReportExpenses reportId={reportId} />
					<ReportAttachments reportId={reportId} />
					<ReportActivity reportId={reportId} />
				</div>
				<ReportDetails reportId={reportId} />
			</div>
		</div>
	);
}

export { ReportContent };
