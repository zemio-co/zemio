import Link from "next/link";
import { Navbar, NavbarSidebarTrigger } from "@/components/navbar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

function AdminReportsNavbar({
	className,
	...props
}: React.ComponentProps<typeof Navbar>) {
	return (
		<Navbar className={cn("", className)} data-slot="component" {...props}>
			<div className="container flex max-w-none items-center justify-start">
				<NavbarSidebarTrigger className={"mr-4"} />
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink
								render={<Link href={ROUTES.ADMIN_REVIEW_OVERVIEW()}>Admin</Link>}
							/>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>Reports</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</div>
		</Navbar>
	);
}

export { AdminReportsNavbar };
