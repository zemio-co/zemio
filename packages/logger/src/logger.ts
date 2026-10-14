import type { LogFields, Logger, LoggerOptions } from "./types";

/**
 * Structured logger writing JSON lines to stdout/stderr.
 *
 * The container runtime collects these; there is no remote log sink configured
 * (the Better Stack transport was removed, see DEV-43).
 */
export function createLogger({ service }: LoggerOptions): Logger {
	return {
		debug: (msg, fields) =>
			console.log(serializeEntry("debug", service, msg, fields)),
		info: (msg, fields) =>
			console.log(serializeEntry("info", service, msg, fields)),
		warn: (msg, fields) =>
			console.warn(serializeEntry("warn", service, msg, fields)),
		error: (msg, fields) =>
			console.error(serializeEntry("error", service, msg, fields)),
		flush: () => Promise.resolve(),
	};
}

function serializeEntry(
	level: string,
	service: string,
	message: string,
	fields?: LogFields,
): string {
	const entry: Record<string, unknown> = { level, service, message, ...fields };
	return JSON.stringify(entry, (_key, value) => {
		if (value instanceof Error) {
			return { name: value.name, message: value.message };
		}
		return value as unknown;
	});
}
