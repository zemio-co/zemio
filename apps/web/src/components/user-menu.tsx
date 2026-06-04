"use client";

import {
	BookOpenIcon,
	CheckIcon,
	ChevronsUpDownIcon,
	GitPullRequestArrowIcon,
	LifeBuoyIcon,
	LogOutIcon,
	MonitorIcon,
	MoonIcon,
	SettingsIcon,
	SunIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ROUTES } from "@/lib/consts";
import { cn } from "@/lib/utils";
import { authClient } from "@/server/better-auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function UserMenu() {
	const router = useRouter();
	const { theme, setTheme } = useTheme();
	const { isPending, data: session } = authClient.useSession();

	if (isPending || !session?.user) return null;

	const user = session.user;

	const handleSignout = () => {
		authClient.signOut().then(() => {
			router.push(ROUTES.AUTH);
		});
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={"flex items-center justify-start gap-3"}
				openOnHover={true}
				render={
					<Button variant={"ghost"}>
						<Avatar className={"size-5"}>
							<AvatarImage src={user.image ?? undefined} />
							<AvatarFallback>
								{user.name
									?.split(" ")
									.map((name) => name.charAt(0))
									.join("")}
							</AvatarFallback>
						</Avatar>
						<span className="grow truncate text-left font-medium">{user.name}</span>
						<ChevronsUpDownIcon />
					</Button>
				}
			/>
			<DropdownMenuContent
				className={"w-full min-w-(--anchor-width) max-w-64"}
				side="top"
			>
				<DropdownMenuGroup>
					<DropdownMenuLabel>{user.email}</DropdownMenuLabel>
					<DropdownMenuItem
						render={
							<Link href={ROUTES.USER_SETTINGS}>
								<SettingsIcon />
								Einstellungen
							</Link>
						}
					/>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<MoonIcon />
							Theme
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className={"w-full min-w-24 max-w-32"}>
							<DropdownMenuItem onClick={() => setTheme("light")}>
								<SunIcon />
								Light
								<CheckIcon
									className={cn(
										"ms-auto ml-6 hidden text-muted-foreground",
										theme === "light" && "block",
									)}
								/>
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setTheme("dark")}>
								<MoonIcon />
								Dark
								<CheckIcon
									className={cn(
										"ms-auto ml-6 hidden text-muted-foreground",
										theme === "dark" && "block",
									)}
								/>
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setTheme("system")}>
								<MonitorIcon />
								System
								<CheckIcon
									className={cn(
										"ms-auto ml-6 hidden text-muted-foreground",
										theme === "system" && "block",
									)}
								/>
							</DropdownMenuItem>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
					<DropdownMenuItem onClick={handleSignout} variant={"destructive"}>
						<LogOutIcon /> Abmelden
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem
						render={
							<Link
								href={"https://github.com/zemio-co/zemio/blob/master/CHANGELOG.md"}
								target="_blank"
							>
								<GitPullRequestArrowIcon />
								Changelog
							</Link>
						}
					/>
					<DropdownMenuItem
						render={
							<Link href={"https://github.com/zemio-co/zemio"} target="_blank">
								<BookOpenIcon />
								Dokumentation
							</Link>
						}
					/>
					<DropdownMenuItem
						render={
							<Link
								href={"https://github.com/zemio-co/zemio/issues/new"}
								target="_blank"
							>
								<LifeBuoyIcon />
								Hilfe
							</Link>
						}
					/>
				</DropdownMenuGroup>
				<DropdownMenuGroup>
					<div className="px-1.5">
						<span className="text-muted-foreground text-xs">
							{/* TODO: Get actual version from repository */}
							Version 0.1.0-alpha1
						</span>
					</div>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
