"use client";

import { cn } from "@/lib/utils";
import { SidebarTrigger, useSidebar } from "./ui/sidebar";

function Navbar({ className, ...props }: React.ComponentProps<"nav">) {
	return (
		<nav
			className={cn("h-12 w-full border-b [&>div]:h-12", className)}
			data-slot="navbar"
			{...props}
		/>
	);
}

function NavbarSidebarTrigger({
	className,
	...props
}: React.ComponentProps<typeof SidebarTrigger>) {
	const { open, isMobile } = useSidebar();

	return (
		<SidebarTrigger
			className={cn(open && !isMobile && "hidden", className)}
			{...props}
		/>
	);
}

export { Navbar, NavbarSidebarTrigger };
