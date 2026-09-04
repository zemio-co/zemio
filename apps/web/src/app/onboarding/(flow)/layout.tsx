import type { ReactNode } from "react";
import { OnboardingStepIndicator } from "@/modules/onboarding";
import { requireOnboarding } from "@/server/modules/onboarding";

/**
 * The flow's own guard: unfinished onboarding only.
 *
 * A route group, so `/onboarding` and its steps keep their URLs while
 * `/onboarding/no-org` — a sibling directory, outside this group — stays
 * outside the guard.
 *
 * The progress indicator lives here rather than in the shell above, for the
 * same reason the guard does: `/onboarding/no-org` is not a step, and telling
 * somebody who finished onboarding last year that they are on step three of
 * five would be a report on a flow they are not in.
 */
export default async function OnboardingFlowLayout({
	children,
}: {
	children: ReactNode;
}) {
	await requireOnboarding();

	return (
		<>
			<OnboardingStepIndicator className="absolute top-16 left-1/2 -translate-x-1/2" />
			{children}
		</>
	);
}
