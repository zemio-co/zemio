import { createAppTranslator } from "@zemio/i18n";
import {
	ArrowLeftIcon,
	EuroIcon,
	FolderTreeIcon,
	SettingsIcon,
	UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { ADMIN_SETTINGS_MENU, ROUTES } from "@/lib/consts";

const t = createAppTranslator({
	namespace: "modules.shared.adminSettingsSidebar",
});
const tActions = createAppTranslator({ namespace: "modules.settings.actions" });

const settingsMenu = [
	{
		label: t("nav.general"),
		href: ADMIN_SETTINGS_MENU.GENERAL,
		icon: SettingsIcon,
	},
	{
		label: t("nav.users"),
		href: ADMIN_SETTINGS_MENU.USERS,
		icon: UsersIcon,
	},
	{
		label: t("nav.allowances"),
		href: ADMIN_SETTINGS_MENU.ALLOWANCES,
		icon: EuroIcon,
	},
	{
		label: t("nav.costUnits"),
		href: ADMIN_SETTINGS_MENU.COST_UNITS,
		icon: FolderTreeIcon,
	},
];

export function AdminSettingsSidebar({
	...props
}: React.ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar {...props}>
			<SidebarHeader>
				<Button
					className={"w-fit justify-start"}
					nativeButton={false}
					render={
						<Link href={ROUTES.ADMIN_DASHBOARD}>
							<ArrowLeftIcon /> {tActions("back")}
						</Link>
					}
					variant={"ghost"}
				/>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>{t("settingsLabel")}</SidebarGroupLabel>
					<SidebarMenu>
						{settingsMenu.map((item) => (
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
			</SidebarContent>
		</Sidebar>
	);
}
