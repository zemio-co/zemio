export const logger = {
	info: (msg: string, data?: unknown) =>
		console.log(JSON.stringify({ level: "info", msg, ...asObject(data) })),
	warn: (msg: string, data?: unknown) =>
		console.warn(JSON.stringify({ level: "warn", msg, ...asObject(data) })),
	error: (msg: string, data?: unknown) =>
		console.error(JSON.stringify({ level: "error", msg, ...asObject(data) })),
};

function asObject(data: unknown): Record<string, unknown> {
	if (data === undefined) return {};
	if (data !== null && typeof data === "object" && !Array.isArray(data)) {
		return data as Record<string, unknown>;
	}
	return { data };
}
