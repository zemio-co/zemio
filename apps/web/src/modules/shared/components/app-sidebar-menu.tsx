"use client";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
	Skeleton,
} from "@zemio/ui";
import {
	Building2Icon,
	ChevronDownIcon,
	LogOutIcon,
	SettingsIcon,
	UserIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { authClient } from "@/server/better-auth/client";

type ActiveOrgQuery = ReturnType<typeof authClient.useActiveOrganization>;

function AppSidebarMenu({
	triggerClassName,
	...props
}: React.ComponentProps<typeof DropdownMenu> & {
	triggerClassName?: string;
}) {
	const activeOrgQuery = authClient.useActiveOrganization();

	return (
		<DropdownMenu data-slot="app-sidebar-menu" {...props}>
			<SidebarMenuTrigger
				activeOrgQuery={activeOrgQuery}
				className={triggerClassName}
			/>
			<SidebarMenuContent activeOrgQuery={activeOrgQuery} />
		</DropdownMenu>
	);
}

function SidebarMenuTrigger({
	className,
	activeOrgQuery,
	...props
}: React.ComponentProps<typeof DropdownMenuTrigger> & {
	activeOrgQuery: ActiveOrgQuery;
}) {
	const t = useTranslations("modules.shared.sidebarMenu");
	const { data, error, isPending } = activeOrgQuery;

	if (isPending) {
		return <Skeleton className="h-7 w-full" />;
	}

	if (!data || error) {
		return (
			<span className="text-destructive text-xs">{t("triggerLoadError")}</span>
		);
	}

	return (
		<DropdownMenuTrigger
			className={cn(
				"flex h-8 w-full items-center justify-center gap-3 rounded-md px-2 py-1.5 pr-2.5 font-medium text-slate-800 text-sm transition-colors hover:bg-slate-100",
				className,
			)}
			data-slot="app-sidebar-menu-trigger"
			{...props}
		>
			{data.logo ? (
				<span className="flex size-6 overflow-hidden rounded-xs">
					<Image
						alt={data.name}
						className="object-cover"
						height={24}
						src={data.logo}
						width={24}
					/>
				</span>
			) : (
				<span className="flex size-6 items-center justify-center rounded-sm border border-base-300 bg-base-200 font-medium text-base-700 text-xs leading-none">
					{data.name.charAt(0).toUpperCase()}
				</span>
			)}
			<span className="truncate font-semibold">{data.name}</span>
			<ChevronDownIcon className="ml-auto size-4 shrink-0 text-slate-500" />
		</DropdownMenuTrigger>
	);
}

function SidebarMenuContent({
	className,
	activeOrgQuery,
	...props
}: React.ComponentProps<typeof DropdownMenuContent> & {
	activeOrgQuery: ActiveOrgQuery;
}) {
	const t = useTranslations("modules.shared.sidebarMenu");
	const [pending, setPending] = useState<boolean>(false);
	const router = useRouter();

	const handleSignOut = async () => {
		setPending(true);
		const signOutPromise = authClient.signOut();
		toast.promise(signOutPromise, {
			loading: t("signOutLoading"),
			success: t("signOutSuccess"),
			error: t("signOutError"),
		});
		try {
			await signOutPromise;
			router.push(ROUTES.AUTH());
		} finally {
			setPending(false);
		}
	};

	return (
		<DropdownMenuContent
			align="start"
			className={cn("", className)}
			data-slot="sidebar-menu-content"
			{...props}
		>
			{/* <SidebarMenuContentHeader activeOrgQuery={activeOrgQuery} /> */}
			<DropdownMenuGroup>
				<DropdownMenuItem
					render={
						<Link href={ROUTES.SETTINGS_USER_GENERAL()}>
							<SettingsIcon />
							<span className="truncate">{t("settings")}</span>
						</Link>
					}
				/>
				<SidebarMenuOrgsButton />
			</DropdownMenuGroup>
			<DropdownMenuSeparator />
			<DropdownMenuGroup>
				<SidebarMenuUserButton />
				<DropdownMenuItem
					disabled={pending}
					onClick={handleSignOut}
					variant="destructive"
				>
					<LogOutIcon />
					<span className="truncate">{t("signOut")}</span>
				</DropdownMenuItem>
			</DropdownMenuGroup>
		</DropdownMenuContent>
	);
}

function SidebarMenuUserButton({
	className,
	...props
}: React.ComponentProps<typeof DropdownMenuItem>) {
	const session = authClient.useSession();

	if (session.isPending) {
		return (
			<DropdownMenuItem {...props}>
				<UserIcon />
				<Skeleton className="h-6 w-20" />
			</DropdownMenuItem>
		);
	}

	return (
		<DropdownMenuItem className={cn(className)} {...props}>
			<UserIcon />
			<span className="truncate">{session.data?.user.email}</span>
		</DropdownMenuItem>
	);
}

function SidebarMenuOrgsButton({
	className,
	...props
}: React.ComponentProps<typeof DropdownMenuItem>) {
	const t = useTranslations("modules.shared.sidebarMenu");
	const organizations = authClient.useListOrganizations();

	const handleOrgChange = async (organizationId: string) => {
		await authClient.organization.setActive({
			organizationId,
		});
		window.location.reload();
	};

	if (organizations.isPending) {
		return (
			<DropdownMenuItem className={cn(className)} disabled {...props}>
				<Building2Icon />
				<Skeleton className="h-6 w-20" />
			</DropdownMenuItem>
		);
	}

	if (!organizations.data) {
		return (
			<DropdownMenuItem
				className={cn(className)}
				disabled
				variant="destructive"
				{...props}
			>
				<Building2Icon />
				<span>{t("orgsLoadError")}</span>
			</DropdownMenuItem>
		);
	}

	return (
		<DropdownMenuSub>
			<DropdownMenuSubTrigger className={cn(className)}>
				<Building2Icon />
				<span className="truncate">{t("yourOrganizations")}</span>
			</DropdownMenuSubTrigger>
			<DropdownMenuPortal>
				<DropdownMenuSubContent>
					<DropdownMenuGroup>
						{organizations.data.map((org) => (
							<DropdownMenuItem
								className={cn(className)}
								key={org.id}
								onClick={() => handleOrgChange(org.id)}
							>
								<span className="flex size-6 items-center justify-center rounded-xs bg-slate-100 font-medium text-slate-600 text-xs leading-none">
									{org.name.charAt(0).toUpperCase()}
								</span>
								<span className="truncate">{org.name}</span>
							</DropdownMenuItem>
						))}
					</DropdownMenuGroup>
				</DropdownMenuSubContent>
			</DropdownMenuPortal>
		</DropdownMenuSub>
	);
}

export { AppSidebarMenu };
