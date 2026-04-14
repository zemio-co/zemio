// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
	dsn: "https://f4a6ba3b7c44b7e41b491abd08482bcd@o4508929955528704.ingest.de.sentry.io/4510767512027216",

	// Keep edge monitoring limited to explicit error events.
	tracesSampleRate: 0,

	// Avoid forwarding application logs unless explicitly re-enabled later.
	enableLogs: false,

	// Do not send IPs, cookies, headers, or other default PII automatically.
	sendDefaultPii: false,
});
