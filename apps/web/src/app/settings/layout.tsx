import type { ReactNode } from "react";
import { SettingsLayout } from "@/modules/settings";
import { BillingBanner } from "@/modules/shared";
import { requireOnboarded } from "@/server/modules/onboarding";
import { api, HydrateClient } from "@/trpc/server";

export default async function ServerLayout({
	children,
}: {
	children: ReactNode;
}) {
	// Signed in and through onboarding. Membership is deliberately not required:
	// the user groups here — a name, notifications, banking details — are the
	// person's own, and belong to them whether or not they are in an
	// organization today.
	await requireOnboarded();

	// Settings is a sibling route group, so it inherits nothing from the
	// application layout — including the banner. Without this the explanation of
	// why an organization is read-only disappears at exactly the moment someone
	// follows the banner's own link to the billing page. Same query, so the two
	// layouts cannot disagree.
	void api.billing.status.prefetch();

	return (
		<SettingsLayout>
			<HydrateClient>
				<BillingBanner className="mx-6 mt-6" />
			</HydrateClient>
			{children}
		</SettingsLayout>
	);
}
