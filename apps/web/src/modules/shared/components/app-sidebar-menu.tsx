"use client";

import {
	Building2Icon,
	ChevronDownIcon,
	LogOutIcon,
	SettingsIcon,
	UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
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
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { authClient } from "@/server/better-auth/client";

type ActiveOrgQuery = ReturnType<typeof authClient.useActiveOrganization>;

function AppSidebarMenu({
	...props
}: React.ComponentProps<typeof DropdownMenu>) {
	const activeOrgQuery = authClient.useActiveOrganization();

	return (
		<DropdownMenu data-slot="app-sidebar-menu" {...props}>
			<SidebarMenuTrigger activeOrgQuery={activeOrgQuery} />
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
	const { data, error, isPending } = activeOrgQuery;

	if (isPending) {
		return <Skeleton className="h-7 w-full" />;
	}

	if (!data || error) {
		return (
			<span className="text-destructive text-xs">
				Unable to load organization.
			</span>
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
				<span>logo</span>
			) : (
				<span className="flex size-6 items-center justify-center rounded-xs bg-slate-100 font-medium text-slate-600 text-xs leading-none">
					{data.name.charAt(0).toUpperCase()}
				</span>
			)}
			<span className="truncate">{data.name}</span>
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
	const [pending, setPending] = useState<boolean>(false);
	const router = useRouter();

	const handleSignOut = async () => {
		setPending(true);
		const signOutPromise = authClient.signOut();
		toast.promise(signOutPromise, {
			loading: "Du wirst abgemeldet",
			success: "Du wurdest erfolgreich abgemeldet",
			error: "Fehler beim Abmelden",
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
			className={cn("w-80 gap-0 p-0", className)}
			data-slot="sidebar-menu-content"
			{...props}
		>
			<SidebarMenuContentHeader activeOrgQuery={activeOrgQuery} />
			<DropdownMenuGroup className={"p-1"}>
				<DropdownMenuItem
					className="flex h-9 items-center justify-start gap-2 rounded-md px-3 font-normal text-slate-700 text-sm focus:bg-slate-100 not-data-[variant=destructive]:focus:**:text-slate-700"
					render={
						<Link href={ROUTES.SETTINGS_USER_GENERAL()}>
							<SettingsIcon className="size-4 shrink-0 text-slate-500!" />
							<span className="truncate">Einstellungen</span>
						</Link>
					}
				/>
				<SidebarMenuOrgsButton />
			</DropdownMenuGroup>
			<DropdownMenuSeparator className={"my-0"} />
			<DropdownMenuGroup className={"p-1"}>
				<SidebarMenuUserButton />
				<DropdownMenuItem
					className="flex h-9 items-center justify-start gap-2 rounded-md px-3 font-normal text-slate-700 text-sm focus:bg-slate-100 not-data-[variant=destructive]:focus:**:text-slate-700"
					disabled={pending}
					onClick={handleSignOut}
				>
					<LogOutIcon className="size-4 shrink-0 text-slate-500!" />
					<span className="truncate">Abmelden</span>
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
			<DropdownMenuItem
				className={cn(
					"flex h-9 items-center justify-start gap-2 rounded-md px-3 font-normal text-slate-700 text-sm focus:bg-slate-100 not-data-[variant=destructive]:focus:**:text-slate-700",
					className,
				)}
				{...props}
			>
				<UserIcon className="size-4 shrink-0 text-slate-500!" />
				<Skeleton className="h-6 w-20" />
			</DropdownMenuItem>
		);
	}

	return (
		<DropdownMenuItem
			className={cn(
				"flex h-9 items-center justify-start gap-2 rounded-md px-3 font-normal text-slate-700 text-sm focus:bg-slate-100 not-data-[variant=destructive]:focus:**:text-slate-700",
				className,
			)}
			{...props}
		>
			<UserIcon className="size-4 shrink-0 text-slate-500!" />
			<span className="truncate">{session.data?.user.email}</span>
		</DropdownMenuItem>
	);
}

function SidebarMenuOrgsButton({
	className,
	...props
}: React.ComponentProps<typeof DropdownMenuItem>) {
	const organizations = authClient.useListOrganizations();
	const router = useRouter();

	const handleOrgChange = async (organizationId: string) => {
		await authClient.organization.setActive({
			organizationId,
		});
		router.refresh();
	};

	if (organizations.isPending) {
		return (
			<DropdownMenuItem
				className={cn(
					"flex h-9 items-center justify-start gap-2 rounded-md px-3 font-normal text-slate-700 text-sm focus:bg-slate-100 not-data-[variant=destructive]:focus:**:text-slate-700",
					className,
				)}
				disabled
				{...props}
			>
				<Building2Icon className="size-4 shrink-0 text-slate-500!" />
				<Skeleton className="h-6 w-20" />
			</DropdownMenuItem>
		);
	}

	if (!organizations.data) {
		return <p>ERROR</p>;
	}

	return (
		<DropdownMenuSub>
			<DropdownMenuSubTrigger
				className={cn(
					"flex h-9 items-center justify-start gap-2 rounded-md px-3 font-normal text-slate-700 text-sm focus:bg-slate-100 not-data-[variant=destructive]:focus:**:text-slate-700",
					className,
				)}
			>
				<Building2Icon className="size-4 shrink-0 text-slate-500!" />
				<span className="truncate">Deine Organisationen</span>
			</DropdownMenuSubTrigger>
			<DropdownMenuPortal>
				<DropdownMenuSubContent className={"w-72"}>
					{organizations.data.map((org) => (
						<DropdownMenuItem
							className={cn(
								"flex h-9 items-center justify-start gap-4 rounded-md px-3 pl-2 font-normal text-slate-700 text-sm focus:bg-slate-100 not-data-[variant=destructive]:focus:**:text-slate-700",
								className,
							)}
							key={org.id}
							onClick={() => handleOrgChange(org.id)}
						>
							<span className="flex size-6 items-center justify-center rounded-xs bg-slate-100 font-medium text-slate-600 text-xs leading-none">
								{org.name.charAt(0).toUpperCase()}
							</span>
							<span className="truncate">{org.name}</span>
						</DropdownMenuItem>
					))}
				</DropdownMenuSubContent>
			</DropdownMenuPortal>
		</DropdownMenuSub>
	);
}

function SidebarMenuContentHeader({
	className,
	activeOrgQuery,
	...props
}: React.ComponentProps<"div"> & {
	activeOrgQuery: ActiveOrgQuery;
}) {
	const { data, error, isPending } = activeOrgQuery;

	if (isPending) {
		return (
			<div
				className={cn(
					"flex min-h-28 flex-col items-center justify-center text-center",
					className,
				)}
				data-slot="sidebar-menu-content-header"
				{...props}
			>
				<Skeleton className="size-8" />
				<Skeleton className="mt-3 h-5 w-12" />
			</div>
		);
	}

	if (!data || error) {
		return (
			<div
				className={cn(
					"flex min-h-28 flex-col items-center justify-center border border-dashed text-center",
					className,
				)}
				data-slot="sidebar-menu-content-header"
				{...props}
			>
				<span className="font-medium text-destructive text-xs">
					Unable to load active organization.
				</span>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"flex min-h-28 flex-col items-center justify-center px-8 text-center",
				className,
			)}
			data-slot="sidebar-menu-content-header"
			{...props}
		>
			{data.logo ? (
				<span>logo</span>
			) : (
				<span className="flex size-8 items-center justify-center rounded-sm bg-slate-100 py-4 font-medium text-slate-600 text-sm leading-none">
					{data.name.charAt(0).toUpperCase()}
				</span>
			)}
			<span className="mt-3 w-full truncate font-semibold text-base text-slate-800">
				{data.name}
			</span>
		</div>
	);
}

export { AppSidebarMenu };
