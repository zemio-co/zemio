import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * The documents every page outside the application has to name.
 *
 * One footer for the sign-in shell and the onboarding shell, which show it in
 * the same place to the same person a moment apart. Only the documents the
 * current legal release actually publishes are linked: `/legal/[slug]` reads
 * `CURRENT_LEGAL_RELEASE.documentKeys`, so a link to anything outside it is a
 * 404 with a reassuring name.
 */
async function LegalFooter({
	className,
	...props
}: React.ComponentProps<"div">) {
	const t = await getTranslations("modules.legal.footer");

	return (
		<div
			className={cn(
				"flex w-full items-center justify-center gap-8 font-medium text-base-600 text-xs **:transition-colors [&>a]:hover:text-accent-600",
				className,
			)}
			data-slot="legal-footer"
			{...props}
		>
			<Link href={ROUTES.LEGAL_PRIVACY_POLICY()}>{t("privacyPolicy")}</Link>
			<Link href={ROUTES.LEGAL_TERMS_AND_CONDITIONS()}>
				{t("termsAndConditions")}
			</Link>
			<Link href={ROUTES.LEGAL_PLATFORM_POLICIES()}>{t("platformPolicies")}</Link>
		</div>
	);
}

export { LegalFooter };
