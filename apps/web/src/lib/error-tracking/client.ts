import { getPublicRuntimeEnv } from "@/lib/runtime-env/public";
import { buildErrorTrackingConfig, type ErrorTrackingConfig } from "./options";

/** Sentry init options for the browser, sourced from the injected runtime env. */
export function getClientErrorTrackingConfig(): ErrorTrackingConfig | null {
	return buildErrorTrackingConfig(getPublicRuntimeEnv().betterStackDsn);
}
