import { HomeIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ROUTES } from "@/lib/consts";
import { HydrateClient } from "@/trpc/server";
import { AppSidebarAdmin } from "./app-sidebar-admin";
import { OrgSwitcher } from "./org-switcher";
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
} from "./ui/sidebar";
import { UserMenu } from "./user-menu";

const sidebarItems = [
	{
		label: "Dashboard",
		href: ROUTES.USER_DASHBOARD,
		icon: HomeIcon,
	},
	{
		label: "Einstellungen",
		href: ROUTES.USER_SETTINGS,
		icon: SettingsIcon,
	},
];

export function AppSidebar() {
	return (
		<HydrateClient>
			<Sidebar variant="inset">
				<SidebarHeader>
					<OrgSwitcher />
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
					</SidebarGroup>
					<Suspense>
						<AppSidebarAdmin />
					</Suspense>
				</SidebarContent>
				<SidebarFooter>
					<UserMenu />
				</SidebarFooter>
			</Sidebar>
		</HydrateClient>
	);
}
