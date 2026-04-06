import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ROUTES } from "@/lib/consts";
import { auth } from "@/server/better-auth";

export default async function PlatformAdminLayout({
	children,
}: {
	children: ReactNode;
}) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect(ROUTES.AUTH);
	}

	if (session.user.role !== "admin") {
		redirect(ROUTES.USER_DASHBOARD);
	}

	return <>{children}</>;
}
