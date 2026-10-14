"use client";

import { Button } from "@zemio/ui";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ROUTES } from "@/lib/consts";
import { OnboardingSendVerificationButton } from "@/modules/onboarding";
import { authClient } from "@/server/better-auth/client";
import type { InvitationGate } from "@/server/modules/joining";

/**
 * What an invitation link shows when it cannot be accepted yet.
 *
 * Each state names the thing the person can actually do about it. The one that
 * matters most is `wrong_account`: two university addresses that differ by a
 * dot is an ordinary mistake, and without both addresses on screen there is
 * nothing to work out what went wrong from.
 */
export function InvitationBlocked({
	reason,
	invitationId,
	invitedEmail,
	currentEmail,
}: {
	reason: Exclude<InvitationGate, "ready">;
	invitationId: string;
	invitedEmail: string | null;
	currentEmail: string;
}) {
	const t = useTranslations("modules.acceptInvitation");
	const router = useRouter();

	async function handleSignOut() {
		// Checked, not assumed: with the session still in place, sign-in would
		// send the person straight back to this same wrong account.
		const result = await authClient.signOut().catch(() => null);

		if (!result || result.error) {
			toast.error(t("signOutFailed"));
			return;
		}

		router.push(ROUTES.AUTH);
	}

	return (
		<div className="container flex min-h-svh max-w-md items-center">
			<div className="w-full rounded-2xl border bg-card p-8 shadow-sm">
				{reason === "wrong_account" && invitedEmail && (
					<>
						<h1 className="font-semibold text-2xl">{t("wrongAccountTitle")}</h1>
						<p className="mt-2 text-muted-foreground text-sm">
							{t("wrongAccountBody", {
								invited: invitedEmail,
								current: currentEmail,
							})}
						</p>
						<p className="mt-2 text-muted-foreground text-sm">
							{t("wrongAccountHint", {
								invited: invitedEmail,
								current: currentEmail,
							})}
						</p>
						<Button className="mt-8 w-full" onClick={handleSignOut}>
							{t("switchAccount")}
						</Button>
					</>
				)}

				{reason === "needs_verification" && (
					<>
						<h1 className="font-semibold text-2xl">{t("needsVerificationTitle")}</h1>
						<p className="mt-2 text-muted-foreground text-sm">
							{t("needsVerificationBody", { email: currentEmail })}
						</p>
						{/* The shared button, which recovers from a rejected request
						    rather than staying disabled. Back to this invitation, not
						    to the route it lives under: the whole point of verifying
						    here is to carry on accepting it. */}
						<OnboardingSendVerificationButton
							callbackURL={ROUTES.ACCEPT_INVITATION(invitationId)}
							className="mt-8 w-full"
							email={currentEmail}
						/>
					</>
				)}

				{(reason === "unavailable" ||
					(reason === "wrong_account" && !invitedEmail)) && (
					<>
						<h1 className="font-semibold text-2xl">{t("unavailableTitle")}</h1>
						<p className="mt-2 text-muted-foreground text-sm">
							{t("unavailableBody")}
						</p>
					</>
				)}
			</div>
		</div>
	);
}
