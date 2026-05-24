import { cn } from "@/lib/utils";
import { ReportsList } from "./list";
import { ReportsNavbar } from "./reports-navbar";

function ReportsContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div className={cn("", className)} data-slot="component" {...props}>
			<ReportsNavbar />
			<ReportsList />
		</div>
	);
}

export { ReportsContent };
