import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { OnboardingInviteContent } from "@/modules/onboarding";
import { db } from "@/server/db";
import { requireOnboarding } from "@/server/modules/onboarding";

/**
 * The first of the two steps only a founder walks.
 *
 * Only for somebody whose step is `invite`, which already means verified,
 * named, in an organization and its owner. Checking ownership alone would let
 * in an owner who still owes an earlier step — one made owner outside the flow,
 * say — who would then be stopped at the end, since finishing onboarding
 * accepts only this step. Everybody else is sent to wherever they are.
 */
export default async function OnboardingInvitePage() {
	const { session, state } = await requireOnboarding();

	if (state.step !== "invite") redirect(ROUTES.ONBOARDING());

	// The organization they own, which is the one the invitations are for. Named
	// explicitly rather than read from the session's active organization: this
	// page is rendered in the same request the organization was created in, and
	// the session was written before it existed.
	const membership = await db.member.findFirst({
		where: { userId: session.user.id, role: "owner" },
		select: { organization: { select: { id: true, name: true } } },
		orderBy: { createdAt: "desc" },
	});

	// The fact said there is one, so this is a row that has gone missing under a
	// live request rather than a state to render a message for.
	if (!membership) redirect(ROUTES.ONBOARDING());

	return (
		<OnboardingInviteContent
			organizationId={membership.organization.id}
			organizationName={membership.organization.name}
		/>
	);
}
