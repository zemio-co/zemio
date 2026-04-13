"use client";

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
				defaultTheme="system"
				disableTransitionOnChange
				enableSystem
				{...props}
			>
				{children}
			</NextThemesProvider>
		</NuqsAdapter>
	);
}
