/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */

import path from "node:path";
import { withBetterStack } from "@logtail/next";
import { withSentryConfig } from "@sentry/nextjs";
import { env } from "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
	output: "standalone",
	serverExternalPackages: ["pdfkit"],
	// Required for standalone output to correctly trace workspace package files
	// (packages/db, packages/encryption) in the monorepo.
	outputFileTracingRoot: path.resolve(import.meta.dirname, "../.."),
};

const sourceMapUploadConfig =
	env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT && env.SENTRY_URL
		? {
				authToken: env.SENTRY_AUTH_TOKEN,
				org: env.SENTRY_ORG,
				project: env.SENTRY_PROJECT,
				url: env.SENTRY_URL,
			}
		: {};

export default withBetterStack(
	withSentryConfig(config, {
		// Only print logs for uploading source maps in CI
		silent: !process.env.CI,

		// Upload a larger set of source maps for prettier stack traces (increases build time)
		widenClientFileUpload: true,

		webpack: {
			// Tree-shaking options for reducing bundle size
			treeshake: {
				// Automatically tree-shake Sentry logger statements to reduce bundle size
				removeDebugLogging: true,
			},
		},
		...sourceMapUploadConfig,
	}),
);
