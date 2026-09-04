"use client";

import { Button } from "@zemio/ui";
import {
	ArrowRightIcon,
	BuildingIcon,
	CheckCheckIcon,
	FileTextIcon,
	PaperclipIcon,
	PrinterIcon,
	RouteIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { OnboardingBox, OnboardingBoxHeader } from "./primtives/onboarding-box";
import { OnboardingDesc, OnboardingTitle } from "./primtives/onboarding-text";

/**
 * The last page of the flow: what Zemio does, and the way into it.
 *
 * Reading it is the step. There is nothing to agree to and nothing to pay —
 * the trial itself was started when the organization was created (ADR-0009) —
 * so Continue is not a decision, it is the end of onboarding, and pressing it
 * is what records the flow as walked.
 *
 * No price is named here. Tiers and their amounts live in Stripe and nowhere
 * else (ADR-0003), so a figure written into this page would be a second copy
 * of a fact Zemio deliberately does not hold, and would go stale the first
 * time it changed in Stripe. What the page promises instead is what is true
 * without asking Stripe anything: thirty days, no card, and — because
 * read-only means what ADR-0006 says it means — nothing lost afterwards.
 */
function OnboardingTrialContent({
	className,
	...props
}: React.ComponentProps<typeof OnboardingBox>) {
	const t = useTranslations("modules.onboarding.trial");

	const complete = api.user.completeOnboarding.useMutation({
		onSuccess: () => {
			// A full load rather than a push: every guard in the application reads
			// the onboarding state, and the row it is read from has just changed.
			window.location.assign(ROUTES.USER_DASHBOARD());
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	// Paired here rather than in the catalogue because the icon is a property of
	// the interface and the sentence is a property of the language.
	const features = [
		{ icon: FileTextIcon, label: t("features.reports") },
		{ icon: PaperclipIcon, label: t("features.receipts") },
		{ icon: CheckCheckIcon, label: t("features.review") },
		{ icon: RouteIcon, label: t("features.allowances") },
		{ icon: BuildingIcon, label: t("features.costUnits") },
		{ icon: PrinterIcon, label: t("features.export") },
	];

	return (
		<OnboardingBox
			className={cn(className)}
			data-slot="onboarding-trial-content"
			{...props}
		>
			<OnboardingBoxHeader>
				<OnboardingTitle>{t("title")}</OnboardingTitle>
				<OnboardingDesc>{t("subtitle")}</OnboardingDesc>
			</OnboardingBoxHeader>

			<ul className="rounded-lg border border-base-200 bg-white">
				{features.map(({ icon: Icon, label }, index) => (
					<li key={label}>
						{index > 0 && (
							<div className="mx-5 h-px w-[calc(100%-2.5rem)] bg-base-200" />
						)}
						<div className="flex items-center justify-start gap-2.5 px-5 py-4">
							<Icon className="size-3.5 shrink-0 text-base-500" />
							<span className="block font-medium text-base-800 text-sm">{label}</span>
						</div>
					</li>
				))}
			</ul>

			<div>
				<Button
					className={"w-full"}
					disabled={complete.isPending}
					onClick={() => complete.mutate()}
					type="button"
				>
					{t("continue")} <ArrowRightIcon />
				</Button>
				<span className="mt-4 block text-base-500 text-xs">{t("footnote")}</span>
			</div>
		</OnboardingBox>
	);
}

export { OnboardingTrialContent };
