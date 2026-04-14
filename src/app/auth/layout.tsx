import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ROUTES } from "@/lib/consts";
import { auth } from "@/server/better-auth";
import {
	buildLegalOnboardingRedirectPath,
	hasAcceptedCurrentLegalRelease,
} from "@/server/legal";

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
		redirect(
			hasAcceptedCurrentLegalRelease(session)
				? ROUTES.USER_DASHBOARD
				: buildLegalOnboardingRedirectPath(ROUTES.USER_DASHBOARD),
		);
	}

	return <>{children}</>;
}
