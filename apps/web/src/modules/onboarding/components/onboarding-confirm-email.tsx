import { MailIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { OnboardingSendVerificationButton } from "./onboarding-send-verification-button";

/**
 * "Please confirm your email address", and the button that sends the link.
 *
 * Both ways in verify an address on their own — a magic link is proof that the
 * mailbox was read, and a work or school tenant has already proved the address
 * it administers (ADR-0008, ADR-0010) — so in practice nobody arrives here.
 * It exists for the case those two do not cover: a personal Microsoft account,
 * whose address Zemio has been told about and has not confirmed.
 */
async function OnboardingConfirmEmail({
	className,
	email,
	...props
}: React.ComponentProps<"div"> & { email: string }) {
	const t = await getTranslations("modules.onboarding.confirmEmail");

	return (
		<div
			className={cn(className)}
			data-slot="onboarding-confirm-email"
			{...props}
		>
			<div className="mb-8 w-fit rounded-md bg-zinc-50 p-2 shadow-sm ring-1 ring-zinc-700/10">
				<MailIcon className="size-5 text-zinc-600" />
			</div>
			<h1 className="font-semibold text-lg text-zinc-800">{t("title")}</h1>
			<p className="mt-1.5 max-w-prose text-sm text-zinc-500">
				{t("subtitle", { email })}
			</p>

			<OnboardingSendVerificationButton
				callbackURL={ROUTES.ONBOARDING()}
				className="mt-8 w-full"
				email={email}
			/>

			<p className="mt-3 text-center text-xs text-zinc-500">{t("afterHint")}</p>
		</div>
	);
}

export { OnboardingConfirmEmail };
