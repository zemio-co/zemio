import { cn } from "@/lib/utils";

function OnboardingTitle({ className, ...props }: React.ComponentProps<"h1">) {
	return (
		<h1
			className={cn("font-semibold text-base-800 text-lg", className)}
			data-slot="onboarding-title"
			{...props}
		/>
	);
}

function OnboardingDesc({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"text-base-500 text-sm **:data-highlight:font-medium **:data-highlight:text-base-700",
				className,
			)}
			data-slot="component"
			{...props}
		/>
	);
}

export { OnboardingDesc, OnboardingTitle };
