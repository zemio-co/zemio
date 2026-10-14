import "server-only";

import { Appsignal } from "@appsignal/nodejs";
import { createLogger, type LogFields, type Logger } from "@zemio/logger";
import { toLogAttributes } from "@/lib/log-redaction";

/** Group all web logs land in on AppSignal. */
const LOG_GROUP = "web";

/**
 * Whether stdout stays on this machine.
 *
 * It does in development. In a deployed container it does not: Coolify drains
 * stdout and stderr to AppSignal (see docs/deployment.md, "Log drain"), so
 * every line written there leaves the host for a processor.
 *
 * The test is for development rather than against production on purpose.
 * Anything not demonstrably local is treated as leaving, so a deployment
 * without a drain redacts for no reason — which costs a debugging field. The
 * opposite mistake ships user identifiers to a processor.
 */
const STDOUT_IS_LOCAL = process.env.NODE_ENV === "development";

const consoleLogger = createLogger({ service: "web" });

let sink: ReturnType<typeof Appsignal.logger> | undefined;

/**
 * The AppSignal log sink, or undefined until the agent is running.
 *
 * The agent boots from the instrumentation hook (see appsignal.cjs), which may
 * run after this module is first imported, so the sink is resolved lazily and
 * cached only once it is real. Before that — and whenever AppSignal is not
 * configured at all — logging falls back to stdout.
 *
 * The check is `isActive`, not merely "a client exists": the constructor
 * registers itself globally before it decides whether it can start, so an
 * unconfigured (or failed-to-load) agent still answers `Appsignal.client`, and
 * `Appsignal.logger()` would hand back a no-op that swallows every line
 * instead of falling through to stdout.
 */
function resolveSink() {
	if (sink) {
		return sink;
	}
	if (!Appsignal.client?.isActive) {
		return undefined;
	}
	// "debug" is the floor, not the default "info": the level chosen here is a
	// threshold, and the default would silently drop every debug line.
	sink = Appsignal.logger(LOG_GROUP, "debug");
	return sink;
}

function send(
	level: "debug" | "info" | "warn" | "error",
	message: string,
	fields?: LogFields,
): void {
	const appsignal = resolveSink();
	if (!appsignal) {
		// The fallback runs when AppSignal is unconfigured or its agent never
		// started — precisely when the drain is the only thing still reporting.
		// So these lines have to be safe to export too, and full fields survive
		// only where stdout has nowhere to go.
		consoleLogger[level](
			message,
			STDOUT_IS_LOCAL ? fields : toLogAttributes(fields),
		);
		return;
	}

	// User identifiers are stripped here, on the way out to the processor.
	appsignal[level](message, toLogAttributes(fields));
}

export const logger: Logger = {
	debug: (message, fields) => send("debug", message, fields),
	info: (message, fields) => send("info", message, fields),
	warn: (message, fields) => send("warn", message, fields),
	error: (message, fields) => send("error", message, fields),
	// AppSignal's logger has no flush of its own; the agent batches and ships
	// in the background. Kept so call sites do not need to change.
	flush: () => Promise.resolve(),
};
