import { cn } from "@/lib/utils";

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
			{/* TODO: Move app content to this component */}
		</div>
	);
}

export { AdminReportsContent };
