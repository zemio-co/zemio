import type { Prisma, PrismaClient } from "@zemio/db";

type Db = PrismaClient;

/**
 * Only the subscription fields entitlement and the status surface actually
 * read. The Stripe references are left out — nothing outside the webhook and
 * the portal needs them, and they must never reach the browser.
 */
const subscriptionSelect = {
	tier: true,
	seatLimit: true,
	status: true,
	currentPeriodEnd: true,
	cancelAtPeriodEnd: true,
} satisfies Prisma.SubscriptionSelect;

const organizationBillingSelect = {
	billingEnforced: true,
	subscription: { select: subscriptionSelect },
} satisfies Prisma.OrganizationSelect;

export type OrganizationBillingRow = Prisma.OrganizationGetPayload<{
	select: typeof organizationBillingSelect;
}>;

export const billingRepository = {
	/** The organization's enforcement override and its subscription, if any. */
	findOrganizationBilling(
		db: Db,
		organizationId: string,
	): Promise<OrganizationBillingRow | null> {
		return db.organization.findUnique({
			where: { id: organizationId },
			select: organizationBillingSelect,
		});
	},

	/**
	 * Seats in use, counted on demand. There is no seat ledger to keep in sync
	 * and nothing is pushed to Stripe as a quantity (ADR-0005).
	 */
	countSeats(db: Db, organizationId: string): Promise<number> {
		return db.member.count({ where: { organizationId } });
	},

	/** The organization's name and the Stripe customer it pays as, if any. */
	findOrganizationCustomer(
		db: Db,
		organizationId: string,
	): Promise<{
		id: string;
		name: string;
		stripeCustomerId: string | null;
	} | null> {
		return db.organization.findUnique({
			where: { id: organizationId },
			select: { id: true, name: true, stripeCustomerId: true },
		});
	},

	/**
	 * Records the Stripe customer an organization pays as, but only while it has
	 * none.
	 *
	 * Conditional on purpose: two checkouts started at once would each create a
	 * customer, and the loser's would be left holding a subscription no
	 * organization claims — the webhook looks organizations up by customer, so
	 * that subscription would be invisible to Zemio forever. The winner is
	 * whichever update matches; the caller reads back who that was.
	 */
	async claimStripeCustomer(
		db: Db,
		organizationId: string,
		stripeCustomerId: string,
	): Promise<boolean> {
		const { count } = await db.organization.updateMany({
			where: { id: organizationId, stripeCustomerId: null },
			data: { stripeCustomerId },
		});
		return count > 0;
	},

	/**
	 * Claims a Stripe event id. Raises `P2002` if it was already claimed, which
	 * is how a redelivery is recognised (ADR-0004).
	 *
	 * Called inside the transaction that writes the state the event describes,
	 * so a failure rolls the claim back with it rather than leaving an event
	 * marked handled that never was.
	 */
	async recordStripeEvent(db: Db, id: string, type: string): Promise<void> {
		await db.processedStripeEvent.create({ data: { id, type } });
	},

	/**
	 * Which Stripe subscription the organization currently has on record, and
	 * what state it was last seen in.
	 *
	 * Read before a webhook writes, so an event about a subscription the
	 * organization has already moved on from can be recognised as such.
	 */
	findSubscription(
		db: Db,
		organizationId: string,
	): Promise<{ stripeSubscriptionId: string; status: string } | null> {
		return db.subscription.findUnique({
			where: { organizationId },
			select: { stripeSubscriptionId: true, status: true },
		});
	},

	/**
	 * Whether an event id has already been claimed.
	 *
	 * Not the idempotency mechanism — the unique constraint in
	 * {@link recordStripeEvent} is, and it is the only one that can decide a
	 * race. This spares the common redelivery a Stripe call and a transaction
	 * when the answer is already settled.
	 */
	async hasProcessedStripeEvent(db: Db, id: string): Promise<boolean> {
		const existing = await db.processedStripeEvent.findUnique({
			where: { id },
			select: { id: true },
		});
		return existing !== null;
	},

	/** The organization paying as this Stripe customer, if Zemio knows one. */
	async findOrganizationIdByStripeCustomer(
		db: Db,
		stripeCustomerId: string,
	): Promise<string | null> {
		const organization = await db.organization.findUnique({
			where: { stripeCustomerId },
			select: { id: true },
		});
		return organization?.id ?? null;
	},

	/** Writes the organization's current subscription state, creating it if new. */
	async upsertSubscription(
		db: Db,
		organizationId: string,
		data: Omit<Prisma.SubscriptionUncheckedCreateInput, "organizationId">,
	): Promise<void> {
		await db.subscription.upsert({
			where: { organizationId },
			create: { organizationId, ...data },
			update: data,
		});
	},

	/**
	 * The organization's name and the address its owner is reachable at.
	 *
	 * Only the owner: a trial is theirs to convert, and telling every member
	 * about a payment they cannot make is noise.
	 */
	async findOwnerContact(
		db: Db,
		organizationId: string,
	): Promise<{ organizationName: string; ownerEmail: string } | null> {
		const organization = await db.organization.findUnique({
			where: { id: organizationId },
			select: {
				name: true,
				members: {
					where: { role: "owner" },
					orderBy: { createdAt: "asc" },
					take: 1,
					select: { user: { select: { email: true } } },
				},
			},
		});

		const ownerEmail = organization?.members[0]?.user.email;
		if (!organization || !ownerEmail) return null;

		return { organizationName: organization.name, ownerEmail };
	},

	/**
	 * Updates a subscription only where one already exists, reporting how many
	 * rows moved. Used where Zemio has facts to record but not enough to create
	 * a row from.
	 */
	async updateSubscriptionIfPresent(
		db: Db,
		organizationId: string,
		data: Prisma.SubscriptionUpdateInput,
	): Promise<number> {
		const { count } = await db.subscription.updateMany({
			where: { organizationId },
			data,
		});
		return count;
	},
};
