"use client";

import { FileIcon, HomeIcon, SettingsIcon, ShieldUserIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type React from "react";
import { ROUTES as DEPR_ROUTES } from "@/lib/consts";
import { isOrganizationAdminRole } from "@/lib/organization";
import { ROUTES } from "@/lib/routes";
import { authClient } from "@/server/better-auth/client";
import ZemioLogo from "../../public/assets/zemio-logo.svg";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarTrigger,
	useSidebar,
} from "./ui/sidebar";
import { UserMenu } from "./user-menu";

const sidebarItems = [
	{
		label: "Dashboard",
		href: DEPR_ROUTES.USER_DASHBOARD,
		icon: HomeIcon,
	},
	{
		label: "Meine Anträge",
		href: ROUTES.USER_REPORTS_LIST(),
		icon: FileIcon,
	},
	{
		label: "Einstellungen",
		href: ROUTES.SETTINGS_USER_GENERAL(),
		icon: SettingsIcon,
	},
];

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { isMobile, open } = useSidebar();

	return (
		<Sidebar {...props}>
			<SidebarHeader className="flex h-12 flex-row items-center justify-between border-b px-4 py-4">
				<Image alt="zemio logo" className="h-5 w-fit" src={ZemioLogo} />
				<SidebarTrigger
					className={"hidden data-[visible=true]:flex"}
					data-visible={open && !isMobile}
				/>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Navigation</SidebarGroupLabel>
					<SidebarMenu>
						{sidebarItems.map((item) => (
							<SidebarMenuItem key={item.href}>
								<SidebarMenuButton
									render={
										<Link href={item.href}>
											<item.icon />
											{item.label}
										</Link>
									}
								/>
							</SidebarMenuItem>
						))}
					</SidebarMenu>
					<SidebarAdminMenu />
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<UserMenu />
			</SidebarFooter>
		</Sidebar>
	);
}

const sidebarAdminItems = [
	{
		label: "Admin Dashboard",
		href: ROUTES.ADMIN_REVIEW_OVERVIEW(),
		icon: ShieldUserIcon,
	},
];

export function SidebarAdminMenu({
	...props
}: React.ComponentProps<typeof SidebarMenu>) {
	const { isPending: rolePending, data: roleData } =
		authClient.useActiveMemberRole();

	if (rolePending) return null;

	const isOrgAdmin = roleData?.role
		? isOrganizationAdminRole(roleData.role)
		: false;

	if (!isOrgAdmin) return null;

	return (
		<SidebarMenu {...props}>
			{sidebarAdminItems.map((item) => (
				<SidebarMenuItem key={item.href}>
					<SidebarMenuButton
						render={
							<Link href={item.href}>
								<item.icon />
								{item.label}
							</Link>
						}
					/>
				</SidebarMenuItem>
			))}
		</SidebarMenu>
	);
}

export { AppSidebar };
