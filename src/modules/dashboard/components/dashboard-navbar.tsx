import { Navbar } from "@/components/navbar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

function DashboardNavbar({
	className,
	...props
}: React.ComponentProps<typeof Navbar>) {
	return (
		<Navbar className={cn("", className)} data-slot="dashboard-navbar" {...props}>
			<div className="container flex items-center justify-start">
				<SidebarTrigger />
			</div>
		</Navbar>
	);
}

export { DashboardNavbar };
