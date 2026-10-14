import {
	asTRPCContext,
	createMockOrgContext,
	expectTRPCErrorCode,
} from "@zemio/test-utils";
import { describe, expect, it, vi } from "vitest";

// The router reaches its configuration through the module-level `billingConfig`,
// which is resolved from the environment at import. Switching billing on for a
// test therefore means replacing that module, which is why the enabled path
// lives in its own file rather than alongside the disabled one.
vi.mock("@/server/modules/billing/billing.config", async (importOriginal) => ({
	...(await importOriginal<object>()),
	billingConfig: {
		enabled: true,
		secretKey: "sk_test_1",
		webhookSecret: "whsec_1",
	},
}));

const { billingRouter } = await import("@/server/api/routers/billing");
const { createCallerFactory } = await import("@/server/api/trpc");

const createCaller = createCallerFactory(billingRouter);

function caller(ctx: ReturnType<typeof createMockOrgContext>) {
	return createCaller(asTRPCContext(ctx));
}

const PERIOD_END = new Date("2027-01-15T00:00:00.000Z");

function orgContext(args: {
	billingEnforced?: boolean;
	subscription?: { tier: string; seatLimit: number; status: string } | null;
	seats?: number;
}) {
	const ctx = createMockOrgContext({ organizationId: "org_1" });
	ctx.db.organization.findUnique.mockResolvedValue({
		billingEnforced: args.billingEnforced ?? true,
		subscription: args.subscription
			? {
					currentPeriodEnd: PERIOD_END,
					cancelAtPeriodEnd: false,
					...args.subscription,
				}
			: null,
	} as never);
	ctx.db.member.count.mockResolvedValue((args.seats ?? 0) as never);
	return ctx;
}

describe("billing.status with billing enabled", () => {
	it("reports the caller's own organization", async () => {
		const ctx = orgContext({
			subscription: { tier: "M", seatLimit: 25, status: "active" },
			seats: 4,
		});

		await caller(ctx).status();

		expect(ctx.db.organization.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: "org_1" } }),
		);
		expect(ctx.db.member.count).toHaveBeenCalledWith({
			where: { organizationId: "org_1" },
		});
	});

	it("returns the tier, seats and entitlement state", async () => {
		const ctx = orgContext({
			subscription: { tier: "M", seatLimit: 25, status: "active" },
			seats: 4,
		});

		await expect(caller(ctx).status()).resolves.toEqual({
			enabled: true,
			entitled: true,
			enforced: true,
			state: "entitled",
			tier: "M",
			seatLimit: 25,
			seatCount: 4,
			overSeatLimit: false,
			trialing: false,
			currentPeriodEnd: PERIOD_END,
			cancelAtPeriodEnd: false,
		});
	});

	it("reports a lapsed organization as read-only to a plain member", async () => {
		const ctx = orgContext({
			subscription: { tier: "S", seatLimit: 10, status: "canceled" },
			seats: 2,
		});

		await expect(caller(ctx).status()).resolves.toMatchObject({
			entitled: false,
			state: "read_only",
		});
	});

	it("exposes no Stripe credentials", async () => {
		const ctx = orgContext({
			subscription: { tier: "M", seatLimit: 25, status: "active" },
		});

		const status = JSON.stringify(await caller(ctx).status());

		expect(status).not.toContain("sk_test_1");
		expect(status).not.toContain("whsec_1");
	});

	it("still requires an active organization", async () => {
		const ctx = createMockOrgContext();
		ctx.db.member.findFirst.mockResolvedValue(null as never);

		await expectTRPCErrorCode(caller(ctx).status(), "FORBIDDEN");
	});
});
