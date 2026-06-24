"use client";

import { ArrowLeftIcon, BuildingIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";
import { cn } from "@/lib/utils";

function AdminSidebar({ className, ...props }: React.ComponentProps<"aside">) {
	return (
		<aside className={cn("", className)} {...props}>
			<Link
				className={
					"flex w-fit items-center justify-center gap-1.5 px-2.5 font-medium text-blue-600 text-sm"
				}
				href={"/"}
			>
				<ArrowLeftIcon className="size-3.5" />
				Zurück
			</Link>
			<div className="mt-8 space-y-1">
				<AdminSidebarButton href={"/platform-admin/organizations"}>
					<BuildingIcon /> Organizations
				</AdminSidebarButton>
			</div>
		</aside>
	);
}

function AdminSidebarButton({
	className,
	href,
	...props
}: React.ComponentProps<typeof Link>) {
	const pathname = usePathname();

	return (
		<Link
			className={cn(
				"flex h-8 items-center justify-start gap-1.5 rounded-md px-2.5 font-medium text-sm text-zinc-800 [&_svg]:size-3.5 [&_svg]:text-zinc-500",
				pathname === href && "bg-zinc-200/60",
				className,
			)}
			href={href}
			{...props}
		/>
	);
}

export { AdminSidebar };
