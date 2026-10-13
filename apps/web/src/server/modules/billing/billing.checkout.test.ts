import { createMockDb, expectTRPCErrorCode } from "@zemio/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	CHECKOUT_RETURN_PATH,
	type CheckoutDependencies,
	startCheckout,
} from "./billing.checkout";

const TIER_PRICE = "price_m";

function price(overrides: Record<string, unknown> = {}) {
	return {
		id: TIER_PRICE,
		active: true,
		currency: "eur",
		unit_amount: 1900,
		recurring: { interval: "month", interval_count: 1 },
		metadata: { zemio_tier: "M", zemio_seats: "25" },
		...overrides,
	};
}

function deps(
	args: {
		stripeCustomerId?: string | null;
		organization?: unknown;
		prices?: unknown[];
		sessionUrl?: string | null;
		claimed?: boolean;
		subscription?: { status: string; seatLimit: number } | null;
	} = {},
) {
	const db = createMockDb();
	// One mock serves both organization reads the checkout makes — the
	// subscription lookup and the customer lookup.
	db.organization.findUnique.mockResolvedValue(
		(args.organization === undefined
			? {
					id: "org_1",
					name: "Robotics Society",
					stripeCustomerId: args.stripeCustomerId ?? null,
					billingEnforced: true,
					subscription: args.subscription ?? null,
				}
			: args.organization) as never,
	);
	db.organization.updateMany.mockResolvedValue({
		count: (args.claimed ?? true) ? 1 : 0,
	} as never);
	db.auditEvent.create.mockResolvedValue({ id: "audit_1" } as never);

	const list = vi
		.fn()
		.mockResolvedValue({ data: args.prices ?? [price()], has_more: false });
	const customersCreate = vi.fn().mockResolvedValue({ id: "cus_new" });
	const customersDel = vi
		.fn()
		.mockResolvedValue({ id: "cus_new", deleted: true });
	const sessionsCreate = vi.fn().mockResolvedValue({
		id: "cs_1",
		url:
			args.sessionUrl === undefined
				? "https://checkout.stripe.test/cs_1"
				: args.sessionUrl,
	});

	return {
		db,
		stripe: {
			prices: { list },
			customers: { create: customersCreate, del: customersDel },
			checkout: { sessions: { create: sessionsCreate } },
		},
		appUrl: "https://zemio.test",
		customersCreate,
		customersDel,
		sessionsCreate,
	} as unknown as CheckoutDependencies & {
		db: ReturnType<typeof createMockDb>;
		customersCreate: ReturnType<typeof vi.fn>;
		customersDel: ReturnType<typeof vi.fn>;
		sessionsCreate: ReturnType<typeof vi.fn>;
	};
}

/**
 * A first checkout that creates a customer and then loses the claim to another
 * one running at the same time.
 */
function lostRaceDeps() {
	const d = deps({ stripeCustomerId: null, claimed: false });
	// Three reads in order: the subscription check, the customer lookup that
	// finds none, and the read-back after losing the claim to someone who got
	// there first.
	d.db.organization.findUnique
		.mockResolvedValueOnce({
			billingEnforced: true,
			subscription: null,
		} as never)
		.mockResolvedValueOnce({
			id: "org_1",
			name: "Robotics Society",
			stripeCustomerId: null,
		} as never)
		.mockResolvedValueOnce({
			id: "org_1",
			name: "Robotics Society",
			stripeCustomerId: "cus_winner",
		} as never);
	return d;
}

const actor = { organizationId: "org_1", userId: "user_1" };

beforeEach(async () => {
	vi.clearAllMocks();
	const { clearTierCatalogue } = await import("./billing.catalogue");
	clearTierCatalogue();
});

describe("startCheckout customer creation", () => {
	it("creates a customer carrying the organization it belongs to", async () => {
		const d = deps({ stripeCustomerId: null });

		await startCheckout(d, actor, TIER_PRICE);

		expect(d.customersCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "Robotics Society",
				metadata: { organizationId: "org_1" },
			}),
		);
	});

	it("records the new customer against the organization", async () => {
		const d = deps({ stripeCustomerId: null });

		await startCheckout(d, actor, TIER_PRICE);

		expect(d.db.organization.updateMany).toHaveBeenCalledWith({
			where: { id: "org_1", stripeCustomerId: null },
			data: { stripeCustomerId: "cus_new" },
		});
	});

	it("reuses the customer an organization already pays as", async () => {
		const d = deps({ stripeCustomerId: "cus_existing" });

		await startCheckout(d, actor, TIER_PRICE);

		expect(d.customersCreate).not.toHaveBeenCalled();
		expect(d.sessionsCreate).toHaveBeenCalledWith(
			expect.objectContaining({ customer: "cus_existing" }),
		);
	});

	it("defers to the customer that won a concurrent first checkout", async () => {
		const d = lostRaceDeps();

		await startCheckout(d, actor, TIER_PRICE);

		expect(d.sessionsCreate).toHaveBeenCalledWith(
			expect.objectContaining({ customer: "cus_winner" }),
		);
	});

	it("deletes the customer it created and could not claim", async () => {
		// Kept, it would carry the same organizationId metadata as the customer
		// the organization actually pays as — leaving support's "whose customer
		// is this?" a choice between two, which is the question that metadata is
		// there to answer.
		const d = lostRaceDeps();

		await startCheckout(d, actor, TIER_PRICE);

		expect(d.customersDel).toHaveBeenCalledWith("cus_new");
	});

	it("starts the checkout even when the loser cannot be deleted", async () => {
		// Cleanup is best-effort: an owner mid-purchase must not lose it because
		// Stripe would not take a housekeeping call afterwards.
		const d = lostRaceDeps();
		d.customersDel.mockRejectedValue(new Error("stripe is down"));

		await expect(startCheckout(d, actor, TIER_PRICE)).resolves.toEqual({
			url: "https://checkout.stripe.test/cs_1",
		});
		expect(d.sessionsCreate).toHaveBeenCalledWith(
			expect.objectContaining({ customer: "cus_winner" }),
		);
	});

	it("deletes the customer and reports the failure when recording it failed", async () => {
		// Nothing was stored. Kept, the customer would be joined by a second one
		// on the retry this error invites, both carrying the organization.
		const d = deps({ stripeCustomerId: null });
		d.db.organization.updateMany.mockRejectedValue(new Error("connection reset"));

		await expect(startCheckout(d, actor, TIER_PRICE)).rejects.toThrow(
			"connection reset",
		);
		expect(d.customersDel).toHaveBeenCalledWith("cus_new");
	});

	it("uses the customer when its claim landed although the write reported failure", async () => {
		// A timeout on the reply after the commit: the organization already
		// pays as this customer, and deleting it would be the worse mistake.
		const d = deps({ stripeCustomerId: null });
		d.db.organization.updateMany.mockRejectedValue(new Error("timeout"));
		d.db.organization.findUnique
			.mockResolvedValueOnce({
				billingEnforced: true,
				subscription: null,
			} as never)
			.mockResolvedValueOnce({
				id: "org_1",
				name: "Robotics Society",
				stripeCustomerId: null,
			} as never)
			.mockResolvedValueOnce({
				id: "org_1",
				name: "Robotics Society",
				stripeCustomerId: "cus_new",
			} as never);

		await startCheckout(d, actor, TIER_PRICE);

		expect(d.customersDel).not.toHaveBeenCalled();
		expect(d.sessionsCreate).toHaveBeenCalledWith(
			expect.objectContaining({ customer: "cus_new" }),
		);
	});

	it("keeps the customer when it cannot tell whether the claim landed", async () => {
		const d = deps({ stripeCustomerId: null });
		d.db.organization.updateMany.mockRejectedValue(new Error("connection reset"));
		d.db.organization.findUnique
			.mockResolvedValueOnce({
				billingEnforced: true,
				subscription: null,
			} as never)
			.mockResolvedValueOnce({
				id: "org_1",
				name: "Robotics Society",
				stripeCustomerId: null,
			} as never)
			.mockRejectedValueOnce(new Error("database is down"));

		await expect(startCheckout(d, actor, TIER_PRICE)).rejects.toThrow(
			"connection reset",
		);
		expect(d.customersDel).not.toHaveBeenCalled();
	});

	it("keeps the customer whose claim succeeded", async () => {
		// The claimed customer is the organization's own. Deleting it would take
		// the subscription about to be bought against it with it.
		const d = deps({ stripeCustomerId: null });

		await startCheckout(d, actor, TIER_PRICE);

		expect(d.customersDel).not.toHaveBeenCalled();
	});
});

describe("startCheckout session", () => {
	it("returns the hosted page to send the owner to", async () => {
		const d = deps({});

		await expect(startCheckout(d, actor, TIER_PRICE)).resolves.toEqual({
			url: "https://checkout.stripe.test/cs_1",
		});
	});

	it("carries the organization as the client reference", async () => {
		const d = deps({});

		await startCheckout(d, actor, TIER_PRICE);

		expect(d.sessionsCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				mode: "subscription",
				client_reference_id: "org_1",
				line_items: [{ price: TIER_PRICE, quantity: 1 }],
			}),
		);
	});

	it("returns the owner to the billing page, telling it which way it went", async () => {
		const d = deps({});

		await startCheckout(d, actor, TIER_PRICE);

		const session = d.sessionsCreate.mock.calls[0]?.[0] as {
			success_url: string;
			cancel_url: string;
		};
		expect(session.success_url).toBe(
			"https://zemio.test/settings/org/billing?checkout=complete",
		);
		expect(session.cancel_url).toBe(
			"https://zemio.test/settings/org/billing?checkout=cancelled",
		);
	});

	it("returns to a path shaped like the app's other org settings pages", () => {
		// Stripe is handed this before the page exists, so nothing else would
		// catch it drifting. Org settings are served from /settings/org/<page>
		// — the (groups) folder is a route group and does not appear in the URL
		// — and a page built anywhere else strands an owner on a 404 straight
		// after paying.
		expect(CHECKOUT_RETURN_PATH).toMatch(/^\/settings\/org\/[a-z-]+$/);
	});

	it("fails rather than returning nowhere to send the owner", async () => {
		const d = deps({ sessionUrl: null });

		await expect(startCheckout(d, actor, TIER_PRICE)).rejects.toThrow();
	});
});

describe("startCheckout price validation", () => {
	it("refuses a price that is not a tier on offer", async () => {
		const d = deps({});

		await expectTRPCErrorCode(
			startCheckout(d, actor, "price_not_a_tier"),
			"BAD_REQUEST",
		);
		expect(d.sessionsCreate).not.toHaveBeenCalled();
		expect(d.customersCreate).not.toHaveBeenCalled();
	});

	it("refuses a price whose tier metadata was removed", async () => {
		const d = deps({ prices: [price({ metadata: {} })] });

		await expectTRPCErrorCode(startCheckout(d, actor, TIER_PRICE), "BAD_REQUEST");
	});
});

describe("startCheckout audit", () => {
	it("records the owner who started it, against their organization", async () => {
		const d = deps({});

		await startCheckout(d, actor, TIER_PRICE);

		expect(d.db.auditEvent.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					organizationId: "org_1",
					actorId: "user_1",
					entityType: "organization",
					entityId: "org_1",
					action: "billing.checkout_started",
				}),
			}),
		);
	});

	it("records nothing when the checkout was never created", async () => {
		const d = deps({});
		d.sessionsCreate.mockRejectedValue(new Error("stripe is down"));

		await expect(startCheckout(d, actor, TIER_PRICE)).rejects.toThrow();

		expect(d.db.auditEvent.create).not.toHaveBeenCalled();
	});
});

describe("startCheckout on a vanished organization", () => {
	it("refuses rather than inventing a customer for it", async () => {
		const d = deps({ organization: null });

		await expectTRPCErrorCode(startCheckout(d, actor, TIER_PRICE), "NOT_FOUND");
		expect(d.customersCreate).not.toHaveBeenCalled();
	});
});

describe("startCheckout when the organization already subscribes", () => {
	it.each([
		"active",
		"trialing",
		"past_due",
		"incomplete",
	])("refuses a second subscription while Stripe still considers %s live", async (status) => {
		const d = deps({ subscription: { status, seatLimit: 25 } });

		await expectTRPCErrorCode(
			startCheckout(d, actor, TIER_PRICE),
			"PRECONDITION_FAILED",
		);

		// Nothing may reach Stripe: a session created here is a second
		// subscription billed against the same customer.
		expect(d.sessionsCreate).not.toHaveBeenCalled();
		expect(d.db.auditEvent.create).not.toHaveBeenCalled();
	});

	it.each([
		"canceled",
		"unpaid",
		"incomplete_expired",
	])("lets an organization whose subscription is %s buy again", async (status) => {
		const d = deps({ subscription: { status, seatLimit: 25 } });

		await expect(startCheckout(d, actor, TIER_PRICE)).resolves.toEqual({
			url: "https://checkout.stripe.test/cs_1",
		});
	});
});
