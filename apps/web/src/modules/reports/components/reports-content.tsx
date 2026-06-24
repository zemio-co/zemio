import { cn } from "@/lib/utils";
import { ReportsList } from "./list";

function ReportsContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div className={cn("", className)} data-slot="component" {...props}>
			<ReportsList />
		</div>
	);
}

export { ReportsContent };
