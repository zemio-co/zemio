"use client";

import { ArrowRightIcon, BuildingIcon, LogOutIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ZemioLogo from "public/assets/zemio-logo-dark.svg";
import { Button } from "@/components/ui/button";
import { ROUTES as ROUTES_DEPR } from "@/lib/consts";
import { ROUTES } from "@/lib/routes";
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

	async function handleSignOut() {
		await authClient.signOut();
		router.push(ROUTES_DEPR.AUTH);
	}

	return (
		<main className="bg-stone-50">
			<div className="mx-auto w-full max-w-5xl md:px-8">
				<div className="flex min-h-svh flex-col gap-8 border-zinc-200 border-x px-6 py-12 md:px-12">
					<div className="flex shrink-0 flex-wrap items-center justify-between gap-4">
						<Image alt="Zemio Logo" className="h-5 w-fit" src={ZemioLogo} />
						{isPlatformAdmin && (
							<Link
								className={
									"flex items-center justify-center gap-1.5 font-medium text-blue-600 text-sm"
								}
								href={ROUTES.SETTINGS_ADMIN_ORGS()}
							>
								Organisationen verwalten
								<ArrowRightIcon className="size-3.5" />
							</Link>
						)}
					</div>
					<div className="flex grow flex-col items-center justify-center">
						<div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg ring-1 ring-zinc-700/10 ring-offset-0">
							<div className="mb-8 w-fit rounded-md bg-zinc-50 p-2 shadow-sm ring-1 ring-zinc-700/10">
								<BuildingIcon className="size-5 text-zinc-600" />
							</div>
							<h1 className="font-semibold text-lg text-zinc-800">
								Kein Zugang zu einer Organisation
							</h1>
							<p className="mt-1.5 max-w-prose text-sm text-zinc-500">
								Ihr Konto ({userEmail}) ist derzeit keiner Organisation zugeordnet.
								Bitte wenden Sie sich an Ihren Administrator.
							</p>
							<Button
								className={"mt-6 w-full"}
								onClick={handleSignOut}
								variant={"outline"}
							>
								<LogOutIcon />
								Abmelden
							</Button>
						</div>
					</div>
				</div>
			</div>
		</main>
	);
}
