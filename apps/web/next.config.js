/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */

import path from "node:path";
import createNextIntlPlugin from "next-intl/plugin";
import { env } from "./src/env.js";

const withNextIntl = createNextIntlPlugin();

// Opt-in cap on Turbopack's memory use. Parsed and validated by src/env.js, so a
// malformed value fails the build instead of silently leaving the cap unset.
const turbopackMemoryLimitMb = env.TURBOPACK_MEMORY_LIMIT_MB;

/** @type {import("next").NextConfig} */
const config = {
	output: "standalone",
	// Emitted so AppSignal can resolve minified browser backtraces. The maps are
	// uploaded privately and then stripped from the image — they embed the
	// original source (sourcesContent), so serving them would publish it.
	// See apps/web/Dockerfile and scripts/upload-sourcemaps.mjs.
	productionBrowserSourceMaps: true,
	// @appsignal/nodejs loads a native agent; it must stay unbundled.
	serverExternalPackages: ["pdfkit", "@appsignal/nodejs"],
	// @zemio/ui exports raw .ts/.tsx source rather than a prebuilt dist.
	transpilePackages: ["@zemio/email", "@zemio/ui"],
	// Required for standalone output to correctly trace workspace package files
	// (packages/db, packages/encryption) in the monorepo.
	outputFileTracingRoot: path.resolve(import.meta.dirname, "../.."),
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "*", // Allow images from all domains
			},
		],
	},
	...(turbopackMemoryLimitMb !== undefined && {
		experimental: {
			turbopackMemoryLimit: turbopackMemoryLimitMb * 1024 * 1024,
		},
	}),
};

export default withNextIntl(config);
