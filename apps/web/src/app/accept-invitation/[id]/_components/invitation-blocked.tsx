"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/consts";
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
	invitedEmail,
	currentEmail,
}: {
	reason: Exclude<InvitationGate, "ready">;
	invitedEmail: string | null;
	currentEmail: string;
}) {
	const t = useTranslations("modules.acceptInvitation");
	const router = useRouter();
	const [sending, setSending] = useState(false);

	async function handleSignOut() {
		await authClient.signOut();
		router.push(ROUTES.AUTH);
	}

	async function handleSendVerification() {
		setSending(true);
		const result = await authClient.sendVerificationEmail({
			email: currentEmail,
			callbackURL: ROUTES.ACCEPT_INVITATION(""),
		});
		setSending(false);

		if (result.error) {
			toast.error(t("verificationFailed"), {
				description: result.error.message ?? t("unexpectedError"),
			});
			return;
		}

		toast.success(t("verificationSent", { email: currentEmail }));
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
						<Button
							className="mt-8 w-full"
							disabled={sending}
							onClick={handleSendVerification}
						>
							{t("sendVerification")}
						</Button>
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
