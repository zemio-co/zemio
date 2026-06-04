"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { SignOut } from "./sign-out";
import { SidebarTrigger } from "./ui/sidebar";

export function SiteHeader({
	className,
	...props
}: React.ComponentProps<"header">) {
	return (
		<header
			className={cn(
				"sticky top-0 z-50 border-b bg-background/95 backdrop-blur",
				className,
			)}
			data-slot="site-header"
			{...props}
		>
			<div className="container py-2">
				<div className="flex items-center justify-start gap-4">
					<SidebarTrigger className={"me-auto"} />
					<ThemeToggle variant={"outline"} />
					<SignOut />
				</div>
			</div>
		</header>
	);
}
