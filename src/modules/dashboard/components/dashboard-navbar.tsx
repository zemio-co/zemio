import { Navbar, NavbarSidebarTrigger } from "@/components/navbar";
import { cn } from "@/lib/utils";

function DashboardNavbar({
	className,
	...props
}: React.ComponentProps<typeof Navbar>) {
	return (
		<Navbar className={cn("", className)} data-slot="dashboard-navbar" {...props}>
			<div className="container flex items-center justify-start">
				<NavbarSidebarTrigger />
			</div>
		</Navbar>
	);
}

export { DashboardNavbar };
