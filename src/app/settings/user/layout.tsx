import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ROUTES as SETTINGS_ROUTES } from "@/lib/routes";
import { auth } from "@/server/better-auth";
import {
	buildLegalOnboardingRedirectPath,
	hasAcceptedCurrentLegalRelease,
} from "@/server/legal";

function getUserSettingsReturnToPath(requestHeaders: Headers): string {
	const nextUrl = requestHeaders.get("next-url");

	if (!nextUrl) {
		return SETTINGS_ROUTES.SETTINGS_USER_GENERAL();
	}

	try {
		const currentUrl = nextUrl.startsWith("/")
			? new URL(nextUrl, "http://localhost")
			: new URL(nextUrl);
		const currentPath = `${currentUrl.pathname}${currentUrl.search}`;

		if (!currentPath.startsWith("/settings/user/")) {
			return SETTINGS_ROUTES.SETTINGS_USER_GENERAL();
		}

		return currentPath;
	} catch {
		return SETTINGS_ROUTES.SETTINGS_USER_GENERAL();
	}
}

export default async function ServerLayout({
	children,
}: {
	children: ReactNode;
}) {
	const requestHeaders = await headers();
	const session = await auth.api.getSession({
		headers: requestHeaders,
	});

	if (!session?.user) {
		redirect("/auth");
	}

	if (!hasAcceptedCurrentLegalRelease(session)) {
		redirect(
			buildLegalOnboardingRedirectPath(
				getUserSettingsReturnToPath(requestHeaders),
			),
		);
	}

	return children;
}
