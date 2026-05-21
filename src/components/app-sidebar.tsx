import { FileIcon, HomeIcon, SettingsIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ROUTES as DEPR_ROUTES } from "@/lib/consts";
import { ROUTES } from "@/lib/routes";
import { HydrateClient } from "@/trpc/server";
import ZemioLogo from "../../public/assets/zemio-logo.svg";
import { AppSidebarAdmin } from "./app-sidebar-admin";
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

export function AppSidebar() {
	return (
		<HydrateClient>
			<Sidebar>
				<SidebarHeader className="px-4 py-4">
					<Image alt="zemio logo" className="h-5 w-fit" src={ZemioLogo} />
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Navigationdf</SidebarGroupLabel>
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
