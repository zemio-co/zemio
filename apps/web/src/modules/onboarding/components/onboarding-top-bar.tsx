import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { OnboardingSignOut } from "./onboarding-sign-out";

/**
 * Which account this is, and the way out of it.
 *
 * The address arrives from the shell above rather than from
 * `authClient.useSession()`: the layout that renders this has already resolved
 * the session to guard itself, so asking the browser to fetch it again would
 * buy a second round trip and a skeleton flash on every step of the flow.
 */
async function OnboardingTopBar({
	className,
	email,
	...props
}: React.ComponentProps<"div"> & { email: string }) {
	const t = await getTranslations("modules.onboarding");

	return (
		<div
			className={cn(
				"flex w-full flex-wrap items-center justify-between px-8",
				className,
			)}
			data-slot="onboarding-top-bar"
			{...props}
		>
			<span className="text-base-500 text-xs">
				{t("signedInAs")} <span className="font-medium text-base-700">{email}</span>
			</span>
			<OnboardingSignOut />
		</div>
	);
}

export { OnboardingTopBar };
