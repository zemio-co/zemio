"use client";

import { FieldErrorFormatProvider, TooltipProvider } from "@zemio/ui";
import { useTranslations } from "next-intl";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import type * as React from "react";
import { useCallback } from "react";

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
				{/* One provider for every tooltip: they open without delay, and once
				    one is open its neighbours open instantly too. */}
				<TooltipProvider>
					<ValidationMessages>{children}</ValidationMessages>
				</TooltipProvider>
			</NextThemesProvider>
		</NuqsAdapter>
	);
}

/**
 * Translates every form error `FieldError` renders.
 *
 * Zod schemas emit stable message keys (relative to the "validation"
 * namespace) instead of literal text, so translation happens once here rather
 * than in each form. `t()`'s key type can't be statically narrowed since the
 * key arrives as a runtime string from a Zod issue — the cast bridges that to
 * next-intl's typed API. `t.has` guards messages that aren't registered keys
 * (e.g. Zod's own built-in default messages), so those still render as-is.
 */
function ValidationMessages({ children }: { children: React.ReactNode }) {
	const t = useTranslations("validation");

	// Stable across renders, so every FieldError's memoised content survives
	// until the locale changes.
	const format = useCallback(
		(message: string) =>
			t.has(message as Parameters<typeof t>[0])
				? t(message as Parameters<typeof t>[0])
				: message,
		[t],
	);

	return (
		<FieldErrorFormatProvider format={format}>
			{children}
		</FieldErrorFormatProvider>
	);
}
