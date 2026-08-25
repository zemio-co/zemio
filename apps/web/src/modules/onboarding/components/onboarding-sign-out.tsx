"use client";

import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { authClient } from "@/server/better-auth/client";

/**
 * The way out of onboarding.
 *
 * Every step of the flow needs one. Somebody who signed in with the wrong of
 * their two accounts cannot verify their way forward — the mail would go to
 * an address that is not the one they meant — and without this the only
 * remaining move is clearing cookies.
 */
function OnboardingSignOut({
	className,
	...props
}: React.ComponentProps<"button">) {
	const t = useTranslations("modules.onboarding");
	const router = useRouter();

	async function handleSignOut() {
		await authClient.signOut();
		router.push(ROUTES.AUTH());
	}

	return (
		<Button
			className={className}
			data-slot="onboarding-sign-out"
			onClick={handleSignOut}
			variant={"outline"}
			{...props}
		>
			<LogOutIcon />
			{t("signOut")}
		</Button>
	);
}

export { OnboardingSignOut };
