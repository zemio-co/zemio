// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { getErrorTrackingConfig } from "@/lib/error-tracking/options";

const errorTrackingConfig = getErrorTrackingConfig();

if (errorTrackingConfig) {
	Sentry.init(errorTrackingConfig);
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
