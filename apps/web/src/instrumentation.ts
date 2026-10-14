import type { Instrumentation } from "next";

export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		// Starts the AppSignal agent. First, so that it is running before the
		// billing bootstrap below can fail.
		await import("../appsignal.cjs");

		// Resolves the billing configuration while the server is starting, so a
		// deployment that turns billing on without credentials fails here rather
		// than on the first request that reaches the tRPC API.
		//
		// Exiting explicitly because Next.js logs a throwing instrumentation hook
		// and then leaves the process running: without this the container stays
		// up, holding its port open while being unable to serve anything.
		try {
			await import("./server/modules/billing/billing.config");
		} catch (error) {
			console.error(error instanceof Error ? error.message : error);
			process.exit(1);
		}
	}
}

/**
 * Reports server-side exceptions — Server Component renders, route handlers,
 * server actions — to AppSignal.
 *
 * Next.js does not surface these to the tracer on its own; this hook is the
 * documented way in, and without it only client-side errors would be tracked.
 * `sendError` is a no-op while the agent is inactive.
 */
export const onRequestError: Instrumentation.onRequestError = async (
	error,
	request,
	context,
) => {
	if (process.env.NEXT_RUNTIME !== "nodejs") {
		return;
	}

	const { sendError, setRootName } = await import("@appsignal/nodejs");
	sendError(error instanceof Error ? error : new Error(String(error)), () => {
		// `sendError` opens a root span named after the error class, so without a
		// name of our own every server error in the app groups under one action
		// and per-route triage is lost.
		//
		// `context.routePath` is the route pattern (`/reports/[id]`), not the
		// resolved URL in `request.path`. It groups correctly, and it carries no
		// record identifiers — the resolved path would.
		setRootName(`${request.method} ${context.routePath}`);
	});
};
