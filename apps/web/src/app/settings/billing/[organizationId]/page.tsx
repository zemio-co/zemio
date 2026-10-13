import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { OrgSettingsBillingOpen } from "@/modules/settings/components";
import { getCurrentSession } from "@/server/better-auth";

/**
 * A named organization's billing page, for links that cannot know which
 * organization the session is working in — the trial-ending mail.
 *
 * Outside `/settings/org`, whose layout turns away anybody who does not run
 * the *active* organization before a page beneath it could switch. Already
 * there, it goes straight on; otherwise the switch happens in the browser,
 * because changing the active organization writes the session cookie, which a
 * Server Component cannot.
 */
export default async function ServerPage(
	props: PageProps<"/settings/billing/[organizationId]">,
) {
	const { organizationId } = await props.params;
	const session = await getCurrentSession();

	if (!session) redirect(ROUTES.AUTH());

	if (session.session.activeOrganizationId === organizationId) {
		redirect(ROUTES.SETTINGS_ORG_BILLING());
	}

	return <OrgSettingsBillingOpen organizationId={organizationId} />;
}
