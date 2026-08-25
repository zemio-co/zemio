import type { ReactNode } from "react";
import { OnboardingSignOut } from "@/modules/onboarding";
import { requireOnboarding } from "@/server/modules/onboarding";

/**
 * The flow's own guard: unfinished onboarding only.
 *
 * A route group, so `/onboarding` and its steps keep their URLs while
 * `/onboarding/no-org` — a sibling directory, outside this group — stays
 * outside the guard.
 */
export default async function OnboardingFlowLayout({
	children,
}: {
	children: ReactNode;
}) {
	await requireOnboarding();

	return (
		<>
			{children}
			<OnboardingSignOut className="mt-8 w-full" />
		</>
	);
}
