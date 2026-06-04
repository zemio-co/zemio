import { Button } from "@base-ui/react";
import { ChevronRight } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";

export type ListLayout = "compact" | "default" | "loose";

export function List({
	className,
	layout = "default",
	...props
}: React.ComponentProps<"ul"> & { layout?: ListLayout }) {
	return (
		<ul
			className={cn(
				"group/list",
				"[--list-px:1rem] [--list-py:0.75rem] [--w-action-cell:2rem]",
				className,
			)}
			data-layout={layout}
			data-slot="list"
			{...props}
		/>
	);
}

export function ListGroupHeader({
	className,
	...props
}: React.ComponentProps<"li">) {
	return (
		<li
			className={cn(
				"flex items-center justify-start gap-2 border-border border-y bg-muted ps-1 font-medium text-foreground text-sm first:border-t [&_svg]:size-4 data-[collapsed=true]:[:not(:last-child)]:border-b-0",
				'group-data-[layout="compact"]/list:h-8.5 group-data-[layout="default"]/list:h-10 group-data-[layout="loose"]/list:h-12',
				className,
			)}
			data-slot=""
			{...props}
		/>
	);
}

export function ListItem({ className, ...props }: React.ComponentProps<"li">) {
	return (
		<li
			className={cn(
				"group/list-item flex items-center justify-start gap-2 py-(--list-py) ps-1 pe-8 text-sm hover:bg-muted/60 data-selected:bg-primary/10 dark:data-selected:bg-primary/20",
				'group-data-[layout="compact"]/list:h-8.5 group-data-[layout="default"]/list:h-10 group-data-[layout="loose"]/list:h-12',
				"[&:hover_[role='checkbox']]:opacity-100 [&_[role='checkbox']:hover]:border-foreground/70 [&_[role='checkbox'][data-checked]]:border-primary [&_[role='checkbox'][data-checked]]:opacity-100 **:[[role='checkbox']]:border-foreground/40 **:[[role='checkbox']]:opacity-0",
				"[&:not(:has([data-slot=list-action-slot]))]:pl-11",
				className,
			)}
			data-slot="list-item"
			{...props}
		/>
	);
}

export function ListActionSlot({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				'relative z-60 me-1 flex w-4 items-center justify-center group-data-[layout="compact"]/list:h-8.5 group-data-[layout="default"]/list:h-10 group-data-[layout="loose"]/list:h-12',
				className,
			)}
			data-slot="list-action-slot"
			{...props}
		/>
	);
}

export function ListGroupToggle({
	className,
	...props
}: React.ComponentProps<typeof Button>) {
	return (
		<Button
			className={cn(
				"group/list-group-toggle flex size-full items-center justify-center",
				className,
			)}
			{...props}
		>
			<ChevronRight
				className={cn(
					"size-4 transform text-muted-foreground transition-[transform,translate,rotate,color] duration-75 ease-in group-hover/list-group-toggle:text-foreground group-data-[expanded=true]/list-group-toggle:rotate-90",
				)}
			/>
		</Button>
	);
}
