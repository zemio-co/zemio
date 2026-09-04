/**
 * Where somebody is in onboarding, and whether they are through it.
 *
 * Pure functions, like the joining rules they hand over to: this decides who
 * may enter the application at all, and it needs to be testable without a
 * database, a session, or an identity provider.
 */

/** The steps, in the order they are walked. */
export const ONBOARDING_STEPS = [
	"verify-email",
	"name",
	"organization",
	"invite",
	"trial",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number] | "done";

/** What onboarding reads about a person. Nothing here is asked of them twice. */
export type OnboardingFacts = {
	/** Verified by Zemio, or by a tenant Zemio can name (ADR-0008, ADR-0010). */
	emailVerified: boolean;
	/** The display name on the user record. Empty until somebody supplies one. */
	name: string;
	/** Whether they belong to any organization at all. */
	hasMembership: boolean;
	/**
	 * Whether they own one, which here means they created it.
	 *
	 * The two tail steps are addressed to the person who made an organization,
	 * not to everybody who ends up in one: somebody who accepted an invitation
	 * is joining a team that already has colleagues and a subscription, so
	 * asking them to invite people and start a trial would be asking about
	 * decisions that are not theirs.
	 */
	isOwner: boolean;
	/** When they finished onboarding, if they have. */
	completedAt: Date | null;
};

/**
 * The step this person still has to take.
 *
 * `completedAt` outranks everything, and that is the whole reason it is
 * stored. Someone who has been removed from their last organization looks
 * exactly like someone who never joined one, and sending them back to the
 * start of a flow they finished last year — to re-confirm an address and
 * re-type a name they already have — would be the wrong answer to a state
 * they did not cause.
 *
 * The name is read from the user record rather than from a marker of its own.
 * The consequence is deliberate: an address that arrived with a name (every
 * Microsoft sign-in does) is never *forced* onto the name step, it is only
 * walked through it by the flow, prefilled. An address that arrived without
 * one (every magic-link sign-up) cannot get past it. Which is the guarantee
 * worth having — nobody reaches the application nameless — at the cost of one
 * that is not: that everybody sees the page exactly once.
 */
export function nextOnboardingStep(facts: OnboardingFacts): OnboardingStep {
	if (facts.completedAt !== null) return "done";

	if (!facts.emailVerified) return "verify-email";
	if (facts.name.trim() === "") return "name";
	if (!facts.hasMembership) return "organization";

	// Past here the flow has everything it needs to let somebody in, and what
	// remains is addressed to founders only. A member who joined an existing
	// organization is finished at the line above, which is what keeps the
	// completion stamp for that population exactly where it has always been.
	if (!facts.isOwner) return "done";

	// The tail is entered at `invite` and left by walking it. `trial` is
	// deliberately not returned here: it is reached from the invite step rather
	// than resolved into, because nothing in the facts distinguishes "has not
	// invited anybody yet" from "chose not to" — the step is skippable, so no
	// fact could. The consequence is that re-entering `/onboarding` mid-tail
	// lands on `invite` again, which costs a founder one extra click and buys
	// not having to store a cursor for a two-page tail.
	return "invite";
}

/**
 * Whether onboarding is finished, including the case where it has just become
 * finished and nothing has recorded that yet.
 *
 * Membership can be gained by four routes — creating an organization,
 * accepting an invitation, a joining rule matched during session creation, a
 * platform administrator adding somebody — and only two of them pass through
 * a hook this code owns. So completion is *recognised* rather than reported,
 * and {@link shouldStampCompletion} is what turns the recognition into a row.
 */
export function isOnboardingComplete(facts: OnboardingFacts): boolean {
	return nextOnboardingStep(facts) === "done";
}

/** Whether this person's completion is now true but unrecorded. */
export function shouldStampCompletion(facts: OnboardingFacts): boolean {
	return facts.completedAt === null && isOnboardingComplete(facts);
}
