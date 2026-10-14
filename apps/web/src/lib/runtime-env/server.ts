import "server-only";

import { env } from "@/env";
import type { PublicRuntimeEnv } from "./public";

/** The subset of server runtime env that is exposed to the browser. */
export function getPublicRuntimeEnvFromServer(): PublicRuntimeEnv {
	return {
		appsignalFrontendKey: env.APPSIGNAL_FRONTEND_KEY,
		appsignalRevision: env.APP_REVISION,
	};
}
