import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/consts";
import { LegalOnboardingPage } from "@/modules/legal";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import {
	getCurrentLegalRelease,
	getPostAcceptancePath,
	getSafeReturnToPath,
	hasAcceptedCurrentLegalRelease,
} from "@/server/legal";

export default async function OnboardingPage({
	searchParams,
}: {
	searchParams: Promise<{ returnTo?: string }>;
}) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect(ROUTES.AUTH);
	}

	const { returnTo } = await searchParams;
	const safeReturnTo = getSafeReturnToPath(returnTo);
	const memberCount = await db.member.count({
		where: {
			userId: session.user.id,
		},
	});

	if (hasAcceptedCurrentLegalRelease(session)) {
		redirect(
			getPostAcceptancePath({
				hasOrganizationAccess: memberCount > 0,
				returnTo: safeReturnTo,
			}),
		);
	}

	const release = await getCurrentLegalRelease();

	return (
		<LegalOnboardingPage
			postAcceptancePath={getPostAcceptancePath({
				hasOrganizationAccess: memberCount > 0,
				returnTo: safeReturnTo,
			})}
			release={release}
		/>
	);
}
