import Image from "next/image";
import ZemioLogo from "public/assets/zemio-logo-dark.svg";
import { cn } from "@/lib/utils";

/**
 * The frame every onboarding page sits in.
 *
 * Rendered by `app/onboarding/layout.tsx`, which is deliberately the layout
 * *without* the completion guard: `/onboarding/no-org` shares this frame with
 * the flow and is shown to the opposite population, so the two cannot share a
 * guard.
 */
function OnboardingLayout({
	className,
	children,
	...props
}: React.ComponentProps<"main">) {
	return (
		<main
			className={cn("bg-stone-50", className)}
			data-slot="onboarding-layout"
			{...props}
		>
			<div className="mx-auto w-full max-w-5xl md:px-8">
				<div className="flex min-h-svh flex-col gap-8 border-zinc-200 border-x px-6 py-12 md:px-12">
					<div className="flex shrink-0 flex-wrap items-center justify-between gap-4">
						<Image alt="Zemio Logo" className="h-5 w-fit" src={ZemioLogo} />
					</div>
					<div className="flex grow flex-col items-center justify-center">
						<div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg ring-1 ring-zinc-700/10 ring-offset-0">
							{children}
						</div>
					</div>
				</div>
			</div>
		</main>
	);
}

export { OnboardingLayout };
