import { ArrowRightIcon, BuildingIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { OnboardingCreateOrganizationForm } from "./onboarding-create-organization-form";
import {
	type OnboardingInvitation,
	OnboardingInvitationList,
} from "./onboarding-invitation-list";
import { OnboardingSendVerificationButton } from "./onboarding-send-verification-button";
import { OnboardingSignOut } from "./onboarding-sign-out";

/**
 * Belonging to nothing, after having belonged to something.
 *
 * The same two offers the organization step makes — an invitation to accept,
 * an organization to create — shown to the opposite population: people who
 * finished onboarding and have since been removed from their last
 * organization, or who deleted it. They keep the offers and lose the flow,
 * which is why this lives beside `(flow)` rather than inside it.
 */
async function OnboardingNoOrgContent({
	className,
	userEmail,
	emailVerified,
	isPlatformAdmin,
	invitations,
	...props
}: React.ComponentProps<"div"> & {
	userEmail: string;
	emailVerified: boolean;
	isPlatformAdmin: boolean;
	invitations: OnboardingInvitation[];
}) {
	const t = await getTranslations("modules.noOrg");

	return (
		<div
			className={cn(className)}
			data-slot="onboarding-no-org-content"
			{...props}
		>
			<div className="mb-8 w-fit rounded-md bg-zinc-50 p-2 shadow-sm ring-1 ring-zinc-700/10">
				<BuildingIcon className="size-5 text-zinc-600" />
			</div>
			<h1 className="font-semibold text-lg text-zinc-800">{t("title")}</h1>
			<p className="mt-1.5 max-w-prose text-sm text-zinc-500">
				{t("subtitle", { email: userEmail })}
			</p>

			{invitations.length > 0 && (
				<div className="mt-8">
					<h2 className="font-medium text-sm text-zinc-800">
						{t("invitationsTitle")}
					</h2>
					<p className="mt-1 text-sm text-zinc-500">{t("invitationsHint")}</p>
					<OnboardingInvitationList className="mt-3" invitations={invitations} />
				</div>
			)}

			<div className="mt-8 border-zinc-200 border-t pt-8">
				<h2 className="font-medium text-sm text-zinc-800">{t("createTitle")}</h2>
				<p className="mt-1 text-sm text-zinc-500">{t("createHint")}</p>

				{emailVerified ? (
					<OnboardingCreateOrganizationForm className="mt-3" userEmail={userEmail} />
				) : (
					<div className="mt-3 rounded-md bg-amber-50 px-3 py-2">
						<p className="text-amber-900 text-sm">
							{t("needsVerification", { email: userEmail })}
						</p>
						{/* The ask appears where it matters, with the action that
						    answers it — a gate with no way through is just a wall
						    (ADR-0008). */}
						<OnboardingSendVerificationButton
							callbackURL={ROUTES.ONBOARDING_NO_ORG()}
							className="mt-2"
							email={userEmail}
							size={"sm"}
							variant={"outline"}
						/>
					</div>
				)}
			</div>

			<OnboardingSignOut className="mt-8 w-full" />

			{isPlatformAdmin && (
				<Link
					className="mt-4 flex items-center justify-center gap-1.5 font-medium text-blue-600 text-sm"
					href={ROUTES.SETTINGS_ADMIN_ORGS()}
				>
					{t("manageOrgs")}
					<ArrowRightIcon className="size-3.5" />
				</Link>
			)}
		</div>
	);
}

export { OnboardingNoOrgContent };
