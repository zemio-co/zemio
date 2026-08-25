import type { ReactNode } from "react";
import { OnboardingLayout } from "@/modules/onboarding";
import { requireOnboardingSession } from "@/server/modules/onboarding";

/**
 * The shell both branches under `/onboarding` share, and nothing else.
 *
 * The completion guard is deliberately one level down, in `(flow)`: this
 * layout also wraps `/onboarding/no-org`, which exists *for* people who have
 * completed onboarding. Moving the guard up here — the obvious tidy-up —
 * would redirect away every visitor that page was built for.
 */
export default async function ServerLayout({
	children,
}: {
	children: ReactNode;
}) {
	await requireOnboardingSession();

	return <OnboardingLayout>{children}</OnboardingLayout>;
}
