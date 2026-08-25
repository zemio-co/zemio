"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/server/better-auth/client";

/**
 * Asking Zemio to send the confirmation mail.
 *
 * Shared by the confirmation step and `/onboarding/no-org`, because a gate
 * with no way through it is just a wall (ADR-0008) and both places have to
 * offer the same way through.
 */
function OnboardingSendVerificationButton({
	email,
	callbackURL,
	...props
}: React.ComponentProps<typeof Button> & {
	email: string;
	/** Where the link in the mail lands once the address is confirmed. */
	callbackURL: string;
}) {
	const t = useTranslations("modules.onboarding.confirmEmail");
	const [sending, setSending] = useState(false);

	async function handleSend() {
		setSending(true);

		// Reset in `finally`: a rejected request — offline, a 500 — would
		// otherwise leave the one button that unblocks this person disabled
		// until they reload the page.
		try {
			const result = await authClient.sendVerificationEmail({
				email,
				callbackURL,
			});

			if (result.error) {
				toast.error(t("sendFailed"), { description: result.error.message });
				return;
			}

			toast.success(t("sent", { email }));
		} catch (error) {
			toast.error(t("sendFailed"), {
				description: error instanceof Error ? error.message : undefined,
			});
		} finally {
			setSending(false);
		}
	}

	return (
		<Button disabled={sending} onClick={handleSend} type="button" {...props}>
			{t("sendButton")}
		</Button>
	);
}

export { OnboardingSendVerificationButton };
