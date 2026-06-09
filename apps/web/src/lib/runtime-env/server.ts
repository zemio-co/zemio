import "server-only";

import { env } from "@/env";
import type { PublicRuntimeEnv } from "./public";

/**
 * Server-side runtime configuration for error tracking and logging.
 *
 * Read at request/boot time from the validated environment, never inlined at
 * build time.
 */
export interface ServerRuntimeEnv {
	betterStackDsn: string | undefined;
	betterStackSourceToken: string | undefined;
	betterStackIngestingUrl: string | undefined;
}

export function getServerRuntimeEnv(): ServerRuntimeEnv {
	return {
		betterStackDsn: env.BETTER_STACK_DSN,
		betterStackSourceToken: env.BETTER_STACK_SOURCE_TOKEN,
		betterStackIngestingUrl: env.BETTER_STACK_INGESTING_URL,
	};
}

/** The subset of server runtime env that is exposed to the browser. */
export function getPublicRuntimeEnvFromServer(): PublicRuntimeEnv {
	return {
		betterStackDsn: env.BETTER_STACK_DSN,
	};
}
