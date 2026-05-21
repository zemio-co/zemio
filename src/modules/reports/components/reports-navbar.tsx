import { Navbar } from "@/components/navbar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

function ReportsNavbar({
	className,
	...props
}: React.ComponentProps<typeof Navbar>) {
	return (
		<Navbar className={cn("", className)} data-slot="component" {...props}>
			<div className="container flex items-center justify-start">
				<SidebarTrigger />
			</div>
		</Navbar>
	);
}

export { ReportsNavbar };
