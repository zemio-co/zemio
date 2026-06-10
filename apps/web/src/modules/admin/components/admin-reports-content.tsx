import { cn } from "@/lib/utils";
import { AdminReportsNavbar } from "./admin-reports-navbar";

function AdminReportsContent({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("", className)}
			data-slot="admin-reports-content"
			{...props}
		>
			<AdminReportsNavbar />
		</div>
	);
}

export { AdminReportsContent };
