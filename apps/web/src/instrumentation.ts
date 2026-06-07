import * as Sentry from "@sentry/nextjs";

export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		await import("../sentry.server.config").catch(() => {});
	}

	if (process.env.NEXT_RUNTIME === "edge") {
		await import("../sentry.edge.config").catch(() => {});
	}
}

export const onRequestError = Sentry.captureRequestError;
