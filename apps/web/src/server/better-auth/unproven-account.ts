import type { PrismaClient } from "@zemio/db";

/**
 * Whether an address is held by a user nobody has proved it for, with a
 * sign-in method already attached.
 *
 * That is the shape of a pre-account takeover. Somebody with a Microsoft
 * tenant of their own gives a user any address — tenant-mutable, never proved
 * (ADR-0010) — and signs in, which creates an unverified user on it, linked to
 * their Microsoft account. If the real owner of the address then signed in by
 * magic link, Better Auth would verify *that* user and sign them into it, and
 * the attacker's Microsoft sign-in would open everything they put there
 * afterwards.
 *
 * So a magic link to such an address is refused rather than let through. The
 * person holding the linked account keeps it and confirms the address by mail
 * from inside it, which is the path that proves both at once.
 *
 * Any linked account counts: a magic-link sign-up creates no account row, so
 * an account on an unverified user can only have come from a sign-in that did
 * not prove the address.
 */
export async function isHeldByUnprovenAccount(
	db: PrismaClient,
	email: string,
): Promise<boolean> {
	const user = await db.user.findFirst({
		where: {
			email: email.toLowerCase(),
			emailVerified: false,
			accounts: { some: {} },
		},
		select: { id: true },
	});

	return user !== null;
}
