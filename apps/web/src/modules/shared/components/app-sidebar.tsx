"use client";

import {
	ChartPieIcon,
	FileIcon,
	HomeIcon,
	ListIcon,
	SettingsIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { isOrganizationAdminRole } from "@/lib/organization";
import { ROUTES } from "@/lib/routes";
import { authClient } from "@/server/better-auth/client";
import { AppSidebarMenu } from "./app-sidebar-menu";

const sidebarItems = [
	{
		label: "Dashboard",
		href: ROUTES.USER_DASHBOARD(),
		icon: HomeIcon,
		active: (pathname: string) => {
			return pathname === ROUTES.USER_DASHBOARD();
		},
	},
	{
		label: "Meine Anträge",
		href: ROUTES.USER_REPORTS_LIST(),
		icon: FileIcon,
		active: (pathname: string) => {
			return pathname.startsWith(ROUTES.USER_REPORTS_LIST());
		},
	},
	{
		label: "Einstellungen",
		href: ROUTES.SETTINGS(),
		icon: SettingsIcon,
		active: (pathname: string) => {
			return pathname.startsWith(ROUTES.SETTINGS());
		},
	},
];

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const pathname = usePathname();

	return (
		<Sidebar {...props}>
			<SidebarHeader className="h-16 px-4 py-4">
				<AppSidebarMenu />
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarMenu>
						{sidebarItems.map((item) => (
							<SidebarMenuItem key={item.href}>
								<SidebarMenuButton
									isActive={item.active(pathname)}
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
				</SidebarGroup>
				<SidebarAdminMenu pathname={pathname} />
			</SidebarContent>
		</Sidebar>
	);
}

const sidebarAdminItems = [
	{
		label: "Reporting",
		href: ROUTES.ADMIN_REPORTING(),
		icon: ChartPieIcon,
		active: (pathname: string) => {
			return pathname.startsWith(ROUTES.ADMIN_REPORTING());
		},
	},
	{
		label: "Anträge",
		href: ROUTES.ADMIN_REVIEW_OVERVIEW(),
		icon: ListIcon,
		active: (pathname: string) => {
			return pathname.startsWith(ROUTES.ADMIN_REVIEW_OVERVIEW());
		},
	},
];

function SidebarAdminMenu({ pathname }: { pathname: string }) {
	const { isPending: rolePending, data: roleData } =
		authClient.useActiveMemberRole();

	if (rolePending) return null;

	const isOrgAdmin = roleData?.role
		? isOrganizationAdminRole(roleData.role)
		: false;

	if (!isOrgAdmin) return null;

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Administration</SidebarGroupLabel>
			<SidebarMenu>
				{sidebarAdminItems.map((item) => (
					<SidebarMenuItem key={item.href}>
						<SidebarMenuButton
							isActive={item.active(pathname)}
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
		</SidebarGroup>
	);
}

export { AppSidebar };
