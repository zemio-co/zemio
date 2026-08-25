import "server-only";
import type { PrismaClient } from "@zemio/db";
import { logger } from "@/lib/logger";
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
 * Read on every request that passes a guard, so it stays a single row with a
 * counted relation rather than a membership list nobody looks at.
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
			_count: { select: { members: true } },
		},
	});

	if (!user) return null;

	return {
		emailVerified: user.emailVerified,
		name: user.name,
		hasMembership: user._count.members > 0,
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
