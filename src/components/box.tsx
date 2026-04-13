import Link from "next/link";
import type React from "react";
import { cn } from "@/lib/utils";

function Box({
	className,
	size = "default",
	...props
}: React.ComponentProps<"ul"> & {
	size?: "default";
}) {
	return (
		<ul
			className={cn(
				"group/box rounded-lg bg-white shadow-sm ring-1 ring-zinc-700/15",
				className,
			)}
			data-size={size}
			data-slot={"box"}
			{...props}
		/>
	);
}

function BoxItem({
	className,
	variant = "default",
	children,
	...props
}: React.ComponentProps<"li"> & {
	variant?: "default" | "clickable" | "grid";
}) {
	return (
		<li
			className={cn(
				"group/item relative isolate flex items-center justify-start gap-4 px-5 py-4",
				"before:absolute before:top-1 before:left-1 before:-z-30 before:hidden before:h-[calc(100%-0.5rem)] before:w-[calc(100%-0.5rem)] before:rounded-md before:bg-zinc-100 before:opacity-0 before:transition-opacity hover:before:opacity-100 data-[variant=clickable]:before:block before:['']",
				"after:absolute after:bottom-0 after:left-5 after:block after:h-px after:w-[calc(100%-2.5rem)] after:bg-border last:after:hidden after:['']",
				"data-[variant='grid']:grid data-[variant='grid']:grid-cols-1 data-[variant='grid']:gap-6 sm:data-[variant='grid']:grid-cols-2",
				className,
			)}
			data-slot={"box-item"}
			data-variant={variant}
			{...props}
		>
			{children}
		</li>
	);
}

function BoxItemContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("space-y-0.5", className)}
			data-slot={"box-item-content"}
			{...props}
		/>
	);
}

function BoxItemTitle({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			className={cn("font-medium text-sm text-zinc-800", className)}
			data-slot={"box-item-title"}
			{...props}
		/>
	);
}

function BoxItemDescription({
	className,
	...props
}: React.ComponentProps<"p">) {
	return (
		<p
			className={cn("text-xs text-zinc-500", className)}
			data-slot={"box-item-desc"}
			{...props}
		/>
	);
}

function BoxItemLink({
	className,
	children,
	...props
}: React.ComponentProps<typeof Link>) {
	return (
		<Link
			className={cn(
				"ml-auto flex items-center justify-center gap-1.5 font-medium text-sm",
				className,
			)}
			data-slot={"box-item-link"}
			{...props}
		>
			<span className="absolute inset-0 top-0 left-0 hidden h-full w-full group-data-[variant='clickable']/item:block" />
			{children}
		</Link>
	);
}

function BoxItemIcon({
	className,
	size = "default",
	...props
}: React.ComponentProps<"div"> & {
	size?: "sm" | "default";
}) {
	return (
		<div
			className={cn(
				"flex shrink-0 items-center justify-center rounded-md bg-zinc-800 [&_svg:not([class*='text-'])]:text-white",
				"p-2 [&_svg:not([class*='size-'])]:size-4",
				"data-[size='sm']:p-1.5 data-[size='sm']:[&_svg:not([class*='size-'])]:size-3",
				className,
			)}
			data-size={size}
			data-slot={"box-item-icon"}
			{...props}
		/>
	);
}

export {
	Box,
	BoxItem,
	BoxItemContent,
	BoxItemTitle,
	BoxItemDescription,
	BoxItemLink,
	BoxItemIcon,
};
