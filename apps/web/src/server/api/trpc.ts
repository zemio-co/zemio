/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { logger } from "@/lib/logger";

import {
	isOrganizationAdminRole,
	isOrganizationOwnerRole,
} from "@/lib/organization";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { assertEntitled } from "@/server/modules/billing/billing.gate";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
	const session = await auth.api.getSession({
		headers: opts.headers,
	});

	return {
		db,
		session,
		...opts,
	};
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
	transformer: superjson,
	errorFormatter({ shape, error }) {
		return {
			...shape,
			data: {
				...shape.data,
				zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
			},
		};
	},
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Simulates network latency in development so unwanted client waterfalls show
 * up locally instead of only in production. No-op outside dev; set
 * DISABLE_DEV_DELAY=true to switch it off.
 *
 * Request duration is measured by {@link loggingMiddleware}, not here.
 */
const devDelayMiddleware = t.middleware(async ({ next }) => {
	const shouldAddDelay =
		t._config.isDev && process.env.DISABLE_DEV_DELAY !== "true";
	if (shouldAddDelay) {
		const waitMs = Math.floor(Math.random() * 400) + 100;
		await new Promise((resolve) => setTimeout(resolve, waitMs));
	}

	return next();
});

const loggingMiddleware = t.middleware(async ({ next, path, type, ctx }) => {
	const start = Date.now();
	const result = await next();
	const durationMs = Date.now() - start;

	const base = {
		path,
		type,
		durationMs,
		userId: ctx.session?.user?.id,
		organizationId: ctx.session?.session.activeOrganizationId,
	};

	if (result.ok) {
		logger.info("trpc.request", { ...base, ok: true });
	} else {
		const { code, message } = result.error;
		if (code === "INTERNAL_SERVER_ERROR") {
			// `errorMessage`, not `message`: on the stdout fallback path the
			// fields are spread into the log entry, so a field called `message`
			// would overwrite the entry's own — and `message` is the key the log
			// drain reads as the log line (docs/deployment.md, "Log drain").
			logger.error("trpc.request", {
				...base,
				ok: false,
				code,
				errorMessage: message,
			});
		} else {
			logger.info("trpc.request", { ...base, ok: false, code });
		}
	}

	return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure
	.use(devDelayMiddleware)
	.use(loggingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
	if (!ctx.session?.user) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}
	return next({
		ctx: {
			// infers the `session` as non-nullable
			session: { ...ctx.session, user: ctx.session.user },
		},
	});
});

/**
 * Resolves the caller's membership in the active organization.
 *
 * The lookup lives here rather than in the context so that requests which never
 * touch an org — legal, user, banking, preferences — do not pay for a
 * member.findFirst they will not read.
 */
const memberResolvedProcedure = protectedProcedure.use(
	async ({ ctx, next }) => {
		const organizationId = ctx.session.session.activeOrganizationId;
		const activeMember = organizationId
			? await ctx.db.member.findFirst({
					where: { userId: ctx.session.user.id, organizationId },
					select: { id: true, role: true, organizationId: true },
				})
			: null;

		// No selected org and a selected org the caller does not belong to are the
		// same failure from the client's side, and deliberately indistinguishable.
		if (!activeMember) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "No active organization selected.",
			});
		}

		return next({
			ctx: {
				...ctx,
				activeMember,
				organizationId: activeMember.organizationId,
				orgRole: activeMember.role,
			},
		});
	},
);

/**
 * The org-scoped procedure everything organizational is built on, membership
 * resolved and billing entitlement enforced.
 *
 * The gate sits here rather than at each call site so the set of billing-gated
 * operations is one list, in the billing module, instead of five decisions
 * scattered across two routers. It returns immediately for any path not on
 * that list — which is every path but those five (ADR-0006).
 */
export const orgProcedure = memberResolvedProcedure.use(
	async ({ ctx, path, next }) => {
		await assertEntitled(ctx, path);
		return next();
	},
);

export const orgAdminProcedure = orgProcedure.use(({ ctx, next }) => {
	if (!isOrganizationAdminRole(ctx.orgRole)) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}

	return next({ ctx });
});

/**
 * Owner-only procedure.
 *
 * Narrower than {@link orgAdminProcedure}, and deliberately not built on it:
 * committing an organization to a recurring financial obligation is an
 * owner-level act, not an operational one, so an administrator who may
 * approve every report in the organization still may not commit it to
 * paying for Zemio.
 */
export const orgOwnerProcedure = orgProcedure.use(({ ctx, next }) => {
	if (!isOrganizationOwnerRole(ctx.orgRole)) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}

	return next({ ctx });
});

/**
 * Platform admin procedure — restricted to users with user.role === "admin"
 * (the better-auth admin plugin role). These users manage the platform itself,
 * including creating organizations and assigning tenant IDs.
 */
export const platformAdminProcedure = protectedProcedure.use(
	({ ctx, next }) => {
		if (ctx.session.user.role !== "admin") {
			throw new TRPCError({ code: "FORBIDDEN" });
		}
		return next({ ctx });
	},
);
