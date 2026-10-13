"use client";

import { Button } from "@zemio/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { authClient } from "@/server/better-auth/client";

export type OnboardingInvitation = {
	id: string;
	organizationName: string;
};

/**
 * The organizations open to this person, which today means the ones that
 * invited them.
 *
 * A joining rule in `AUTO_JOIN` mode has already joined them during session
 * creation, so it never appears here; `REQUEST` mode is modelled and
 * deliberately unimplemented (ADR-0008). Both are why this lists invitations
 * and calls them what they are.
 *
 * Accepting goes through Better Auth directly rather than a procedure of our
 * own: it is the same call `/accept-invitation` makes, and it sets the active
 * organization on the session as part of accepting.
 */
function OnboardingInvitationList({
	className,
	invitations,
	...props
}: React.ComponentProps<"ul"> & { invitations: OnboardingInvitation[] }) {
	const t = useTranslations("modules.onboarding.organization");
	const [acceptingId, setAcceptingId] = useState<string | null>(null);

	async function handleAccept(invitationId: string) {
		setAcceptingId(invitationId);

		try {
			const result = await authClient.organization.acceptInvitation({
				invitationId,
			});

			if (result.error) {
				toast.error(t("joinFailed"), { description: result.error.message });
				return;
			}

			// A full load rather than a push: this shell was rendered for somebody
			// who belonged to nothing, and the active organization was just decided
			// on the server.
			window.location.assign(ROUTES.USER_DASHBOARD());
		} catch (error) {
			toast.error(t("joinFailed"), {
				description: error instanceof Error ? error.message : undefined,
			});
		} finally {
			setAcceptingId(null);
		}
	}

	return (
		<ul
			className={cn("flex flex-col gap-8", className)}
			data-slot="onboarding-invitation-list"
			{...props}
		>
			{invitations.map((invitation) => (
				<li
					className="flex items-center justify-between gap-3 text-sm"
					key={invitation.id}
				>
					<span className="flex min-w-0 items-center gap-2">
						<span className="truncate font-medium text-base-800">
							{invitation.organizationName}
						</span>
					</span>
					<Button
						disabled={acceptingId !== null}
						onClick={() => handleAccept(invitation.id)}
						size={"sm"}
						type="button"
					>
						{t("join")}
					</Button>
				</li>
			))}
		</ul>
	);
}

export { OnboardingInvitationList };
