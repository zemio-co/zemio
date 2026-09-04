import "server-only";
import type { PrismaClient } from "@zemio/db";
import { logger } from "@/lib/logger";
import { isOrganizationOwnerRole } from "@/lib/organization";
import {
	nextOnboardingStep,
	type OnboardingFacts,
	type OnboardingStep,
	shouldStampCompletion,
} from "./onboarding.policy";

/**
 * Reading where somebody is in onboarding, and recording when they finish.
 */

export type OnboardingState = {
	step: OnboardingStep;
	facts: OnboardingFacts;
};

/**
 * Everything the decision needs, in one query.
 *
 * Read on every request that passes a guard, so it stays a single row. The
 * memberships come back as a list of roles rather than a count because two
 * facts are read from them now — whether there is any membership, and whether
 * one of them is an ownership — and Prisma cannot alias a second filtered
 * count over the same relation. A person belongs to a handful of
 * organizations at most, so the list is the cheaper of the two shapes that
 * would work.
 */
async function readFacts(
	db: PrismaClient,
	userId: string,
): Promise<OnboardingFacts | null> {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: {
			name: true,
			emailVerified: true,
			onboardingCompletedAt: true,
			members: { select: { role: true } },
		},
	});

	if (!user) return null;

	return {
		emailVerified: user.emailVerified,
		name: user.name,
		hasMembership: user.members.length > 0,
		isOwner: user.members.some((member) => isOrganizationOwnerRole(member.role)),
		completedAt: user.onboardingCompletedAt,
	};
}

/**
 * Where this person stands, stamping their completion if it has just become
 * true.
 *
 * The stamp lives here rather than at each of the four places membership can
 * be gained — creating an organization, accepting an invitation, a joining
 * rule matched during session creation, a platform administrator adding
 * somebody. Two of those pass through no hook this code owns, so spreading
 * the write across them would mean four places to keep in step and one of them
 * quietly missed. Asking the question is the one moment all four have in
 * common.
 *
 * Guarded on the column still being null, so concurrent requests cannot
 * overwrite an earlier completion with a later timestamp.
 */
export async function resolveOnboarding(
	db: PrismaClient,
	userId: string,
): Promise<OnboardingState | null> {
	const facts = await readFacts(db, userId);
	if (!facts) return null;

	if (!shouldStampCompletion(facts)) {
		return { step: nextOnboardingStep(facts), facts };
	}

	const completedAt = new Date();

	// Best-effort. The person is through onboarding whether or not this row is
	// written, and refusing to let them in because a write failed would be a
	// worse answer than recognising it again on their next request.
	try {
		await db.user.updateMany({
			where: { id: userId, onboardingCompletedAt: null },
			data: { onboardingCompletedAt: completedAt },
		});

		logger.info("onboarding.completed", { userId });
	} catch (error) {
		logger.error("onboarding.completion_not_recorded", { userId, error });
	}

	return { step: "done", facts: { ...facts, completedAt } };
}

/**
 * Records that a founder has walked the tail, which is what ends their flow.
 *
 * The step resolver holds an organization's creator in `invite`/`trial` while
 * `onboardingCompletedAt` is null, so for that population the stamp cannot be
 * recognised from the facts the way it is for everybody else — the last step
 * is a page being read, and nothing else in the row changes when it has been.
 * This is the report that {@link resolveOnboarding} has no way to infer.
 *
 * Guarded on the column still being null, so a double-submitted Continue
 * cannot overwrite the first completion with a later timestamp.
 */
export async function completeOnboarding(
	db: PrismaClient,
	userId: string,
): Promise<void> {
	await db.user.updateMany({
		where: { id: userId, onboardingCompletedAt: null },
		data: { onboardingCompletedAt: new Date() },
	});

	logger.info("onboarding.completed", { userId });
}
