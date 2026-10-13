import { cn } from "@/lib/utils";

function OnboardingBox({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("w-full max-w-md space-y-8", className)}
			data-slot="onboarding-box"
			{...props}
		/>
	);
}

function OnboardingBoxHeader({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("space-y-1.5", className)}
			data-slot="onboarding-box-header"
			{...props}
		/>
	);
}

export { OnboardingBox, OnboardingBoxHeader };
