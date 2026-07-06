"use client";

import {
	BanknoteIcon,
	BellIcon,
	BuildingIcon,
	EuroIcon,
	FolderTreeIcon,
	SettingsIcon,
	Users2Icon,
} from "lucide-react";
import { ROUTES } from "@/lib/routes";
import type { SettingsGroup } from "./types";

const settingsRoutes: SettingsGroup[] = [
	{
		label: "Personal Settings",
		hasPermission: () => true,
		items: [
			{
				label: "General",
				href: ROUTES.SETTINGS_USER_GENERAL(),
				icon: SettingsIcon,
				description: "Change your personal settings",
			},
			{
				label: "Notifications",
				href: ROUTES.SETTINGS_USER_NOTIFICATIONS(),
				icon: BellIcon,
				description: "Customize the emails, SMS and push notifications you receive",
			},
			{
				label: "Bank Details",
				href: ROUTES.SETTINGS_USER_BANK_DETAILS(),
				icon: BanknoteIcon,
				description: "Update your bank details to receive payments",
			},
		],
	},
	{
		label: "Organisation",
		hasPermission: async (client) => {
			const res = await client.organization.hasPermission({
				permissions: {
					organization: ["update"],
				},
			});

			if (!res.data?.success || res.error) {
				return false;
			}

			return true;
		},
		items: [
			{
				label: "Organisation",
				href: ROUTES.SETTINGS_ORG_GENERAL(),
				icon: BuildingIcon,
				description: "Verwalte die Einstellungen zu deiner Organisation",
			},
			{
				label: "Mitglieder",
				href: ROUTES.SETTINGS_ORG_MEMBERS(),
				icon: Users2Icon,
				description: "Verwalten Sie die Mitglieder Ihrer Organisation",
			},
			{
				label: "Zulagen",
				href: ROUTES.SETTINGS_ORG_ALLOWANCES(),
				icon: EuroIcon,
				description: "Verwalte die Zulagen und Abzüge für Spesenanträge",
			},
			{
				label: "Kostenstellen",
				href: ROUTES.SETTINGS_ORG_COST_UNITS(),
				icon: FolderTreeIcon,
				description:
					"Kostenstellen werden verwendet um Ausgaben einfacher zuordnen zu können",
			},
		],
	},
	{
		label: "Platform",
		hasPermission: async (client) => {
			const res = await client.admin.hasPermission({
				permissions: {
					app: ["update"],
				},
			});

			if (!res.data?.success || res.error) {
				return false;
			}

			return true;
		},
		items: [
			{
				label: "Organisationen",
				href: ROUTES.SETTINGS_ADMIN_ORGS(),
				icon: BuildingIcon,
				description: "Verwalte alle Organisationen auf dieser Platform",
			},
		],
	},
];

export { settingsRoutes };
