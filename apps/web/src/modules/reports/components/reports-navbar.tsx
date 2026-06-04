import { Navbar, NavbarSidebarTrigger } from "@/components/navbar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

function ReportsNavbar({
	className,
	...props
}: React.ComponentProps<typeof Navbar>) {
	return (
		<Navbar className={cn("", className)} data-slot="reports-navbar" {...props}>
			<div className="container flex max-w-none items-center justify-start">
				<NavbarSidebarTrigger className={"mr-4"} />
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbPage>Reports</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</div>
		</Navbar>
	);
}

export { ReportsNavbar };
