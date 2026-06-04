import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";
import { cn } from "@/lib/utils";

function SettingsSidebar({
	className,
	...props
}: React.ComponentProps<"aside">) {
	return (
		<aside
			className={cn("", className)}
			data-slot={"settings-sidebar"}
			{...props}
		/>
	);
}

function SettingsSidebarMenu({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("space-y-1", className)}
			data-slot={"settings-sidebar-menu"}
			{...props}
		/>
	);
}

function SettingsSidebarMenuItem({
	className,
	href,
	...props
}: React.ComponentProps<typeof Link>) {
	const pathname = usePathname();

	return (
		<Link
			className={cn(
				"flex h-8 items-center justify-start gap-1.5 rounded-md px-2.5 font-medium text-sm text-zinc-800 data-active:bg-zinc-200/60 [&_svg]:size-3.5 [&_svg]:text-zinc-500",
				className,
			)}
			{...(pathname.startsWith(href.toString()) ? { "data-active": true } : {})}
			href={href}
			{...props}
		/>
	);
}

export {
	SettingsSidebar,
	SettingsSidebar as Root,
	SettingsSidebarMenu,
	SettingsSidebarMenu as Menu,
	SettingsSidebarMenuItem,
	SettingsSidebarMenuItem as Item,
};
