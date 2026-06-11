"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"group/button inline-flex shrink-0 cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-md border border-transparent bg-clip-padding font-semibold text-sm outline-none transition-[background-color,color,box-shadow,border-color,opacity] duration-160 ease-out focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default:
					"inset-ring-red-300 inset-shadow-2xs inset-shadow-white/25 border-0 bg-violet-600 text-white ring-1 ring-violet-700 hover:bg-violet-500 hover:ring-violet-600 focus-visible:ring-violet-400 [&_svg:not([class*='text-'])]:text-violet-200",
				outline:
					"border-0 bg-white text-zinc-700 shadow-sm ring-1 ring-zinc-700/15 hover:bg-zinc-50 hover:ring-zinc-700/25 [&_svg:not([class*='text-'])]:text-zinc-500",
				secondary:
					"bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
				ghost:
					"border-0 hover:bg-muted hover:text-foreground hover:ring-1 hover:ring-muted aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50 [&_svg:not([class*='text-'])]:text-zinc-500",
				destructive:
					"border-0 bg-white text-red-600 shadow-sm ring-1 ring-zinc-700/15 hover:bg-red-50 hover:ring-red-700/25 focus-visible:ring-red-200 [&_svg:not([class*='text-'])]:text-red-600",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default:
					"h-7 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
				xs: "h-6 gap-1 in-data-[slot=button-group]:rounded-lg rounded-[min(var(--radius-md),10px)] px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-7 gap-1 in-data-[slot=button-group]:rounded-lg rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
				lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
				icon: "size-7",
				"icon-xs":
					"size-6 in-data-[slot=button-group]:rounded-lg rounded-[min(var(--radius-md),10px)] [&_svg:not([class*='size-'])]:size-3",
				"icon-sm":
					"size-7 in-data-[slot=button-group]:rounded-lg rounded-[min(var(--radius-md),12px)]",
				"icon-lg": "size-9",
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
	...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
	return (
		<ButtonPrimitive
			className={cn(buttonVariants({ variant, size, className }))}
			data-slot="button"
			render={
				<motion.button
					transition={{ duration: 0.1, ease: "easeOut" }}
					whileTap={{ scale: 0.97 }}
				/>
			}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
