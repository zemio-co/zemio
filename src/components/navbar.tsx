import { cn } from "@/lib/utils";

function Navbar({ className, ...props }: React.ComponentProps<"nav">) {
	return (
		<nav
			className={cn("h-12 w-full border-b [&>div]:h-12", className)}
			data-slot="navbar"
			{...props}
		/>
	);
}

export { Navbar };
