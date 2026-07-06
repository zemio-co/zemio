"use client";

import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { type ReactNode, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

type AsyncBoundaryProps = {
	children: ReactNode;
	/** Skeleton shown while suspense queries resolve. */
	pending: ReactNode;
	/** Error UI. `retry` refetches the failed queries and remounts children. */
	rejected: (props: { error: Error; retry: () => void }) => ReactNode;
};

/**
 * SECTION 3 — The async boundary. This is the ONE place async lifecycle
 * lives. Everything rendered below <Suspense> is guaranteed to have fully
 * resolved data, so the form never has to handle a partial-data state and
 * never needs its own isLoading checks.
 *
 * QueryErrorResetBoundary wires React Query's reset into the error
 * boundary, so the "Try again" button actually refetches instead of just
 * clearing the error.
 *
 * Build this once; every sheet in the app reuses it.
 */
export function AsyncBoundary({
	children,
	pending,
	rejected,
}: AsyncBoundaryProps) {
	return (
		<QueryErrorResetBoundary>
			{({ reset }) => (
				<ErrorBoundary
					fallbackRender={({ error, resetErrorBoundary }) =>
						rejected({ error: error as Error, retry: resetErrorBoundary })
					}
					onReset={reset}
				>
					<Suspense fallback={pending}>{children}</Suspense>
				</ErrorBoundary>
			)}
		</QueryErrorResetBoundary>
	);
}
