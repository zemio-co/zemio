import type { LucideIcon } from "lucide-react";
import type { authClient } from "@/server/better-auth/client";

type SettingsItem = {
	label: string;
	href: string;
	icon: LucideIcon;
	description: string;
};

type SettingsGroup = {
	label: string;
	hasPermission: (client: typeof authClient) => boolean | Promise<boolean>;
	items: SettingsItem[];
};

export type { SettingsGroup, SettingsItem };
