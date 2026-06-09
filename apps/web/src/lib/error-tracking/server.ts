import "server-only";

import { getServerRuntimeEnv } from "@/lib/runtime-env/server";
import { buildErrorTrackingConfig, type ErrorTrackingConfig } from "./options";

/** Sentry init options for the Node and edge server runtimes. */
export function getServerErrorTrackingConfig(): ErrorTrackingConfig | null {
	return buildErrorTrackingConfig(getServerRuntimeEnv().betterStackDsn);
}
