import "server-only";
import { cache } from "react";
import { getCurrentSession } from "@/server/better-auth";
import { db } from "@/server/db";

/**
 * The caller's role in the organization they are currently in, or null when
 * they are in none — and null, too, for a selected organization they do not
 * belong to, which is the same answer from the outside.
 *
 * Read on the server so that layouts can decide what a role may see before the
 * first paint. The browser can answer the same question through
 * `authClient.useActiveMemberRole`, but only after a round trip: the store
 * that backs it never fetches during SSR and hands React the same snapshot for
 * the server render and the hydrating one, so a tree that branches on it
 * renders one way in the HTML and another way on arrival. Nothing rendered
 * during SSR may ask the browser.
 *
 * Request-cached and argument-free for the same reason as
 * {@link getCurrentSession}, which it calls: `cache` keys on arguments, and a
 * session passed in would be a fresh object per call and never hit.
 */
export const activeMemberRole = cache(async (): Promise<string | null> => {
	const session = await getCurrentSession();
	const organizationId = session?.session.activeOrganizationId;

	if (!session || !organizationId) return null;

	const member = await db.member.findFirst({
		where: { userId: session.user.id, organizationId },
		select: { role: true },
	});

	return member?.role ?? null;
});
