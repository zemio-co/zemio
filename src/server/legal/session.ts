import "server-only";

import { ROUTES } from "@/lib/consts";
import type { Session } from "@/server/better-auth";
import { CURRENT_LEGAL_RELEASE } from "./current-release";

const FALLBACK_POST_ACCEPTANCE_PATH = ROUTES.USER_DASHBOARD;

export function hasAcceptedCurrentLegalRelease(session: Session): boolean {
	return (
		session.session.legalAcceptedReleaseVersion === CURRENT_LEGAL_RELEASE.version
	);
}

export function buildLegalOnboardingRedirectPath(returnTo?: string): string {
	const safeReturnTo = getSafeReturnToPath(returnTo);

	if (!safeReturnTo) {
		return ROUTES.ONBOARDING;
	}

	return `${ROUTES.ONBOARDING}?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

export function getRequestReturnToPath(requestHeaders: Headers): string | null {
	const nextUrl = requestHeaders.get("next-url");

	if (!nextUrl) {
		return null;
	}

	try {
		const currentUrl = nextUrl.startsWith("/")
			? new URL(nextUrl, "http://localhost")
			: new URL(nextUrl);

		return getSafeReturnToPath(`${currentUrl.pathname}${currentUrl.search}`);
	} catch {
		return null;
	}
}

export function getSafeReturnToPath(returnTo?: string | null): string | null {
	if (!returnTo || !returnTo.startsWith("/")) {
		return null;
	}

	if (returnTo.startsWith("//") || returnTo.startsWith(ROUTES.ONBOARDING)) {
		return null;
	}

	if (returnTo.startsWith("/api")) {
		return null;
	}

	if (returnTo.startsWith(ROUTES.AUTH)) {
		return null;
	}

	return returnTo;
}

export function getPostAcceptancePath(options: {
	hasOrganizationAccess: boolean;
	returnTo?: string | null;
}): string {
	const safeReturnTo = getSafeReturnToPath(options.returnTo);

	if (safeReturnTo) {
		return safeReturnTo;
	}

	if (!options.hasOrganizationAccess) {
		return ROUTES.NO_ORG;
	}

	return FALLBACK_POST_ACCEPTANCE_PATH;
}
