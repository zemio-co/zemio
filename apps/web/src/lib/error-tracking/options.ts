import type { BrowserOptions } from "@sentry/nextjs";

export type ErrorTrackingConfig = Pick<
	BrowserOptions,
	"dsn" | "enableLogs" | "sendDefaultPii" | "tracesSampleRate"
>;

/**
 * Builds the Sentry init options from a DSN, or returns null when tracking is
 * disabled (no DSN configured). The DSN source differs per runtime: the server
 * reads it from the environment, the browser from the injected runtime env.
 */
export function buildErrorTrackingConfig(
	dsn: string | undefined,
): ErrorTrackingConfig | null {
	if (!dsn) {
		return null;
	}

	return {
		dsn,
		tracesSampleRate: 0,
		enableLogs: false,
		sendDefaultPii: false,
	};
}
