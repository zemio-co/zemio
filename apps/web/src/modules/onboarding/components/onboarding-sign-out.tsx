"use client";

import { Button } from "@zemio/ui";
import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/routes";
import { authClient } from "@/server/better-auth/client";

/**
 * The way out of onboarding.
 *
 * Every step of the flow needs one. Somebody who signed in with the wrong of
 * their two accounts cannot verify their way forward — the mail would go to
 * an address that is not the one they meant — and without this the only
 * remaining move is clearing cookies.
 *
 * Signing out is what the button does, so `onClick` and `type` are not the
 * caller's to replace.
 */
function OnboardingSignOut({
	className,
	...props
}: Omit<React.ComponentProps<"button">, "onClick" | "type">) {
	const t = useTranslations("modules.onboarding");
	const router = useRouter();

	async function handleSignOut() {
		await authClient.signOut();
		router.push(ROUTES.AUTH());
	}

	return (
		<Button
			variant={"outline"}
			{...props}
			className={className}
			data-slot="onboarding-sign-out"
			onClick={handleSignOut}
			type="button"
		>
			<LogOutIcon />
			{t("signOut")}
		</Button>
	);
}

export { OnboardingSignOut };
