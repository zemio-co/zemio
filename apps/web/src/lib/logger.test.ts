import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const consoleLogger = {
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	flush: vi.fn(),
};

const sink = {
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
};

/** Mutable so a test can decide whether the agent is running. */
const appsignal: {
	client: { isActive: boolean } | undefined;
	logger: () => typeof sink;
} = {
	client: undefined,
	logger: () => sink,
};

vi.mock("@zemio/logger", () => ({ createLogger: () => consoleLogger }));
vi.mock("@appsignal/nodejs", () => ({ Appsignal: appsignal }));

/**
 * Loads the logger with NODE_ENV fixed.
 *
 * Whether stdout is treated as local is read once when the module loads, so
 * each case needs its own module instance rather than a reassignment.
 */
async function loadLogger(nodeEnv: string) {
	vi.stubEnv("NODE_ENV", nodeEnv);
	vi.resetModules();
	return (await import("./logger")).logger;
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.unstubAllEnvs();
	appsignal.client = undefined;
});

// `process.env` is process-wide and outlives this file, so the last test's
// stub would otherwise follow whatever runs next in the same worker.
afterEach(() => {
	vi.unstubAllEnvs();
});

describe("stdout fallback", () => {
	it("redacts user identifiers where stdout can leave the host", async () => {
		const logger = await loadLogger("production");

		logger.info("report submitted", { userId: "user_1", reportId: "r_1" });

		expect(consoleLogger.info).toHaveBeenCalledWith("report submitted", {
			userId: "[REDACTED]",
			reportId: "r_1",
		});
	});

	it("keeps the organization, which names a tenant and not a person", async () => {
		const logger = await loadLogger("production");

		logger.warn("quota exceeded", { organizationId: "org_1" });

		expect(consoleLogger.warn).toHaveBeenCalledWith("quota exceeded", {
			organizationId: "org_1",
		});
	});

	it("redacts an address quoted inside an error message", async () => {
		const logger = await loadLogger("production");

		logger.error("login failed", {
			error: "no user found for someone@example.com",
		});

		expect(consoleLogger.error).toHaveBeenCalledWith("login failed", {
			error: "no user found for [REDACTED]",
		});
	});

	it("keeps full fields in development, where stdout has nowhere to go", async () => {
		const logger = await loadLogger("development");

		logger.info("report submitted", { userId: "user_1" });

		expect(consoleLogger.info).toHaveBeenCalledWith("report submitted", {
			userId: "user_1",
		});
	});
});

describe("with the agent running", () => {
	it("writes nothing to stdout", async () => {
		appsignal.client = { isActive: true };
		const logger = await loadLogger("production");

		logger.info("report submitted", { userId: "user_1" });

		// The drain carries stdout, so what does *not* go there decides how much
		// of the app's logging the drain has to be trusted with.
		expect(consoleLogger.info).not.toHaveBeenCalled();
		expect(sink.info).toHaveBeenCalledWith("report submitted", {
			userId: "[REDACTED]",
		});
	});
});
