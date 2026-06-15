import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ROUTES } from "@/lib/consts";
import { AppSidebar } from "@/modules/shared";
import { AppNavbar } from "@/modules/shared/components/app-navbar";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import {
	buildLegalOnboardingRedirectPath,
	getRequestReturnToPath,
	hasAcceptedCurrentLegalRelease,
} from "@/server/legal";

export default async function AppLayout({ children }: { children: ReactNode }) {
	const requestHeaders = await headers();
	const session = await auth.api.getSession({
		headers: requestHeaders,
	});

	// When the user is not logged in, redirect to the login page
	if (!session) {
		redirect(ROUTES.AUTH);
	}

	if (!hasAcceptedCurrentLegalRelease(session)) {
		redirect(
			buildLegalOnboardingRedirectPath(
				getRequestReturnToPath(requestHeaders) ?? undefined,
			),
		);
	}

	const memberCount = await db.member.count({
		where: {
			userId: session.user.id,
		},
	});

	if (memberCount === 0) {
		redirect(ROUTES.NO_ORG);
	}

	return (
		<SidebarProvider>
			<AppSidebar />
			<div className="flex-1">
				<AppNavbar className="sticky top-0" />
				{children}
			</div>
		</SidebarProvider>
	);
}
