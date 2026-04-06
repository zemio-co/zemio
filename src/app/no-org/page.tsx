import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/consts";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { NoOrgPageContent } from "./_components/no-org-page";

export default async function NoOrgPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect(ROUTES.AUTH);
	}

	// If the user has since been added to an org (e.g. admin created one),
	// send them straight to the app.
	const memberCount = await db.member.count({
		where: { userId: session.user.id },
	});

	if (memberCount > 0) {
		redirect(ROUTES.USER_DASHBOARD);
	}

	const isPlatformAdmin = session.user.role === "admin";

	return (
		<NoOrgPageContent
			isPlatformAdmin={isPlatformAdmin}
			userEmail={session.user.email}
		/>
	);
}
