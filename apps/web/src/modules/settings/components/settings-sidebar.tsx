"use client";

import { Separator } from "@base-ui/react";
import { createAppTranslator } from "@zemio/i18n";
import {
	ArrowLeftIcon,
	BellIcon,
	BuildingIcon,
	CreditCardIcon,
	EuroIcon,
	FolderTreeIcon,
	type LucideIcon,
	SettingsIcon,
	Users2Icon,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type React from "react";
import { useEffect, useState } from "react";
import * as SidebarPrimitive from "@/components/settings-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { authClient } from "@/server/better-auth/client";

type MenuItem = {
	key: string;
	label: string;
	icon: LucideIcon;
	href: string;
};

function SettingsSidebar({
	...props
}: React.ComponentProps<typeof SidebarPrimitive.Root>) {
	return (
		<SidebarPrimitive.Root {...props}>
			<div className="px-2.5">
				<SidebarBackLink />
			</div>
			<div className="mt-6 px-2.5">
				<SidebarProfile />
			</div>
			<SidebarUserMenu className="mt-6" />
			<SidebarOrganizationMenu className="mt-6" />
			<SidebarAdminMenu className="mt-6" />
		</SidebarPrimitive.Root>
	);
}

function SidebarBackLink() {
	const t = useTranslations("modules.settings.actions");

	return (
		<Link
			className="flex w-fit items-center justify-center gap-1.5 font-medium text-sm text-zinc-600 transition-colors hover:text-blue-500"
			href={"/"}
		>
			<ArrowLeftIcon className="size-3.5" /> {t("back")}
		</Link>
	);
}

function SidebarProfile({ className, ...props }: React.ComponentProps<"div">) {
	const { data, isPending } = authClient.useSession();
	const t = useTranslations("modules.settings.nav");

	if (isPending) {
		return <Skeleton className="h-12 w-full" />;
	}

	if (!data) {
		return <p>{t("noSession")}</p>;
	}

	return (
		<div
			className={cn("flex items-center justify-start gap-3", className)}
			{...props}
		>
			<Avatar className={"size-8 shrink-0"}>
				<AvatarImage src={data.user.image ?? undefined} />
				<AvatarFallback>
					{data.user.name.charAt(0)?.toUpperCase() ?? ""}
				</AvatarFallback>
			</Avatar>
			<div className="grow space-y-0.25">
				<p className="line-clamp-1 font-medium text-sm text-zinc-800">
					{data.user.name}
				</p>
				<p className="line-clamp-1 text-xs text-zinc-500">{data.user.email}</p>
			</div>
		</div>
	);
}

const tNav = createAppTranslator({ namespace: "modules.settings.nav" });

const userMenuItems: MenuItem[] = [
	{
		key: "general",
		label: tNav("items.general.label"),
		href: ROUTES.SETTINGS_USER_GENERAL(),
		icon: SettingsIcon,
	},
	{
		key: "notifications",
		label: tNav("items.notifications.label"),
		href: ROUTES.SETTINGS_USER_NOTIFICATIONS(),
		icon: BellIcon,
	},
	{
		key: "banking_details",
		label: tNav("items.bankDetails.label"),
		href: ROUTES.SETTINGS_USER_BANK_DETAILS(),
		icon: CreditCardIcon,
	},
];

function SidebarUserMenu({
	...props
}: React.ComponentProps<typeof SidebarPrimitive.Menu>) {
	return (
		<SidebarPrimitive.Menu {...props}>
			{userMenuItems.map(({ icon: Icon, ...item }) => (
				<SidebarPrimitive.Item href={item.href} key={item.key}>
					<Icon /> {item.label}
				</SidebarPrimitive.Item>
			))}
		</SidebarPrimitive.Menu>
	);
}

const organizationMenuItems: MenuItem[] = [
	{
		key: "general",
		label: tNav("items.orgGeneral.label"),
		href: ROUTES.SETTINGS_ORG_GENERAL(),
		icon: BuildingIcon,
	},
	{
		key: "members",
		label: tNav("items.orgMembers.label"),
		href: ROUTES.SETTINGS_ORG_MEMBERS(),
		icon: Users2Icon,
	},
	{
		key: "allowances",
		label: tNav("items.orgAllowances.label"),
		href: ROUTES.SETTINGS_ORG_ALLOWANCES(),
		icon: EuroIcon,
	},
	{
		key: "cost_units",
		label: tNav("items.orgCostUnits.label"),
		href: ROUTES.SETTINGS_ORG_COST_UNITS(),
		icon: FolderTreeIcon,
	},
];

function SidebarOrganizationMenu({ ...props }: React.ComponentProps<"div">) {
	const t = useTranslations("modules.settings.nav");
	const [hasPermission, setHasPermission] = useState<boolean>(false);

	useEffect(() => {
		const checkPermission = async () => {
			const res = await authClient.organization.hasPermission({
				permissions: {
					organization: ["update"],
				},
			});
			if (!res.data?.success || res.error) {
				setHasPermission(false);
				return;
			}

			setHasPermission(res.data.success);
		};

		checkPermission();
	}, []);

	if (!hasPermission) {
		return null;
	}

	return (
		<div {...props}>
			<div className="mb-2 flex items-center justify-start gap-3 px-2.5">
				<span className="font-medium text-xs text-zinc-600">
					{t("sidebarOrgHeading")}
				</span>
				<Separator className={"h-px grow bg-border"} />
			</div>
			<SidebarPrimitive.Menu>
				{organizationMenuItems.map(({ icon: Icon, ...item }) => (
					<SidebarPrimitive.Item href={item.href} key={item.key}>
						<Icon /> {item.label}
					</SidebarPrimitive.Item>
				))}
			</SidebarPrimitive.Menu>
		</div>
	);
}

const adminMenutItems: MenuItem[] = [
	{
		key: "orgs",
		label: tNav("items.adminOrgs.label"),
		href: ROUTES.SETTINGS_ADMIN_ORGS(),
		icon: BuildingIcon,
	},
];

function SidebarAdminMenu({ ...props }: React.ComponentProps<"div">) {
	const t = useTranslations("modules.settings.nav");
	const [hasPermission, setHasPermission] = useState<boolean>(false);

	useEffect(() => {
		const checkPermission = async () => {
			const res = await authClient.admin.hasPermission({
				permissions: {
					app: ["update"],
				},
			});
			if (!res.data?.success || res.error) {
				setHasPermission(false);
				return;
			}

			setHasPermission(res.data.success);
		};

		checkPermission();
	}, []);

	if (!hasPermission) {
		return null;
	}

	return (
		<div {...props}>
			<div className="mb-2 flex items-center justify-start gap-3 px-2.5">
				<span className="font-medium text-xs text-zinc-600">
					{t("sidebarAdminHeading")}
				</span>
				<Separator className={"h-px grow bg-border"} />
			</div>
			<SidebarPrimitive.Menu>
				{adminMenutItems.map(({ icon: Icon, ...item }) => (
					<SidebarPrimitive.Item href={item.href} key={item.key}>
						<Icon /> {item.label}
					</SidebarPrimitive.Item>
				))}
			</SidebarPrimitive.Menu>
		</div>
	);
}

export { SettingsSidebar };
