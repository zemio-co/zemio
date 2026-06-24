import { Logtail } from "@logtail/node";
import type { LogFields, Logger, LoggerOptions } from "./types";

export function createLogger({
	token,
	service,
	endpoint,
}: LoggerOptions): Logger {
	if (!token) {
		return createFallbackLogger(service);
	}

	const logtail = new Logtail(token, {
		endpoint,
	});
	const base = { service };

	return {
		debug: (message, fields) => {
			void logtail.debug(message, { ...base, ...(fields ?? {}) });
		},
		info: (message, fields) => {
			void logtail.info(message, { ...base, ...(fields ?? {}) });
		},
		warn: (message, fields) => {
			void logtail.warn(message, { ...base, ...(fields ?? {}) });
		},
		error: (message, fields) => {
			void logtail.error(message, { ...base, ...(fields ?? {}) });
		},
		flush: () => logtail.flush(),
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

function createFallbackLogger(service: string): Logger {
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
