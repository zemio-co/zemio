import { cn } from "@/lib/utils";
import { DashboardNavbar } from "./dashboard-navbar";

function DashboardLayout({
	className,
	children,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div className={cn("", className)} data-slot="component" {...props}>
			<DashboardNavbar />
			{children}
		</div>
	);
}

export { DashboardLayout };
