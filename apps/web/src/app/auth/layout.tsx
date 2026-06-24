import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ROUTES } from "@/lib/routes";
import { auth } from "@/server/better-auth";

export default async function AuthLayout({
	children,
}: {
	children: ReactNode;
}) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	// When the user is already logged in, redirect to the dashboard
	if (session) {
		redirect(ROUTES.USER_DASHBOARD());
	}

	return <>{children}</>;
}
