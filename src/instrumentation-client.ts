// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
	dsn: "https://f4a6ba3b7c44b7e41b491abd08482bcd@o4508929955528704.ingest.de.sentry.io/4510767512027216",

	// Keep client-side monitoring limited to explicit error events.
	tracesSampleRate: 0,
	enableLogs: false,

	// Session replay and automatic PII forwarding are intentionally disabled.
	sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
