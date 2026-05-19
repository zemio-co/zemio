"use client";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import type * as React from "react";

export function Providers({
	children,
	...props
}: React.ComponentProps<typeof NextThemesProvider>) {
	return (
		<NuqsAdapter>
			<NextThemesProvider
				attribute="class"
				defaultTheme="light"
				disableTransitionOnChange
				forcedTheme="light"
				{...props}
			>
				{children}
			</NextThemesProvider>
		</NuqsAdapter>
	);
}
