import "server-only";

import { createLogger } from "@zemio/logger";

import { getServerRuntimeEnv } from "@/lib/runtime-env/server";

const runtimeEnv = getServerRuntimeEnv();

export const logger = createLogger({
	token: runtimeEnv.betterStackSourceToken,
	service: "web",
	endpoint: runtimeEnv.betterStackIngestingUrl,
});
