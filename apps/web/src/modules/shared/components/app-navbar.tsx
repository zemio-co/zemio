"use client";

import { CirclePlusIcon, LifeBuoyIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { SheetTrigger } from "@/components/ui/sheet";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { CreateReport } from "@/modules/report";
import { AppCommandProvider, AppCommandTrigger } from "./app-command";

function AppNavbar({ className, ...props }: React.ComponentProps<"nav">) {
	return (
		<nav
			className={cn("bg-background", className)}
			data-slot="app-navbar"
			{...props}
		>
			<div className="container flex h-16 max-w-7xl items-center justify-start">
				<SidebarTrigger className={"mr-6"} />
				<AppCommandProvider>
					<AppCommandTrigger className={"hidden sm:flex"} />
				</AppCommandProvider>
				<div className="ml-auto flex flex-nowrap items-center justify-center gap-1">
					<Button className={"rounded-full"} size={"icon-lg"} variant={"ghost"}>
						<LifeBuoyIcon />
					</Button>
					<Link
						className={buttonVariants({
							size: "icon-lg",
							variant: "ghost",
							className: "rounded-full!",
						})}
						href={ROUTES.SETTINGS_USER_GENERAL()}
					>
						<SettingsIcon />
					</Link>
					<CreateReport>
						<SheetTrigger
							render={
								<Button className={"rounded-full"} size={"icon-lg"} variant={"ghost"}>
									<CirclePlusIcon className="size-5.5 fill-violet-600 text-violet-600 [&_path]:text-white" />
								</Button>
							}
						/>
					</CreateReport>
				</div>
			</div>
		</nav>
	);
}

export { AppNavbar };
