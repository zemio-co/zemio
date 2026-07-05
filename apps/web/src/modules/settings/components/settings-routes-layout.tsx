import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { ROUTES } from "@/lib/routes";

function SettingsRoutesLayout({ children }: React.PropsWithChildren) {
	return (
		<main className="min-h-svh py-12">
			<div className="container mb-4">
				<Link
					className="flex w-fit items-center justify-center gap-1.5 font-semibold text-sm text-violet-600 transition-colors hover:text-violet-400"
					href={ROUTES.SETTINGS()}
				>
					<ChevronLeftIcon className="size-3.5" /> Zurück
				</Link>
			</div>
			{children}
		</main>
	);
}

export { SettingsRoutesLayout };
