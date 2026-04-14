import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/better-auth";
import {
	buildLegalOnboardingRedirectPath,
	hasAcceptedCurrentLegalRelease,
} from "@/server/legal";

export default async function ServerLayout(
	props: LayoutProps<"/settings/org">,
) {
	const { children } = props;

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect("/auth");
	}

	if (!hasAcceptedCurrentLegalRelease(session)) {
		redirect(buildLegalOnboardingRedirectPath("/settings/org/general"));
	}

	const hasPermission = await auth.api.hasPermission({
		headers: await headers(),
		body: {
			permissions: {
				organization: ["update"],
			},
		},
	});

	if (!hasPermission.success) {
		redirect("/");
	}

	return children;
}
