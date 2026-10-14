"use client";

import {
	Badge,
	Button,
	Field,
	FieldContent,
	FieldDescription,
	FieldTitle,
	Skeleton,
} from "@zemio/ui";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import React from "react";
import { toast } from "sonner";
import { CHECKOUT_RESULT, CHECKOUT_RESULT_PARAM } from "@/lib/billing";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import {
	SettingsCard,
	SettingsCardContent,
	SettingsCardLabel,
} from "../settings-card";
import { SettingsError } from "../settings-error";
import { SettingsSubtitle, SettingsTitle } from "../settings-typography";

function OrgSettingsBilling({
	className,
	...props
}: React.ComponentProps<"main">) {
	const t = useTranslations("modules.settings.billing");

	return (
		<main
			className={cn("py-16", className)}
			data-slot="org-settings-billing"
			{...props}
		>
			<div className="container max-w-4xl space-y-1">
				<SettingsTitle>{t("title")}</SettingsTitle>
				<SettingsSubtitle>{t("description")}</SettingsSubtitle>
			</div>
			<div className="container mt-12 max-w-4xl">
				<SubscriptionSection />
			</div>
			<div className="container mt-12 max-w-4xl">
				<TiersSection />
			</div>
			<div className="container mt-12 max-w-4xl">
				<CustomTierSection />
			</div>
		</main>
	);
}

/**
 * Whether the owner has just come back from a completed checkout.
 *
 * Stripe appends this on the way back; the parameter and its values belong to
 * the checkout service, which hands them to Stripe before this page exists.
 */
function useCheckoutResult() {
	const params = useSearchParams();
	const result = params.get(CHECKOUT_RESULT_PARAM);

	return {
		completed: result === CHECKOUT_RESULT.complete,
		cancelled: result === CHECKOUT_RESULT.cancelled,
	};
}

/** How often the subscription is asked for while it is on its way. */
const CONFIRMATION_POLL_MS = 3_000;

/**
 * How long it is worth waiting for.
 *
 * The webhook normally lands within a second or two. If it has not arrived by
 * now something is wrong with it — a misconfigured endpoint, a Stripe outage —
 * and no amount of further asking will fix that. Polling has to stop rather
 * than leave a paying owner watching a spinner forever while the browser and
 * the server trade requests all day.
 */
const CONFIRMATION_TIMEOUT_MS = 60_000;

/**
 * The subscription an organization pays for, once it has one.
 *
 * While an owner is returning from a completed checkout the subscription may
 * not have arrived yet — Zemio learns it from the webhook, which races the
 * browser — so the query is polled for a bounded while rather than telling
 * someone who has just paid that they have nothing.
 */
function SubscriptionSection({
	className,
	...props
}: React.ComponentProps<"div">) {
	const t = useTranslations("modules.settings.billing");
	const tShared = useTranslations("modules.settings.shared");
	const { completed } = useCheckoutResult();
	const [waitedTooLong, setWaitedTooLong] = React.useState(false);

	// `waitedTooLong` is a dependency so that retrying arms a fresh timer: it
	// clears the flag, and without a re-run the poll below would resume with
	// nothing left to stop it again. The guard is what keeps that from looping
	// once the timer has fired.
	React.useEffect(() => {
		if (!completed || waitedTooLong) return;

		const timer = setTimeout(
			() => setWaitedTooLong(true),
			CONFIRMATION_TIMEOUT_MS,
		);

		return () => clearTimeout(timer);
	}, [completed, waitedTooLong]);

	const query = api.billing.status.useQuery(undefined, {
		refetchInterval: (q) => {
			const arrived = q.state.data?.enabled && q.state.data.tier;

			return completed && !arrived && !waitedTooLong
				? CONFIRMATION_POLL_MS
				: false;
		},
	});

	if (query.isPending) {
		return <Skeleton className={cn("h-64 w-full", className)} {...props} />;
	}

	if (query.error) {
		const { error } = query;

		return (
			<SettingsError
				description={error.data?.code ?? tShared("unknownError")}
				message={error.message}
			/>
		);
	}

	const { data } = query;

	// The status is a union on `enabled`, and there is no tier to speak of on
	// the disabled branch. The page itself is absent on such a deployment.
	if (!data.enabled) {
		return null;
	}

	if (!data.tier) {
		if (!completed) {
			return null;
		}

		// Paid for, but Zemio has not been told yet. Never a spinner without an
		// end: either it is still arriving, or it should have by now and the
		// owner is told so plainly rather than left watching.
		return (
			<SettingsCard
				className={cn(className)}
				data-slot="org-settings-billing-confirming"
				{...props}
			>
				<SettingsCardLabel>{t("sections.subscription")}</SettingsCardLabel>
				<SettingsCardContent>
					<Field>
						<FieldContent>
							<FieldTitle>
								{waitedTooLong ? t("confirming.slowLabel") : t("confirming.label")}
							</FieldTitle>
							<FieldDescription>
								{waitedTooLong
									? t("confirming.slowDescription")
									: t("confirming.description")}
							</FieldDescription>
						</FieldContent>
						<div className="flex items-center">
							{waitedTooLong ? (
								<Button
									disabled={query.isFetching}
									onClick={() => {
										setWaitedTooLong(false);
										void query.refetch();
									}}
									type="button"
									variant="outline"
								>
									{t("confirming.retry")}
								</Button>
							) : (
								<span className="text-base-500 text-sm">{t("confirming.waiting")}</span>
							)}
						</div>
					</Field>
				</SettingsCardContent>
			</SettingsCard>
		);
	}

	return (
		<SettingsCard
			className={cn(className)}
			data-slot="org-settings-billing-subscription"
			{...props}
		>
			<SettingsCardLabel>{t("sections.subscription")}</SettingsCardLabel>
			<SettingsCardContent>
				<CurrentSubscription
					cancelAtPeriodEnd={data.cancelAtPeriodEnd}
					currentPeriodEnd={data.currentPeriodEnd}
					// The webhook rewrites the whole row on a cancellation and only
					// `status` moves, so the tier and the period end outlive the
					// subscription itself. Without this the page tells an owner their
					// subscription renews on a future date — on the very page the
					// read-only banner sent them to.
					lapsed={data.state === "read_only"}
					overSeatLimit={data.overSeatLimit}
					seatCount={data.seatCount}
					seatLimit={data.seatLimit}
					tier={data.tier}
				/>
			</SettingsCardContent>
		</SettingsCard>
	);
}

type CurrentSubscriptionProps = {
	tier: string;
	seatLimit: number | null;
	seatCount: number;
	overSeatLimit: boolean;
	currentPeriodEnd: Date | null;
	cancelAtPeriodEnd: boolean;
	/** Whether what is shown is a subscription that has already ended. */
	lapsed: boolean;
};

function CurrentSubscription({
	tier,
	seatLimit,
	seatCount,
	overSeatLimit,
	currentPeriodEnd,
	cancelAtPeriodEnd,
	lapsed,
}: CurrentSubscriptionProps) {
	const t = useTranslations("modules.settings.billing");

	return (
		<>
			<Field>
				<FieldContent>
					<FieldTitle>{t("current.tier")}</FieldTitle>
					<FieldDescription>
						{lapsed
							? t("current.tierDescriptionLapsed")
							: t("current.tierDescription")}
					</FieldDescription>
				</FieldContent>
				<div className="flex items-center gap-2">
					<span className="font-medium text-base-800 text-sm">{tier}</span>
					{lapsed && <Badge variant="secondary">{t("current.lapsed")}</Badge>}
				</div>
			</Field>

			<Field>
				<FieldContent>
					<FieldTitle>{t("current.seats")}</FieldTitle>
					<FieldDescription>{t("current.seatsDescription")}</FieldDescription>
				</FieldContent>
				<div className="flex items-center gap-2">
					<span className="font-medium text-base-800 text-sm">
						{seatLimit === null
							? t("current.seatsUsedOnly", { used: seatCount })
							: t("current.seatsUsed", { used: seatCount, included: seatLimit })}
					</span>
					{/* Advisory, never a barrier — so it is noted, not alarming (ADR-0005). */}
					{overSeatLimit && (
						<Badge variant="secondary">{t("current.overSeatLimit")}</Badge>
					)}
				</div>
			</Field>

			{/* A lapsed subscription has no next period, and its recorded period end
			    can sit in the future after an immediate cancellation — so the date
			    is withheld rather than presented as a renewal that is not coming. */}
			{lapsed ? (
				<Field>
					<FieldContent>
						<FieldTitle>{t("current.lapsed")}</FieldTitle>
						<FieldDescription>{t("current.lapsedDescription")}</FieldDescription>
					</FieldContent>
				</Field>
			) : (
				<Field>
					<FieldContent>
						<FieldTitle>
							{cancelAtPeriodEnd ? t("current.ends") : t("current.renews")}
						</FieldTitle>
						<FieldDescription>
							{cancelAtPeriodEnd
								? t("current.endsDescription")
								: t("current.renewsDescription")}
						</FieldDescription>
					</FieldContent>
					<div className="flex items-center gap-2">
						<span className="font-medium text-base-800 text-sm">
							{currentPeriodEnd ? format(currentPeriodEnd, "dd.MM.yyyy") : "—"}
						</span>
						{cancelAtPeriodEnd && (
							<Badge variant="secondary">{t("current.cancelling")}</Badge>
						)}
					</div>
				</Field>
			)}

			<Field>
				<FieldContent>
					<FieldTitle>{t("current.manage")}</FieldTitle>
					<FieldDescription>{t("current.manageDescription")}</FieldDescription>
				</FieldContent>
				<div className="flex items-center">
					<PortalButton />
				</div>
			</Field>
		</>
	);
}

function PortalButton() {
	const t = useTranslations("modules.settings.billing");

	const openPortal = api.billing.openPortal.useMutation({
		onSuccess: ({ url }) => {
			window.location.href = url;
		},
		onError: (error) => {
			toast.error(t("portalErrorTitle"), {
				description: error.message ?? t("errorFallback"),
			});
		},
	});

	return (
		<Button
			disabled={openPortal.isPending}
			onClick={() => openPortal.mutate()}
			type="button"
			variant="outline"
		>
			{t("current.openPortal")}
		</Button>
	);
}

// ======= TIERS ===========================================================================

/**
 * What the organization could pay for. Absent once it pays for something —
 * changing tier is the portal's job, not a second checkout.
 */
function TiersSection({ className, ...props }: React.ComponentProps<"div">) {
	const t = useTranslations("modules.settings.billing");
	const tShared = useTranslations("modules.settings.shared");
	const { cancelled, completed } = useCheckoutResult();
	const status = api.billing.status.useQuery();
	const query = api.billing.tiers.useQuery();

	if (status.isPending || query.isPending) {
		return <Skeleton className={cn("h-64 w-full", className)} {...props} />;
	}

	if (query.error) {
		const { error } = query;

		return (
			<SettingsError
				description={error.data?.code ?? tShared("unknownError")}
				message={error.message}
			/>
		);
	}

	// Whether this organization already pays for something is unknown while the
	// status query is failing, and the guard below reads a failed query as "no
	// subscription" — which would offer checkout to an organization that
	// already has one. Silent rather than a second error card: SubscriptionSection
	// sits above this one on the same query and has already reported it.
	if (status.error) {
		return null;
	}

	// A checkout Stripe has confirmed but whose webhook has not landed yet leaves
	// `tier` null, which would otherwise read as "no subscription" and offer the
	// list again. A second checkout there buys a second Stripe subscription on
	// the same customer, and since the local row is keyed by organization the
	// later webhook overwrites the earlier one — two subscriptions billed, one
	// recorded. SubscriptionSection is already showing the confirmation.
	if (completed) {
		return null;
	}

	// Nothing to offer an organization that already pays for one of these.
	//
	// `tier` alone cannot answer that: a lapsed subscription keeps its tier,
	// because the webhook rewrites the whole row on `customer.subscription
	// .deleted` and only `status` moves. Reading tier by itself would hide the
	// tiers from precisely the organization that has to buy one again — and the
	// portal has nothing to sell it either, since its subscription is gone.
	if (
		status.data?.enabled &&
		status.data.tier &&
		status.data.state !== "read_only"
	) {
		return null;
	}

	return (
		<SettingsCard
			className={cn(className)}
			data-slot="org-settings-billing-tiers"
			{...props}
		>
			<SettingsCardLabel>{t("sections.tiers")}</SettingsCardLabel>
			<SettingsCardContent>
				{cancelled && (
					<Field>
						<FieldContent>
							<FieldTitle>{t("cancelled.label")}</FieldTitle>
							<FieldDescription>{t("cancelled.description")}</FieldDescription>
						</FieldContent>
						<div />
					</Field>
				)}
				<TierList tiers={query.data} />
			</SettingsCardContent>
		</SettingsCard>
	);
}

type Tier = {
	priceId: string;
	name: string;
	seatLimit: number;
	amount: number;
	currency: string;
	interval: string;
};

const INTERVAL_KEYS = {
	day: "intervals.day",
	week: "intervals.week",
	month: "intervals.month",
	year: "intervals.year",
} as const;

/**
 * Stripe's minor units as the figure the currency is written in.
 *
 * An `amount` of 1900 is €19.00 — but ¥1,900, since JPY has no minor unit at
 * all, and 1.900 KWD, which has three. Dividing by a hundred would put a price
 * on the page that Checkout then disagrees with, which is what ADR-0003 exists
 * to prevent. The exponent is asked of `Intl`, which carries the currency data
 * already: writing the exponents out here would put commercial fact in Zemio
 * instead of at the provider, and would be wrong for the first currency nobody
 * thought to add. It is a property of the currency rather than of the reader,
 * so the locale plays no part in it.
 */
export function toMajorUnits(amount: number, currency: string): number {
	// Optional in the type rather than in practice: a currency style always
	// resolves fraction digits, and a currency the runtime holds no data on
	// resolves to the two this default repeats.
	const { maximumFractionDigits = 2 } = new Intl.NumberFormat(undefined, {
		style: "currency",
		currency,
	}).resolvedOptions();

	return amount / 10 ** maximumFractionDigits;
}

function TierList({ tiers }: { tiers: Tier[] }) {
	const t = useTranslations("modules.settings.billing");
	const formatter = useFormatter();

	const startCheckout = api.billing.startCheckout.useMutation({
		onSuccess: ({ url }) => {
			window.location.href = url;
		},
		onError: (error) => {
			toast.error(t("checkoutErrorTitle"), {
				description: error.message ?? t("errorFallback"),
			});
		},
	});

	if (tiers.length === 0) {
		return (
			<Field>
				<FieldContent>
					<FieldTitle>{t("noTiers")}</FieldTitle>
					<FieldDescription>{t("noTiersDescription")}</FieldDescription>
				</FieldContent>
				<div />
			</Field>
		);
	}

	return (
		<>
			{tiers.map((tier) => (
				<Field key={tier.priceId}>
					<FieldContent>
						<FieldTitle>{t("tier.name", { name: tier.name })}</FieldTitle>
						<FieldDescription>
							{t("tier.includedSeats", { seats: tier.seatLimit })}
						</FieldDescription>
					</FieldContent>
					<div className="flex items-center justify-between gap-4">
						<span className="font-medium text-base-800 text-sm">
							{t("tier.perInterval", {
								// Minor units in the provider's own currency, never a figure
								// from this codebase (ADR-0003).
								amount: formatter.number(toMajorUnits(tier.amount, tier.currency), {
									style: "currency",
									currency: tier.currency.toUpperCase(),
								}),
								interval: t(
									INTERVAL_KEYS[tier.interval as keyof typeof INTERVAL_KEYS] ??
										INTERVAL_KEYS.month,
								),
							})}
						</span>
						<Button
							disabled={startCheckout.isPending}
							onClick={() => startCheckout.mutate({ priceId: tier.priceId })}
							type="button"
						>
							{t("tier.choose")}
						</Button>
					</div>
				</Field>
			))}
		</>
	);
}

// ======= CUSTOM ARRANGEMENT ==============================================================

/**
 * The way out of a pricing page for an organization the published tiers do not
 * fit. A tenant match can put four hundred people in an organization through
 * nobody's action, and such an organization should be talking to a person
 * rather than looking at a tier it cannot use (ADR-0005).
 */
function CustomTierSection({
	className,
	...props
}: React.ComponentProps<"div">) {
	const t = useTranslations("modules.settings.billing");

	return (
		<SettingsCard
			className={cn(className)}
			data-slot="org-settings-billing-custom"
			{...props}
		>
			<SettingsCardLabel>{t("sections.custom")}</SettingsCardLabel>
			<SettingsCardContent>
				<Field>
					<FieldContent>
						<FieldTitle>{t("custom.label")}</FieldTitle>
						<FieldDescription>{t("custom.description")}</FieldDescription>
					</FieldContent>
					<div className="flex items-center">
						<Button
							render={
								<a href={`mailto:${t("custom.contactEmail")}`}>{t("custom.action")}</a>
							}
							variant="outline"
						/>
					</div>
				</Field>
			</SettingsCardContent>
		</SettingsCard>
	);
}

export { OrgSettingsBilling };
