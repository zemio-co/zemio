import { cn } from "@/lib/utils";

export function PageTitle({ className, ...props }: React.ComponentProps<"h1">) {
	return (
		<h1
			className={cn("font-semibold text-foreground text-lg", className)}
			data-slot="page-title"
			{...props}
		/>
	);
}

export function PageDescription({
	className,
	...props
}: React.ComponentProps<"p">) {
	return (
		<p
			className={cn("text-muted-foreground text-sm", className)}
			data-slot="page-description"
			{...props}
		/>
	);
}
