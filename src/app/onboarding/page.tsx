import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/consts";
import { LegalOnboardingPage } from "@/modules/legal";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import {
	getCurrentLegalRelease,
	getPostAcceptancePath,
	hasAcceptedCurrentLegalRelease,
} from "@/server/legal";

function getSingleSearchParamValue(
	value: string | readonly string[] | undefined,
): string | undefined {
	if (typeof value === "string") {
		return value;
	}

	if (!value || value.length === 0) {
		return undefined;
	}

	return value[0];
}

export default async function OnboardingPage({
	searchParams,
}: {
	searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect(ROUTES.AUTH);
	}

	const { returnTo: rawReturnTo } = await searchParams;
	const returnTo = getSingleSearchParamValue(rawReturnTo);
	const memberCount = await db.member.count({
		where: {
			userId: session.user.id,
		},
	});

	if (hasAcceptedCurrentLegalRelease(session)) {
		redirect(
			getPostAcceptancePath({
				hasOrganizationAccess: memberCount > 0,
				returnTo,
			}),
		);
	}

	const release = await getCurrentLegalRelease();

	return (
		<LegalOnboardingPage
			postAcceptancePath={getPostAcceptancePath({
				hasOrganizationAccess: memberCount > 0,
				returnTo,
			})}
			release={release}
		/>
	);
}
