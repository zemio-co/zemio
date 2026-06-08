import "server-only";

import { createLogger } from "@zemio/logger";

import { env } from "@/env";

export const logger = createLogger({
	token: env.NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN,
	service: "web",
	endpoint: env.NEXT_PUBLIC_BETTER_STACK_INGESTING_URL,
});
