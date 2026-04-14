import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/consts";
import { AdminLayout } from "@/modules/admin";
import { auth } from "@/server/better-auth";
import {
	buildLegalOnboardingRedirectPath,
	hasAcceptedCurrentLegalRelease,
} from "@/server/legal";

export default async function ServerLayout(
	props: LayoutProps<"/platform-admin">,
) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect(ROUTES.AUTH);
	}

	if (session.user.role !== "admin") {
		redirect(ROUTES.USER_DASHBOARD);
	}

	if (!hasAcceptedCurrentLegalRelease(session)) {
		redirect(
			buildLegalOnboardingRedirectPath(ROUTES.PLATFORM_ADMIN_ORGANIZATIONS),
		);
	}

	return <AdminLayout {...props} />;
}
