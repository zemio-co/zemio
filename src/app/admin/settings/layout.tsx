import { ArrowLeftIcon, MenuIcon } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminSettingsSidebar } from "@/components/admin-settings-sidebar";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ROUTES } from "@/lib/consts";
import { auth } from "@/server/better-auth";

export default async function ServerLayout({
	children,
}: LayoutProps<"/admin/settings">) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		// When the user is not logged in, redirect to the login page
		redirect(ROUTES.AUTH);
	}

	const { user } = session;

	if (user.role !== "admin") {
		// If user is not admin, redirect to dashboard
		redirect(ROUTES.USER_DASHBOARD);
	}

	return (
		<SidebarProvider>
			<AdminSettingsSidebar />
			<div className="container max-w-4xl py-8">
				<div className="mb-8 flex items-center justify-start gap-4">
					<SidebarTrigger>
						<MenuIcon />
					</SidebarTrigger>
					<Button
						className={"inline-flex md:hidden"}
						nativeButton={false}
						render={
							<Link href={ROUTES.ADMIN_DASHBOARD}>
								<ArrowLeftIcon /> Zurück
							</Link>
						}
						variant={"outline"}
					/>
				</div>
				{children}
			</div>
		</SidebarProvider>
	);
}
