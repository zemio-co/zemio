import { BuildingIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
	type OnboardingInvitation,
	OnboardingInvitationList,
} from "./onboarding-invitation-list";

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
}: React.ComponentProps<"div"> & { invitations: OnboardingInvitation[] }) {
	const t = await getTranslations("modules.onboarding.organization");
	const hasInvitations = invitations.length > 0;

	return (
		<div
			className={cn(className)}
			data-slot="onboarding-organization-content"
			{...props}
		>
			<div className="mb-8 w-fit rounded-md bg-zinc-50 p-2 shadow-sm ring-1 ring-zinc-700/10">
				<BuildingIcon className="size-5 text-zinc-600" />
			</div>
			<h1 className="font-semibold text-lg text-zinc-800">
				{hasInvitations ? t("title") : t("emptyTitle")}
			</h1>
			<p className="mt-1.5 max-w-prose text-sm text-zinc-500">
				{hasInvitations ? t("subtitle") : t("emptySubtitle")}
			</p>

			{hasInvitations && (
				<OnboardingInvitationList className="mt-8" invitations={invitations} />
			)}

			<Button
				className={"mt-8 w-full"}
				render={
					<Link href={ROUTES.ONBOARDING_ORGANIZATION_NEW()}>
						{t("createInstead")}
					</Link>
				}
				size={"lg"}
				variant={hasInvitations ? "outline" : "default"}
			/>
		</div>
	);
}

export { OnboardingOrganizationContent };
