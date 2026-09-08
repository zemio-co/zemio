import { createMockDb, type MockPrismaClient } from "./prisma-mock";

/**
 * Minimal shape of the fields the tRPC procedure chain
 * (apps/web/src/server/api/trpc.ts) actually reads off the session. Not a
 * full better-auth `Session` — callers cast to the real context type at the
 * `createCaller(...)` call site.
 */
export interface MockSessionUser {
	id: string;
	/** Better Auth always has one; the DATEV export writes it into the file. */
	name: string;
	role?: string | null;
}

export interface MockSession {
	user: MockSessionUser;
	session: {
		activeOrganizationId: string | null;
	};
}

export interface MockTRPCContext {
	db: MockPrismaClient;
	session: MockSession | null;
	headers: Headers;
}

export function createMockContext(overrides?: {
	db?: MockPrismaClient;
	session?: MockSession | null;
	headers?: Headers;
}): MockTRPCContext {
	return {
		db: overrides?.db ?? createMockDb(),
		session: overrides?.session ?? null,
		headers: overrides?.headers ?? new Headers(),
	};
}

/** Context for `protectedProcedure` — a logged-in user with no org resolved. */
export function createMockProtectedContext(overrides?: {
	db?: MockPrismaClient;
	user?: Partial<MockSessionUser>;
	activeOrganizationId?: string | null;
	headers?: Headers;
}): MockTRPCContext {
	return {
		db: overrides?.db ?? createMockDb(),
		session: {
			user: { id: "user_1", name: "Test User", role: "user", ...overrides?.user },
			session: { activeOrganizationId: overrides?.activeOrganizationId ?? null },
		},
		headers: overrides?.headers ?? new Headers(),
	};
}

/**
 * Context for `orgProcedure`. Since the middleware resolves `activeMember`
 * itself via `db.member.findFirst(...)`, this configures that mock call
 * rather than injecting `activeMember`/`orgRole` directly onto the context —
 * those fields don't exist on the base context type, only on the ctx the
 * middleware produces for downstream procedures.
 *
 * The `member.findFirst` stub lives on the `db` returned in this context's
 * `db` field. If a test replaces `ctx.db` with a different mock after calling
 * this (e.g. to add more stubs), it must re-stub `member.findFirst` itself —
 * otherwise `orgProcedure` resolves no membership and every request fails
 * with `FORBIDDEN` for reasons unrelated to what the test is actually
 * exercising. Prefer passing further stubs via the `db` override param
 * instead of mutating `ctx.db` afterward.
 */
export function createMockOrgContext(overrides?: {
	db?: MockPrismaClient;
	user?: Partial<MockSessionUser>;
	organizationId?: string;
	member?: { id?: string; role?: string };
	headers?: Headers;
}): MockTRPCContext {
	const db = overrides?.db ?? createMockDb();
	const organizationId = overrides?.organizationId ?? "org_1";
	const memberRole = overrides?.member?.role ?? "member";

	db.member.findFirst.mockResolvedValue({
		id: overrides?.member?.id ?? "member_1",
		role: memberRole,
		organizationId,
	} as never);

	return createMockProtectedContext({
		db,
		user: overrides?.user,
		activeOrganizationId: organizationId,
		headers: overrides?.headers,
	});
}

/** Context for `orgAdminProcedure` — an org member with an admin/owner role. */
export function createMockOrgAdminContext(
	overrides?: Parameters<typeof createMockOrgContext>[0],
): MockTRPCContext {
	return createMockOrgContext({
		...overrides,
		member: { role: "admin", ...overrides?.member },
	});
}

/** Context for `platformAdminProcedure` — `session.user.role === "admin"`, no org involved. */
export function createMockPlatformAdminContext(
	overrides?: Parameters<typeof createMockProtectedContext>[0],
): MockTRPCContext {
	return createMockProtectedContext({
		...overrides,
		user: { role: "admin", ...overrides?.user },
	});
}
