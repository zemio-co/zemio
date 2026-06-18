import { cn } from "@/lib/utils";
import { ReportDetails } from "./report-details";
import { ReportHeader } from "./report-header";

function ReportContent({
	className,
	reportId,
	...props
}: React.ComponentProps<"div"> & {
	reportId: string;
}) {
	return (
		<div className={cn("py-12", className)} data-slot="report-content" {...props}>
			<ReportHeader reportId={reportId} />
			<div className="container mt-20 grid grid-cols-4 gap-8">
				<div className="col-span-3"></div>
				<ReportDetails reportId={reportId} />
			</div>
		</div>
	);
}

export { ReportContent };
