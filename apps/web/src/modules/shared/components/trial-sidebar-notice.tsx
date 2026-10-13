"use client";

import { ArrowUpRightIcon, InfoIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { resolveBillingBanner } from "@/lib/billing";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useTrialDaysRemaining } from "../hooks";

/**
 * How long an organization's trial has left, at the foot of the sidebar.
 *
 * The trial is the one billing state that is not a problem, so it sits beside
 * the navigation rather than above every page; the problems keep the top
 * (`BillingBanner`). It reads the same status query and the same decision, so
 * it appears exactly when the banner would have said "trial".
 */
function TrialSidebarNotice({
	className,
	isOwner,
	...props
}: React.ComponentProps<"div"> & { isOwner: boolean }) {
	const t = useTranslations("modules.shared.billingBanner");
	const status = api.billing.status.useQuery();

	const data = status.data;

	// Read before any return, as hooks must be. During a trial the period end
	// is when the trial ends rather than when a payment is due.
	const trialDays = useTrialDaysRemaining(
		data?.enabled && data.trialing && data.currentPeriodEnd
			? new Date(data.currentPeriodEnd)
			: null,
	);

	if (!data?.enabled || resolveBillingBanner(data) !== "trial") return null;

	// Zero means the end has passed and Stripe has not yet said so: the trial
	// is over, not ending today. No end date at all is a trial whose length
	// Zemio cannot state, so it states none.
	const description =
		trialDays === null
			? t("trial.descriptionNoDate")
			: trialDays === 0
				? t("trial.descriptionEnded")
				: t("trial.description", { days: trialDays });

	return (
		<div
			className={cn(
				"rounded-lg bg-white p-3 shadow-xs ring-1 ring-base-700/10",
				className,
			)}
			data-slot="trial-sidebar-notice"
			{...props}
		>
			<div className="flex items-center gap-2">
				<InfoIcon className="size-4 shrink-0 text-accent-500" />
				<p className="font-semibold text-accent-700 text-sm">{t("trial.title")}</p>
			</div>
			<p className="mt-1.5 text-base-500 text-xs">{description}</p>
			{isOwner ? (
				<Button
					className="mt-3 w-full"
					render={
						<Link href={ROUTES.SETTINGS_ORG_BILLING()}>
							{t("action")} <ArrowUpRightIcon />
						</Link>
					}
					size="sm"
					variant="outline"
				/>
			) : (
				<p className="mt-1.5 font-medium text-accent-600 text-xs">
					{t("memberHint")}
				</p>
			)}
		</div>
	);
}

export { TrialSidebarNotice };
