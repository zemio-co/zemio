"use client";

import { Skeleton } from "@zemio/ui";
import { cn } from "@/lib/utils";
import { authClient } from "@/server/better-auth/client";
import { OnboardingSignOut } from "./onboarding-sign-out";

function OnboardingTopBar({
	className,
	...props
}: React.ComponentProps<"div">) {
	const { data, isPending } = authClient.useSession();

	return (
		<div
			className={cn(
				"flex w-full flex-wrap items-center justify-between px-8",
				className,
			)}
			data-slot="onboarding-top-bar"
			{...props}
		>
			{isPending ? (
				<Skeleton className="h-4 w-32" />
			) : data ? (
				<span className="text-base-500 text-xs">
					Signed in as{" "}
					<span className="font-medium text-base-700">{data.user.email}</span>
				</span>
			) : (
				<span className="text-base-500 text-xs">An unknown error ocurred</span>
			)}
			<OnboardingSignOut />
		</div>
	);
}

export { OnboardingTopBar };
