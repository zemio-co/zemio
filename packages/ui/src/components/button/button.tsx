"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "motion/react";
import { cn } from "../../lib/cn";

const buttonVariants = cva(
	[
		"inline-flex shrink-0 items-center justify-center",
		"font-medium text-sm leading-none",
		"cursor-pointer transition-colors",
		"select-none disabled:pointer-events-none disabled:opacity-60 data-disabled:opacity-60",
		"outline-transparent focus-visible:outline-2 focus-visible:outline-accent-500 focus-visible:outline-offset-2",
		"[&_svg]:shrink-0",
	],
	{
		variants: {
			variant: {
				default: [
					"bg-accent-600 text-accent-50 [&_svg:not([class*='text-'])]:text-accent-200",
					"border border-accent-600",
					"text-indigo-50 text-shadow-2xs text-shadow-indigo-800/50",
					"inset-shadow-[0_-1px_0_0_var(--color-accent-700)]",
					"hover:bg-accent-700",
				],
				outline: [
					"ring-1 ring-base-700/10 shadow-sm bg-background",
					"text-base-700 [&_svg:not([class*='text-'])]:text-slate-500",
					"hover:bg-slate-50",
				],
				ghost: [
					"text-base-700 [&_svg:not([class*='text-'])]:text-slate-500",
					"hover:bg-slate-100",
				],
				destructive: [
					"border border-base-200",
					"text-base-700 [&_svg:not([class*='text-'])]:text-red-500",
					"hover:border-red-200 hover:bg-red-50 hover:text-red-600",
					"focus-visible:outline-red-500",
				],
			},
			size: {
				xs: "h-6 gap-2 rounded-md px-1.5 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 [&_svg:not([class*='size-'])]:size-3",
				default:
					"h-8 gap-2 rounded-md px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
				sm: "h-7 gap-2 rounded-md px-2 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
				lg: "h-9 gap-2 rounded-md px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-4",
				"icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
				icon: "size-8 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
				"icon-sm": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
				"icon-lg": "size-9 rounded-md [&_svg:not([class*='size-'])]:size-4",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Button({
	className,
	variant = "default",
	size = "default",
	disableAnimation,
	...props
}: ButtonPrimitive.Props &
	VariantProps<typeof buttonVariants> & {
		disableAnimation?: boolean;
	}) {
	return (
		<ButtonPrimitive
			className={cn(buttonVariants({ variant, size, className }))}
			data-slot="button"
			render={
				<motion.button
					transition={{ duration: 0.1, ease: "easeOut" }}
					whileTap={{
						...(disableAnimation
							? { scale: 1 }
							: {
									scale: 0.97,
								}),
					}}
				/>
			}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
