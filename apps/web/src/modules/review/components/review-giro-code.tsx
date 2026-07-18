import { cn } from "@/lib/utils";

function ReviewGiroCode({ className, ...props }: React.ComponentProps<"div">) {
	return <div className={cn("", className)} data-slot="component" {...props} />;
}

export { ReviewGiroCode };
