/**
 * Sets up a Stripe sandbox for verifying the billing webhook by hand, and
 * drives a subscription through its lifecycle.
 *
 * Development only, and test mode only — it refuses to run against a live key.
 * It creates real objects in the sandbox: two tier prices, a customer, and a
 * subscription.
 *
 * `seed` sets a customer up front so the webhook can be exercised without a
 * hosted checkout. To watch checkout create that customer itself, clear
 * `organization.stripeCustomerId` first and use `checkout`.
 *
 *   bun run scripts/billing-sandbox.ts seed
 *   bun run scripts/billing-sandbox.ts create S|M
 *   bun run scripts/billing-sandbox.ts change S|M
 *   bun run scripts/billing-sandbox.ts cancel
 *   bun run scripts/billing-sandbox.ts show
 *   bun run scripts/billing-sandbox.ts teardown
 *
 * `checkout` calls the real service rather than rebuilding its arguments, so
 * what Stripe is asked for is what production asks for. That needs the module
 * graph's `server-only` guard resolved the way Next.js resolves it:
 *
 *   bun --conditions=react-server scripts/billing-sandbox.ts checkout S|M
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@zemio/db";
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey?.startsWith("sk_test_")) {
	throw new Error(
		"STRIPE_SECRET_KEY must be a test-mode key (sk_test_…). Refusing to touch a live account.",
	);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");

const stripe = new Stripe(secretKey);
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** The tiers this script provisions. Sandbox fixtures, not a catalogue. */
const TIERS = [
	{ name: "S", seats: 10, amount: 900 },
	{ name: "M", seats: 25, amount: 1900 },
];

const PRODUCT_NAME = "Zemio (sandbox fixture)";
const CUSTOMER_EMAIL = "sandbox@zemio.test";

async function organization() {
	const org = await db.organization.findFirst({ orderBy: { createdAt: "asc" } });
	if (!org) throw new Error("No organization in the local database to bill.");
	return org;
}

async function findProduct(): Promise<Stripe.Product | null> {
	const products = await stripe.products.list({ active: true, limit: 100 });
	return products.data.find((p) => p.name === PRODUCT_NAME) ?? null;
}

async function seed() {
	const product =
		(await findProduct()) ??
		(await stripe.products.create({ name: PRODUCT_NAME }));

	const prices = await stripe.prices.list({
		product: product.id,
		active: true,
		limit: 100,
	});

	for (const tier of TIERS) {
		const existing = prices.data.find((p) => p.metadata.zemio_tier === tier.name);
		if (existing) {
			console.log(`price ${tier.name}: exists (${existing.id})`);
			continue;
		}
		const price = await stripe.prices.create({
			product: product.id,
			currency: "eur",
			unit_amount: tier.amount,
			recurring: { interval: "month" },
			metadata: { zemio_tier: tier.name, zemio_seats: String(tier.seats) },
		});
		console.log(`price ${tier.name}: created (${price.id})`);
	}

	// A price deliberately left untagged, to prove the catalogue skips it.
	const untagged = prices.data.find((p) => p.metadata.zemio_tier === undefined);
	if (!untagged) {
		const price = await stripe.prices.create({
			product: product.id,
			currency: "eur",
			unit_amount: 100,
			recurring: { interval: "month" },
		});
		console.log(`price untagged: created (${price.id})`);
	}

	const org = await organization();
	let customerId = org.stripeCustomerId;

	if (customerId) {
		const existing = await stripe.customers.retrieve(customerId);
		if (existing.deleted) customerId = null;
	}

	if (!customerId) {
		const customer = await stripe.customers.create({
			email: CUSTOMER_EMAIL,
			name: org.name,
			metadata: { organizationId: org.id },
			// A test-mode card that always succeeds, so a subscription becomes
			// active rather than incomplete.
			payment_method: "pm_card_visa",
			invoice_settings: { default_payment_method: "pm_card_visa" },
		});
		customerId = customer.id;
	}

	await db.organization.update({
		where: { id: org.id },
		data: { stripeCustomerId: customerId, billingEnforced: true },
	});

	console.log(`organization ${org.name} (${org.id})`);
	console.log(`  stripeCustomerId: ${customerId}`);
	console.log("  billingEnforced : true");
}

async function priceFor(tierName: string): Promise<string> {
	const product = await findProduct();
	if (!product) throw new Error("Run `seed` first.");
	const prices = await stripe.prices.list({
		product: product.id,
		active: true,
		limit: 100,
	});
	const price = prices.data.find((p) => p.metadata.zemio_tier === tierName);
	if (!price) throw new Error(`No sandbox price for tier ${tierName}.`);
	return price.id;
}

async function currentSubscription(): Promise<Stripe.Subscription | null> {
	const org = await organization();
	if (!org.stripeCustomerId) return null;
	const subs = await stripe.subscriptions.list({
		customer: org.stripeCustomerId,
		status: "all",
		limit: 10,
	});
	return subs.data.find((s) => s.status !== "canceled") ?? null;
}

async function create(tierName: string) {
	const org = await organization();
	if (!org.stripeCustomerId) throw new Error("Run `seed` first.");

	// Zemio keeps one subscription row per organization and teardown cancels
	// one subscription, so a second live one would bill with nothing on either
	// side of the integration showing it.
	const existing = await currentSubscription();
	if (existing) {
		throw new Error(
			`Subscription ${existing.id} is already live (${existing.status}). Use \`change\` to move tier, or \`cancel\` first.`,
		);
	}

	const subscription = await stripe.subscriptions.create({
		customer: org.stripeCustomerId,
		items: [{ price: await priceFor(tierName) }],
	});
	console.log(`subscription ${subscription.id}: ${subscription.status}`);
}

/**
 * Starts a card-less trial that ends in a day, shaped like the one `startTrial`
 * creates.
 *
 * Stripe sends `customer.subscription.trial_will_end` a configured interval
 * before a trial ends — three days by default — and immediately when the
 * trial is shorter than that. A one-day trial is therefore how the warning is
 * produced on demand rather than three days into a real one.
 */
async function trialEnding(tierName: string) {
	const org = await organization();
	if (!org.stripeCustomerId) throw new Error("Run `seed` first.");

	const existing = await currentSubscription();
	if (existing) {
		throw new Error(
			`Subscription ${existing.id} is already live (${existing.status}). \`cancel\` it first.`,
		);
	}

	const subscription = await stripe.subscriptions.create({
		customer: org.stripeCustomerId,
		items: [{ price: await priceFor(tierName) }],
		trial_end: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
		trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
		metadata: { organizationId: org.id, zemio_trial: "true" },
	});
	console.log(`subscription ${subscription.id}: ${subscription.status}`);
}

async function change(tierName: string) {
	const subscription = await currentSubscription();
	if (!subscription) throw new Error("No live subscription to change.");
	const item = subscription.items.data[0];
	if (!item) throw new Error("Subscription has no items.");

	const updated = await stripe.subscriptions.update(subscription.id, {
		items: [{ id: item.id, price: await priceFor(tierName) }],
		proration_behavior: "none",
	});
	console.log(`subscription ${updated.id}: moved to ${tierName}`);
}

async function cancel() {
	const subscription = await currentSubscription();
	if (!subscription) throw new Error("No live subscription to cancel.");
	const canceled = await stripe.subscriptions.cancel(subscription.id);
	console.log(`subscription ${canceled.id}: ${canceled.status}`);
}

/**
 * Starts a real checkout through the real service.
 *
 * Imported lazily so the other commands do not need the `react-server`
 * condition just to reach a module they never call.
 */
async function checkout(tierName: string) {
	const { startCheckout } = await import(
		"../src/server/modules/billing/billing.checkout"
	);

	const org = await organization();
	// Checkout is owner-only in the app (`orgOwnerProcedure`), and the audit
	// trail insists on a real actor. Borrowing any other member would have this
	// script verify a call production never makes.
	const owner = await db.member.findFirst({
		where: { organizationId: org.id, role: "owner" },
		select: { userId: true },
	});

	if (!owner) {
		throw new Error(
			"No owner on this organization. Checkout is owner-only — make someone an owner rather than running it as a member.",
		);
	}

	const { url } = await startCheckout(
		{
			db,
			stripe,
			appUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
		},
		{ organizationId: org.id, userId: owner.userId },
		await priceFor(tierName),
	);

	console.log(`checkout for tier ${tierName}:`);
	console.log(`  ${url}`);
	console.log(
		"Pay with test card 4242 4242 4242 4242, any future expiry, any CVC.",
	);
}

/** What Stripe holds beside what Zemio holds. */
async function show() {
	const org = await organization();
	const local = await db.subscription.findUnique({
		where: { organizationId: org.id },
	});
	const remote = await currentSubscription();

	console.log("Stripe:");
	if (!remote) {
		console.log("  (no live subscription)");
	} else {
		const item = remote.items.data[0];
		console.log(`  id       : ${remote.id}`);
		console.log(`  status   : ${remote.status}`);
		console.log(`  price    : ${item?.price.id}`);
		console.log(`  tier     : ${item?.price.metadata.zemio_tier}`);
		console.log(`  seats    : ${item?.price.metadata.zemio_seats}`);
		console.log(
			`  period   : ${item ? new Date(item.current_period_end * 1000).toISOString() : "—"}`,
		);
		console.log(`  cancelAt : ${remote.cancel_at_period_end}`);
	}

	console.log("Zemio:");
	if (!local) {
		console.log("  (no subscription row)");
	} else {
		console.log(`  id       : ${local.stripeSubscriptionId}`);
		console.log(`  status   : ${local.status}`);
		console.log(`  price    : ${local.stripePriceId}`);
		console.log(`  tier     : ${local.tier}`);
		console.log(`  seats    : ${local.seatLimit}`);
		console.log(`  period   : ${local.currentPeriodEnd.toISOString()}`);
		console.log(`  cancelAt : ${local.cancelAtPeriodEnd}`);
	}

	const events = await db.processedStripeEvent.count();
	console.log(`processed events: ${events}`);
}

async function teardown() {
	const org = await organization();
	const subscription = await currentSubscription();
	if (subscription) await stripe.subscriptions.cancel(subscription.id);
	if (org.stripeCustomerId) await stripe.customers.del(org.stripeCustomerId);

	await db.subscription.deleteMany({ where: { organizationId: org.id } });
	// Processed event ids are left alone. A row names no organization, so there
	// is no way to delete this sandbox's without deleting everyone else's, and
	// that table is the only thing that recognises a Stripe redelivery — losing
	// it means an old event is applied a second time. They cost nothing to
	// keep, and a later run produces its own ids.
	await db.organization.update({
		where: { id: org.id },
		data: { stripeCustomerId: null, billingEnforced: false },
	});
	console.log("sandbox customer and local billing state removed");
	console.log(
		"(processed event ids are kept — they are the idempotency record)",
	);
	console.log("(the fixture product and its prices are left in the sandbox)");
}

const [command, argument] = process.argv.slice(2);

const commands: Record<string, () => Promise<void>> = {
	seed,
	create: () => create(argument ?? "M"),
	"trial-ending": () => trialEnding(argument ?? "S"),
	checkout: () => checkout(argument ?? "M"),
	change: () => change(argument ?? "S"),
	cancel,
	show,
	teardown,
};

const run = commands[command ?? ""];
if (!run) {
	console.error(`Usage: ${Object.keys(commands).join(" | ")}`);
	process.exit(1);
}

await run();
await db.$disconnect();
