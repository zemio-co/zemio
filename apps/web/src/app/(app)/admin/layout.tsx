import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/consts";
import { isOrganizationAdminRole } from "@/lib/organization";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import {
	buildLegalOnboardingRedirectPath,
	hasAcceptedCurrentLegalRelease,
} from "@/server/legal";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	// When the user is not logged in, redirect to the login page
	if (!session) {
		redirect(ROUTES.AUTH);
	}

	if (!hasAcceptedCurrentLegalRelease(session)) {
		redirect(buildLegalOnboardingRedirectPath(ROUTES.ADMIN_DASHBOARD));
	}

	const member = await db.member.findFirst({
		where: {
			userId: session.user.id,
			organizationId: session.session.activeOrganizationId ?? "",
		},
		select: {
			role: true,
		},
	});

	if (!member || !isOrganizationAdminRole(member.role)) {
		redirect(ROUTES.USER_DASHBOARD);
	}

	return <>{children}</>;
}
