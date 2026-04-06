"use client";

import { BuildingIcon, RefreshCwIcon, ShieldIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/lib/consts";
import { cn } from "@/lib/utils";
import { authClient } from "@/server/better-auth/client";

interface NoOrgPageContentProps {
	userEmail: string;
	isPlatformAdmin: boolean;
}

export function NoOrgPageContent({
	userEmail,
	isPlatformAdmin,
}: NoOrgPageContentProps) {
	const router = useRouter();

	function handleRefresh() {
		router.refresh();
	}

	async function handleSignOut() {
		await authClient.signOut();
		router.push(ROUTES.AUTH);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background">
			<div className="mx-auto flex max-w-md flex-col items-center gap-6 text-center">
				<div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
					<BuildingIcon className="h-8 w-8 text-muted-foreground" />
				</div>

				<div className="flex flex-col gap-2">
					<h1 className="font-semibold text-2xl tracking-tight">
						Kein Zugang zu einer Organisation
					</h1>
					<p className="text-muted-foreground text-sm">
						Ihr Konto ({userEmail}) ist derzeit keiner Organisation zugeordnet. Bitte
						wenden Sie sich an Ihren Administrator.
					</p>
				</div>

				<div className="flex w-full flex-col gap-2">
					<Button className="w-full" onClick={handleRefresh} variant="outline">
						<RefreshCwIcon />
						Erneut prüfen
					</Button>

					{isPlatformAdmin && (
						<Link
							className={cn(buttonVariants({ variant: "default" }), "w-full")}
							href={ROUTES.PLATFORM_ADMIN_ORGANIZATIONS}
						>
							<ShieldIcon />
							Organisationen verwalten
						</Link>
					)}

					<Button
						className="w-full text-muted-foreground"
						onClick={handleSignOut}
						variant="ghost"
					>
						Abmelden
					</Button>
				</div>
			</div>
		</div>
	);
}
