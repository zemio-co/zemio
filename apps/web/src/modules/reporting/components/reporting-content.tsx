import { cn } from "@/lib/utils";

function ReportingContent({
	className,
	...props
}: React.ComponentProps<"main">) {
	return (
		<main
			className={cn("", className)}
			data-slot="reporting-content"
			{...props}
		/>
	);
}

export { ReportingContent };
