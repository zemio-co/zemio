import { cn } from "@/lib/utils";

function AuthMagicLinkSent({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("", className)}
			data-slot="auth-magic-link-sent"
			{...props}
		/>
	);
}

export { AuthMagicLinkSent };
