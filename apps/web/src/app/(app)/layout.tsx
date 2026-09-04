import { SidebarProvider } from "@zemio/ui";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
	isOrganizationAdminRole,
	isOrganizationOwnerRole,
} from "@/lib/organization";
import { ROUTES } from "@/lib/routes";
import { AppSidebar, BillingBanner } from "@/modules/shared";
import { activeMemberRole } from "@/server/modules/membership";
import { requireOnboarded } from "@/server/modules/onboarding";
import { api, HydrateClient } from "@/trpc/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
	// Not signed in, or not through onboarding, and this is as far as anyone
	// gets. The guard answers both, and the membership it read on the way is
	// handed back rather than queried again.
	const { hasMembership } = await requireOnboarded();

	if (!hasMembership) {
		redirect(ROUTES.ONBOARDING_NO_ORG());
	}

	// Resolved here rather than in the browser because both consumers hide
	// themselves from the roles they are not for, and a tree that decides that
	// after hydration is a tree the server rendered differently.
	const role = await activeMemberRole();

	// Prefetched here rather than in the banner so every page under this layout
	// shares one answer, and so the banner and the billing page cannot disagree
	// about what state the organization is in.
	void api.billing.status.prefetch();

	return (
		<SidebarProvider>
			<AppSidebar isOrgAdmin={isOrganizationAdminRole(role)} />
			<div className="min-w-0 flex-1">
				<HydrateClient>
					<BillingBanner
						className="mx-6 mt-6"
						isOwner={isOrganizationOwnerRole(role)}
					/>
				</HydrateClient>
				{children}
			</div>
		</SidebarProvider>
	);
}
