import type React from "react";
import { cn } from "@/lib/utils";

function SettingsTitle({ className, ...props }: React.ComponentProps<"h1">) {
	return (
		<h1
			className={cn("font-semibold text-lg text-zinc-800", className)}
			data-slot={"settings-title"}
			{...props}
		/>
	);
}

function SettingsSubtitle({ className, ...props }: React.ComponentProps<"h1">) {
	return (
		<h1
			className={cn("text-sm text-zinc-600", className)}
			data-slot={"settings-title"}
			{...props}
		/>
	);
}

export { SettingsTitle, SettingsSubtitle };
