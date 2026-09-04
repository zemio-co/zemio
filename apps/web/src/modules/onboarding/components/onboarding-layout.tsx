import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { OnboardingTopBar } from "./onboarding-top-bar";

async function OnboardingLayout({
	className,
	children,
	...props
}: React.ComponentProps<"main">) {
	const t = await getTranslations("modules.legal.footer");

	return (
		<main
			className={cn(
				"relative flex min-h-svh items-center justify-center overflow-hidden bg-base-50 py-32",
				className,
			)}
			data-slot="auth-layout"
			{...props}
		>
			<OnboardingTopBar className="absolute top-8 left-0" />
			{children}
			<div className="absolute bottom-8 left-1/2 flex w-full -translate-x-1/2 items-center justify-center gap-8 font-medium text-base-600 text-xs **:transition-colors [&>a]:hover:text-accent-600">
				<Link href={ROUTES.LEGAL_PRIVACY_POLICY()}>{t("privacyPolicy")}</Link>
				<Link href={ROUTES.LEGAL_TERMS_AND_CONDITIONS()}>
					{t("termsAndConditions")}
				</Link>
				<Link href={ROUTES.LEGAL_IMPRINT()}>{t("imprint")}</Link>
			</div>
		</main>
	);
}

export { OnboardingLayout };
