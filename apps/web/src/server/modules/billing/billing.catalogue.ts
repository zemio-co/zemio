import "server-only";
import type Stripe from "stripe";
import { logger } from "@/lib/logger";
import { withStripe } from "./billing.stripe";

/**
 * The catalogue of tiers an organization can buy, read from Stripe.
 *
 * Nothing here names a tier, an amount or a seat count. Tiers are whatever
 * Stripe prices say they are, which is what lets a negotiated XL deal be
 * provisioned by creating a price in the dashboard rather than by a deploy
 * (ADR-0003).
 */

/** The price metadata keys that mark a Stripe price as a Zemio tier. */
const TIER_KEY = "zemio_tier";
const SEATS_KEY = "zemio_seats";

/**
 * Names the one organization a price is for.
 *
 * Absent on a published tier, which is what everyone sees. Present on a
 * negotiated deal, which only the organization it was negotiated for may see or
 * buy — a price has to carry Zemio's tier metadata for the webhook to record a
 * tier from it (ADR-0003), so without this a bespoke XL rate would sit in the
 * public catalogue for every other customer to read and subscribe to.
 */
const ORG_KEY = "zemio_org";

/**
 * Marks the one price a trial runs on.
 *
 * Explicit rather than inferred. "The lowest tier" is ambiguous between fewest
 * seats and cheapest, the two diverge across billing intervals, and any
 * inference would break the first time a promotional price is added
 * (ADR-0009).
 */
const TRIAL_KEY = "zemio_trial";

/** A tier as the product displays it. Every field comes from Stripe. */
export type Tier = {
	priceId: string;
	/** The tier's name as the dashboard spells it — `M`, or a negotiated `XL`. */
	name: string;
	seatLimit: number;
	/** In the currency's minor unit, as Stripe reports it. */
	amount: number;
	currency: string;
	/** The billing interval, e.g. `month` or `year`. */
	interval: string;
};

/**
 * The slice of the Stripe client the catalogue uses.
 *
 * Narrow on purpose: the tests supply a stub rather than a Stripe instance,
 * and the catalogue cannot quietly grow a dependency on the rest of the API.
 */
export type TierPriceSource = {
	prices: Pick<Stripe.PriceResource, "list">;
};

/**
 * The largest seat count a subscription can be recorded with.
 *
 * `Subscription.seatLimit` is a Postgres `INTEGER`. A price asking for more is
 * refused here, where it costs nobody anything, rather than at the webhook's
 * write — a price the catalogue does not carry is one checkout will not sell
 * (ADR-0003), so the misconfiguration surfaces before an organization has paid
 * for a subscription Zemio would then fail to store.
 */
const MAX_SEAT_LIMIT = 2_147_483_647;

/** Whole, positive seat counts only — anything else is a misconfigured price. */
function parseSeatLimit(value: string | undefined): number | null {
	if (value === undefined || value.trim() === "") return null;
	const seats = Number(value);
	return Number.isInteger(seats) && seats > 0 && seats <= MAX_SEAT_LIMIT
		? seats
		: null;
}

/**
 * Reads a tier off a Stripe price, or `null` if the price is not one.
 *
 * A price that fails any of these checks is skipped rather than reported: the
 * Stripe account holds prices that have nothing to do with tiers, and a
 * half-tagged price is a mistake in the dashboard, not something to show a
 * customer as a broken tier.
 */
export function tierFromPrice(price: Stripe.Price): Tier | null {
	const name = price.metadata?.[TIER_KEY]?.trim();
	if (!name) return null;

	const seatLimit = parseSeatLimit(price.metadata?.[SEATS_KEY]);
	if (seatLimit === null) return null;

	// A tiered or metered price has no single amount to display, and a one-off
	// price cannot carry a subscription.
	if (price.unit_amount === null) return null;
	if (!price.recurring) return null;

	// A price charged every three months is not a monthly price, and showing it
	// as one understates what the customer is about to agree to by a factor of
	// three. Zemio displays one amount against one interval, so a price whose
	// interval it cannot state plainly is not offered at all — the dashboard is
	// the source of truth (ADR-0003), and a tier misconfigured there should be
	// invisible rather than misleading.
	if (price.recurring.interval_count !== 1) return null;

	return {
		priceId: price.id,
		name,
		seatLimit,
		amount: price.unit_amount,
		currency: price.currency,
		interval: price.recurring.interval,
	};
}

/**
 * How long a read of the catalogue is reused.
 *
 * The catalogue is read on page loads and changes a few times a year, so a
 * short window removes almost every Stripe call while keeping a dashboard
 * price change visible within minutes rather than needing a restart.
 */
export const TIER_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * A tier as cached, with the audience it is for.
 *
 * `offeredTo` never leaves this module: which organization a negotiated deal
 * belongs to is nobody else's business, least of all the browser's.
 */
type CatalogueEntry = {
	tier: Tier;
	offeredTo: string | null;
	isTrial: boolean;
};

let cached: { entries: CatalogueEntry[]; expiresAt: number } | null = null;

/**
 * The read already running, if one is.
 *
 * Page loads arrive in bursts, so the moment the window expires every caller in
 * that burst would otherwise start its own walk of Stripe's pages and race the
 * others to write the same answer. They wait on the first one's read instead.
 * A read that fails is forgotten rather than kept, so the caller after an
 * outage retries rather than being handed the rejection the outage produced.
 */
let inFlight: Promise<CatalogueEntry[]> | null = null;

/** Drops the cached catalogue, so one test's read cannot serve the next. */
export function clearTierCatalogue(): void {
	cached = null;
	inFlight = null;
}

async function fetchCatalogue(
	stripe: TierPriceSource,
): Promise<CatalogueEntry[]> {
	const entries: CatalogueEntry[] = [];
	let startingAfter: string | undefined;

	// Paged rather than capped: every negotiated XL deal adds a price, so the
	// number of prices grows with the customer base and a single page would
	// silently start dropping tiers.
	while (true) {
		const page = await withStripe("prices.list", () =>
			stripe.prices.list({
				active: true,
				limit: 100,
				...(startingAfter ? { starting_after: startingAfter } : {}),
			}),
		);

		for (const price of page.data) {
			const tier = tierFromPrice(price);
			if (tier) {
				entries.push({
					tier,
					offeredTo: price.metadata?.[ORG_KEY]?.trim() || null,
					isTrial: price.metadata?.[TRIAL_KEY]?.trim() === "true",
				});
			}
		}

		const last = page.data.at(-1);
		if (!page.has_more || !last) break;
		startingAfter = last.id;
	}

	// Cheapest first, so a tier added in the dashboard lands in its place
	// without anything in Zemio knowing the order tiers are meant to come in.
	return entries.sort((a, b) => a.tier.amount - b.tier.amount);
}

function readCatalogue(stripe: TierPriceSource): Promise<CatalogueEntry[]> {
	if (cached && cached.expiresAt > Date.now()) {
		return Promise.resolve(cached.entries);
	}

	inFlight ??= fetchCatalogue(stripe)
		.then((entries) => {
			cached = { entries, expiresAt: Date.now() + TIER_CACHE_TTL_MS };
			return entries;
		})
		.finally(() => {
			inFlight = null;
		});

	return inFlight;
}

/**
 * The tiers an organization may buy, from a catalogue cached process-wide.
 *
 * The cache holds every tier and the filtering happens per read, because what
 * Stripe offers is one question and what this organization may see is another —
 * caching the answer to the second would key the cache by organization for no
 * gain and risk serving one organization's deal to another.
 *
 * A failed read caches nothing, so a Stripe outage does not turn into an empty
 * pricing page for the length of the window.
 */
export async function listTiers(
	stripe: TierPriceSource,
	organizationId: string,
): Promise<Tier[]> {
	const entries = await readCatalogue(stripe);

	// Copied down to the tier, not just the array: a caller adjusting a tier it
	// was handed must not rewrite the price every later caller reads.
	return entries
		.filter(
			(entry) => entry.offeredTo === null || entry.offeredTo === organizationId,
		)
		.map((entry) => ({ ...entry.tier }));
}

/**
 * The tier a trial runs on, or `null` if the dashboard names none.
 *
 * A negotiated price is never eligible however it is tagged: a trial is
 * offered to everyone who creates an organization, and a deal negotiated for
 * one customer is not something to hand the next one.
 *
 * More than one tagged price is a misconfiguration rather than a choice. The
 * cheapest is used so that organizations keep being created, and the mistake
 * is logged rather than swallowed — silently picking one and saying nothing is
 * how a dashboard edit becomes an unexplained charge.
 */
export async function findTrialTier(
	stripe: TierPriceSource,
): Promise<Tier | null> {
	const entries = await readCatalogue(stripe);
	const eligible = entries.filter(
		(entry) => entry.isTrial && entry.offeredTo === null,
	);

	const chosen = eligible[0];
	if (!chosen) return null;

	if (eligible.length > 1) {
		logger.error("More than one Stripe price is tagged as the trial tier", {
			priceIds: eligible.map((entry) => entry.tier.priceId),
			using: chosen.tier.priceId,
		});
	}

	return { ...chosen.tier };
}
