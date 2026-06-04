import type { BrowserOptions } from "@sentry/nextjs";
import { env } from "@/env";

type ErrorTrackingConfig = Pick<
	BrowserOptions,
	"dsn" | "enableLogs" | "sendDefaultPii" | "tracesSampleRate"
>;

export function getErrorTrackingConfig(): ErrorTrackingConfig | null {
	if (!env.NEXT_PUBLIC_BETTER_STACK_DSN) {
		return null;
	}

	return {
		dsn: env.NEXT_PUBLIC_BETTER_STACK_DSN,
		tracesSampleRate: 0,
		enableLogs: false,
		sendDefaultPii: false,
	};
}
