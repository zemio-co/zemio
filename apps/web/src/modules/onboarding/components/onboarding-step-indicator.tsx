"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * How far through the flow this person is.
 *
 * Positioned from the path rather than from the resolved step, because the two
 * disagree by design at the end: `nextOnboardingStep` reports `invite` for the
 * whole founder tail — nothing in the facts separates "has not invited
 * anybody" from "chose not to" — so a resolver-driven indicator would sit on
 * step four while somebody reads step five. The page somebody is looking at is
 * the honest answer to where they are.
 *
 * The total is the whole flow rather than the steps this particular person
 * will walk. Somebody arriving from Microsoft is already verified and already
 * named, and somebody accepting an invitation never sees the last two — so for
 * them the count describes onboarding rather than counting down their own
 * remaining clicks. The trade is deliberate: a fixed total means the indicator
 * never changes length underneath somebody mid-flow.
 */
const STEP_PATHS = [
	ROUTES.ONBOARDING_VERIFY_EMAIL(),
	ROUTES.ONBOARDING_NAME(),
	ROUTES.ONBOARDING_ORGANIZATION(),
	ROUTES.ONBOARDING_INVITE(),
	ROUTES.ONBOARDING_TRIAL(),
] as const;

function OnboardingStepIndicator({
	className,
	...props
}: React.ComponentProps<"div">) {
	const t = useTranslations("modules.onboarding.progress");
	const pathname = usePathname();

	// `startsWith` so that `/onboarding/organization/new` counts as the
	// organization step, which is what it is — the same question, answered by
	// creating instead of joining.
	const index = STEP_PATHS.findIndex(
		(path) => pathname === path || pathname.startsWith(`${path}/`),
	);

	// `/onboarding` itself only ever redirects, but it renders inside this
	// layout for the instant before it does, and a bar with nothing lit is a
	// better answer there than a bar claiming step one.
	const current = index + 1;
	const total = STEP_PATHS.length;

	return (
		<div
			className={cn("flex flex-col items-center gap-2", className)}
			data-slot="onboarding-step-indicator"
			{...props}
		>
			<ol className="flex items-center gap-2">
				{STEP_PATHS.map((path, position) => {
					const isDone = position + 1 < current;
					const isCurrent = position + 1 === current;

					return (
						<li
							aria-current={isCurrent ? "step" : undefined}
							className={cn(
								"size-1.5 rounded-full transition-colors",
								isDone && "bg-accent-600",
								isCurrent && "bg-accent-400",
								!(isDone || isCurrent) && "bg-base-200",
							)}
							key={path}
						/>
					);
				})}
			</ol>
			{current > 0 && (
				<span className="text-base-500 text-xs">
					{t("stepOf", { current, total })}
				</span>
			)}
		</div>
	);
}

export { OnboardingStepIndicator };
