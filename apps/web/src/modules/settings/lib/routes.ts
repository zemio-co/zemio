"use client";

import { createAppTranslator } from "@zemio/i18n";
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

const t = createAppTranslator({ namespace: "modules.settings.nav" });

const settingsRoutes: SettingsGroup[] = [
	{
		label: t("groups.personal"),
		hasPermission: () => true,
		items: [
			{
				label: t("items.general.label"),
				href: ROUTES.SETTINGS_USER_GENERAL(),
				icon: SettingsIcon,
				description: t("items.general.description"),
			},
			{
				label: t("items.notifications.label"),
				href: ROUTES.SETTINGS_USER_NOTIFICATIONS(),
				icon: BellIcon,
				description: t("items.notifications.description"),
			},
			{
				label: t("items.bankDetails.label"),
				href: ROUTES.SETTINGS_USER_BANK_DETAILS(),
				icon: BanknoteIcon,
				description: t("items.bankDetails.description"),
			},
		],
	},
	{
		label: t("groups.organisation"),
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
				label: t("items.orgGeneral.label"),
				href: ROUTES.SETTINGS_ORG_GENERAL(),
				icon: BuildingIcon,
				description: t("items.orgGeneral.description"),
			},
			{
				label: t("items.orgMembers.label"),
				href: ROUTES.SETTINGS_ORG_MEMBERS(),
				icon: Users2Icon,
				description: t("items.orgMembers.description"),
			},
			{
				label: t("items.orgAllowances.label"),
				href: ROUTES.SETTINGS_ORG_ALLOWANCES(),
				icon: EuroIcon,
				description: t("items.orgAllowances.description"),
			},
			{
				label: t("items.orgCostUnits.label"),
				href: ROUTES.SETTINGS_ORG_COST_UNITS(),
				icon: FolderTreeIcon,
				description: t("items.orgCostUnits.description"),
			},
		],
	},
	{
		label: t("groups.platform"),
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
				label: t("items.adminOrgs.label"),
				href: ROUTES.SETTINGS_ADMIN_ORGS(),
				icon: BuildingIcon,
				description: t("items.adminOrgs.description"),
			},
		],
	},
];

export { settingsRoutes };
