"use client";

import { InfoIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
	type BillingBannerKind,
	resolveBillingBanner,
	trialDaysRemaining,
} from "@/lib/billing";
import { isOrganizationOwnerRole } from "@/lib/organization";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { authClient } from "@/server/better-auth/client";
import { api } from "@/trpc/react";

/**
 * How each banner looks. Read-only is the only one that reports something
 * already being refused, so it is the only one in red; a failing payment is a
 * warning about what happens next, and a seat count is neither.
 */
const TONE = {
	read_only: {
		Icon: TriangleAlertIcon,
		container: "bg-red-50",
		icon: "text-red-600",
		title: "text-red-800",
		body: "text-red-700",
	},
	payment_failing: {
		Icon: TriangleAlertIcon,
		container: "bg-amber-50",
		icon: "text-amber-600",
		title: "text-amber-800",
		body: "text-amber-700",
	},
	trial: {
		Icon: InfoIcon,
		container: "bg-blue-50",
		icon: "text-blue-600",
		title: "text-blue-800",
		body: "text-blue-700",
	},
	over_seat_limit: {
		Icon: InfoIcon,
		container: "bg-blue-50",
		icon: "text-blue-600",
		title: "text-blue-800",
		body: "text-blue-700",
	},
} as const satisfies Record<BillingBannerKind, unknown>;

/**
 * Tells every member of an organization when something is wrong with its
 * billing, and who can do something about it.
 *
 * The explanation is the same for everyone; only the action differs. A member
 * who is refused an action with no explanation becomes a support ticket, and
 * pointing them at their owner is what deflects it.
 *
 * State comes from the status query the application layout prefetches — the
 * same one the billing page reads — so the two cannot disagree about what
 * state an organization is in.
 */
function BillingBanner({ className, ...props }: React.ComponentProps<"div">) {
	const t = useTranslations("modules.shared.billingBanner");
	const status = api.billing.status.useQuery();
	const role = authClient.useActiveMemberRole();

	const data = status.data;

	// Nothing to say on a deployment that does not bill, and nothing to read
	// off the disabled branch of the status either.
	if (!data?.enabled) return null;

	const kind = resolveBillingBanner(data);
	if (!kind) return null;

	const tone = TONE[kind];
	const isOwner = isOrganizationOwnerRole(role.data?.role);

	// Flat rather than a helper: `data` is narrowed to the branch that has a
	// seat count, and that narrowing does not survive into a nested function.
	let title: string;
	let description: string;

	switch (kind) {
		case "read_only":
			title = t("readOnly.title");
			description = t("readOnly.description");
			break;
		case "payment_failing":
			title = t("paymentFailing.title");
			description = t("paymentFailing.description");
			break;
		case "trial": {
			// Counted from the period end, which during a trial is when the trial
			// ends rather than when a payment is due.
			const days = trialDaysRemaining(
				data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : null,
				new Date(),
			);
			title = t("trial.title");
			description =
				days && days > 0
					? t("trial.description", { days })
					: t("trial.descriptionLastDay");
			break;
		}
		case "over_seat_limit":
			title = t("overSeatLimit.title");
			description = t("overSeatLimit.description", {
				used: data.seatCount,
				// Only an organization with a seat limit can exceed one, so the
				// fallback is unreachable in practice.
				included: data.seatLimit ?? 0,
			});
			break;
	}

	return (
		<div
			className={cn(
				"flex flex-nowrap items-start justify-start gap-3 rounded-xl px-5 py-4",
				tone.container,
				className,
			)}
			data-slot="billing-banner"
			{...props}
		>
			<tone.Icon className={cn("mt-0.5 size-4 shrink-0", tone.icon)} />
			<div className="min-w-0 flex-1">
				<p className={cn("font-semibold text-sm", tone.title)}>{title}</p>
				<p className={cn("mt-1 max-w-4xl text-sm", tone.body)}>{description}</p>
				{/* Withheld until the role is known — pending or failed — so an owner
				    is never told to go and find themselves. */}
				{role.data && !isOwner && (
					<p className={cn("mt-1 max-w-4xl text-sm", tone.body)}>
						{t("memberHint")}
					</p>
				)}
			</div>
			{!role.isPending && isOwner && (
				<Button
					render={<Link href={ROUTES.SETTINGS_ORG_BILLING()}>{t("action")}</Link>}
					size="sm"
					variant="outline"
				/>
			)}
		</div>
	);
}

export { BillingBanner };
