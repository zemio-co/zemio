import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
	type OnboardingInvitation,
	OnboardingInvitationList,
} from "./onboarding-invitation-list";
import { OnboardingBox, OnboardingBoxHeader } from "./primtives/onboarding-box";
import { OnboardingDesc, OnboardingTitle } from "./primtives/onboarding-text";

/**
 * Step four: join something, or go and make one.
 *
 * When nothing has invited this person the list is left out entirely rather
 * than rendered empty — an "open invitations (0)" heading is a report on a
 * question they did not ask, and creating an organization is the only move
 * left anyway.
 */
async function OnboardingOrganizationContent({
	className,
	invitations,
	...props
}: React.ComponentProps<typeof OnboardingBox> & {
	invitations: OnboardingInvitation[];
}) {
	const t = await getTranslations("modules.onboarding.organization");
	const hasInvitations = invitations.length > 0;

	return (
		<OnboardingBox
			className={cn(className)}
			data-slot="onboarding-organization-content"
			{...props}
		>
			<OnboardingBoxHeader>
				<OnboardingTitle>{t("title")}</OnboardingTitle>
				<OnboardingDesc>{t("subtitle")}</OnboardingDesc>
			</OnboardingBoxHeader>

			{hasInvitations && <OnboardingInvitationList invitations={invitations} />}

			<div className="my-4 flex items-center justify-center gap-2">
				<div className="h-px grow bg-base-200" />
				<span className="shrink-0 text-base-500 text-xs uppercase">{t("or")}</span>
				<div className="h-px grow bg-base-200" />
			</div>

			<Button
				className={"w-full"}
				nativeButton={false}
				render={
					<Link href={ROUTES.ONBOARDING_ORGANIZATION_NEW()}>
						{t("createInstead")}
					</Link>
				}
				size={"lg"}
				variant={"outline"}
			/>
		</OnboardingBox>
	);
}

export { OnboardingOrganizationContent };
