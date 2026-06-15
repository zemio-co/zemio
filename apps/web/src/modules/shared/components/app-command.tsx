"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import React, { createContext } from "react";
import { cn } from "@/lib/utils";

type AppCommandCtx = {
	open: boolean;
	setOpen: (open: boolean) => void;
};

const AppCommandContext = createContext<AppCommandCtx>({} as AppCommandCtx);

function AppCommandProvider({
	children,
	initialState,
}: React.PropsWithChildren & {
	initialState?: {
		open: boolean;
	};
}) {
	const [open, setOpen] = React.useState<boolean>(initialState?.open ?? false);

	return (
		<AppCommandContext.Provider
			value={{
				open,
				setOpen,
			}}
		>
			{children}
		</AppCommandContext.Provider>
	);
}

function AppCommand({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div className={cn("", className)} data-slot="app-command" {...props} />
	);
}

function AppCommandTrigger({
	className,
	placeholder = "Suchen...",
	...props
}: React.ComponentProps<typeof ButtonPrimitive> & {
	placeholder?: string;
}) {
	const { open, setOpen } = React.useContext(AppCommandContext);

	return (
		<ButtonPrimitive
			className={cn(
				"flex h-8 w-full max-w-72 items-center justify-between gap-6 rounded-sm bg-slate-100 px-2 py-2.5 pl-3",
				className,
			)}
			data-slot="app-command-trigger"
			disabled={open}
			onClick={() => setOpen(true)}
			{...props}
		>
			<span className="block font-medium text-slate-700 text-sm">
				{placeholder}
			</span>
			<span className="block rounded-xs bg-slate-200 px-1 py-0.5 font-medium text-slate-700 text-xs leading-none">
				⌘K
			</span>
		</ButtonPrimitive>
	);
}

export { AppCommand, AppCommandProvider, AppCommandTrigger };
