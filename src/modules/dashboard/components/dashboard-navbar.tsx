import { Navbar, NavbarSidebarTrigger } from "@/components/navbar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

function DashboardNavbar({
	className,
	...props
}: React.ComponentProps<typeof Navbar>) {
	return (
		<Navbar className={cn("", className)} data-slot="dashboard-navbar" {...props}>
			<div className="container flex items-center justify-start">
				<NavbarSidebarTrigger className={"mr-4"} />
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbPage>Dashboard</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</div>
		</Navbar>
	);
}

export { DashboardNavbar };
