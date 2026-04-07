import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ROUTES } from "@/lib/consts";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";

export default async function AppLayout({ children }: { children: ReactNode }) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	// When the user is not logged in, redirect to the login page
	if (!session) {
		redirect(ROUTES.AUTH);
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
			<SidebarInset>
				<SiteHeader />
				{children}
			</SidebarInset>
		</SidebarProvider>
	);
}
