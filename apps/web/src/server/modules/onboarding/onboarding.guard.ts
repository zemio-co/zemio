import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { ROUTES } from "@/lib/routes";
import { getCurrentSession, type Session } from "@/server/better-auth";
import { db } from "@/server/db";
import type { OnboardingState } from "./onboarding.service";
import { resolveOnboarding } from "./onboarding.service";

/**
 * Who may be where.
 *
 * Layout guards rather than middleware, which is how every other boundary in
 * this application is drawn: `getCurrentSession` is request-cached, so a
 * nested layout that guards itself costs one session read for the whole
 * request tree, and the redirect target is decided with the database in reach
 * instead of at the edge.
 *
 * Three guards, because "has finished onboarding" and "belongs to an
 * organization" are different questions and the pages that ask them are
 * different pages.
 */

/** Signed in, or sent to sign in. */
async function requireSession(): Promise<Session> {
	const session = await getCurrentSession();
	if (!session) redirect(ROUTES.AUTH());

	return session;
}

/**
 * The onboarding state, once per request.
 *
 * Every onboarding page is guarded twice — by its layout and by itself, since
 * each step has a precondition of its own — and without this that is two
 * identical queries for every render. Cached on `userId` rather than on the
 * session object, which `cache` would key by identity and never hit.
 *
 * Deduplicating a call that writes is safe here because the write is the
 * idempotent completion stamp, guarded on the column still being null.
 */
const onboardingStateOf = cache(
	async (userId: string): Promise<OnboardingState | null> =>
		resolveOnboarding(db, userId),
);

/**
 * The application proper: everything under `(app)` and `settings`.
 *
 * Guards onboarding and nothing else. Belonging to an organization is a
 * separate condition, answered here rather than in a second query but acted on
 * by the caller — user settings are reachable without an organization and the
 * dashboard is not, and that distinction is the layouts' to make.
 */
export async function requireOnboarded(): Promise<{
	session: Session;
	hasMembership: boolean;
}> {
	const session = await requireSession();
	const state = await onboardingStateOf(session.user.id);

	// A user row that has gone missing under a live session reads as "not
	// through onboarding", which sends them somewhere that will ask them to
	// sign in again — the right answer to a session with nothing behind it.
	if (state?.step !== "done") redirect(ROUTES.ONBOARDING());

	return { session, hasMembership: state.facts.hasMembership };
}

/**
 * The onboarding flow itself.
 *
 * Somebody through it is sent to the application: the flow is walked once, and
 * a completed person landing back on it would be asked to confirm an address
 * and re-type a name they already have.
 */
export async function requireOnboarding(): Promise<{
	session: Session;
	state: OnboardingState;
}> {
	const session = await requireSession();
	const state = await onboardingStateOf(session.user.id);

	if (!state || state.step === "done") redirect(ROUTES.USER_DASHBOARD());

	return { session, state };
}

/**
 * `/onboarding/no-org` — finished onboarding, belongs to nothing right now.
 *
 * It lives under `/onboarding` because it shows the same two things the
 * organization step does, and is guarded separately because it shows them to
 * the opposite population. That is why the completion check and the shell live
 * in different layouts: merging them would make this page unreachable by
 * everyone it exists for.
 */
export async function requireOnboardedAndOrgless(): Promise<Session> {
	const { session, hasMembership } = await requireOnboarded();

	if (hasMembership) redirect(ROUTES.USER_DASHBOARD());

	return session;
}

/** The onboarding shell, which both branches share: signed in and nothing more. */
export async function requireOnboardingSession(): Promise<Session> {
	return requireSession();
}
