"use client";

import { BuildingIcon, Settings2, ShieldUserIcon } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/lib/consts";
import { isOrganizationAdminRole } from "@/lib/organization";
import { authClient } from "@/server/better-auth/client";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "./ui/sidebar";

export function AppSidebarAdmin() {
	const { isPending: rolePending, data: roleData } =
		authClient.useActiveMemberRole();
	const { isPending: sessionPending, data: sessionData } =
		authClient.useSession();

	if (rolePending || sessionPending) return null;

	const isOrgAdmin = roleData?.role
		? isOrganizationAdminRole(roleData.role)
		: false;
	const isPlatformAdmin = sessionData?.user.role === "admin";

	if (!isOrgAdmin && !isPlatformAdmin) return null;

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Admins</SidebarGroupLabel>
			<SidebarMenu>
				{isOrgAdmin && (
					<>
						<SidebarMenuItem>
							<SidebarMenuButton
								render={
									<Link href={ROUTES.ADMIN_DASHBOARD}>
										<ShieldUserIcon />
										Admin Dashboard
									</Link>
								}
							/>
						</SidebarMenuItem>
						<SidebarMenuItem>
							<SidebarMenuButton
								render={
									<Link href={ROUTES.ADMIN_SETTINGS}>
										<Settings2 />
										App Einstellungen
									</Link>
								}
							/>
						</SidebarMenuItem>
					</>
				)}
				{isPlatformAdmin && (
					<SidebarMenuItem>
						<SidebarMenuButton
							render={
								<Link href={ROUTES.PLATFORM_ADMIN_ORGANIZATIONS}>
									<BuildingIcon />
									Organisationen
								</Link>
							}
						/>
					</SidebarMenuItem>
				)}
			</SidebarMenu>
		</SidebarGroup>
	);
}
