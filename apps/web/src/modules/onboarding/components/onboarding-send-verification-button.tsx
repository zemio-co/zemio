"use client";

import { Button } from "@zemio/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/server/better-auth/client";

/**
 * Asking Zemio to send the confirmation mail.
 *
 * Shared by the confirmation step and `/onboarding/no-org`, because a gate
 * with no way through it is just a wall (ADR-0008) and both places have to
 * offer the same way through.
 *
 * What the button does is not the caller's to replace: `onClick` and `type`
 * are not accepted, and a caller's `disabled` adds to the in-flight state
 * rather than overriding it — otherwise a prop could stop the mail from being
 * sent, or let it be sent twice.
 */
function OnboardingSendVerificationButton({
	email,
	callbackURL,
	disabled,
	...props
}: Omit<React.ComponentProps<typeof Button>, "onClick" | "type"> & {
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
		<Button
			{...props}
			disabled={sending || disabled}
			onClick={handleSend}
			type="button"
		>
			{t("sendButton")}
		</Button>
	);
}

export { OnboardingSendVerificationButton };
