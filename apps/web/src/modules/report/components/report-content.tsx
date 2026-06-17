import { cn } from "@/lib/utils";
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
		</div>
	);
}

export { ReportContent };
