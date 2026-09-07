import { cn } from "@/lib/utils";
import { LegalFooter } from "@/modules/legal";
import { OnboardingTopBar } from "./onboarding-top-bar";

async function OnboardingLayout({
	className,
	children,
	email,
	...props
}: React.ComponentProps<"main"> & {
	/** The address this person is signed in with, named by the top bar. */
	email: string;
}) {
	return (
		<main
			className={cn(
				"relative flex min-h-svh items-center justify-center overflow-hidden bg-base-50 py-32",
				className,
			)}
			data-slot="onboarding-layout"
			{...props}
		>
			<OnboardingTopBar className="absolute top-8 left-0" email={email} />
			{children}
			<LegalFooter className="absolute bottom-8 left-1/2 -translate-x-1/2" />
		</main>
	);
}

export { OnboardingLayout };
