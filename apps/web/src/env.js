import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Environment Variables
 *
 * Validates the environment variables consumed by the web app. Secrets and
 * runtime configuration are provided by the host at container start.
 *
 * For self-hosting documentation, see SELF_HOSTING.md
 */
export const env = createEnv({
	/**
	 * Server-side environment variables schema
	 *
	 * These are secrets that should NEVER be committed to version control.
	 * They are validated at build time to ensure the app isn't built with missing secrets.
	 */
	server: {
		// =================================================================
		// Authentication Secrets
		// =================================================================

		/**
		 * Secret key for signing authentication tokens (JWT)
		 * Generate with: openssl rand -base64 32
		 * Required in production, optional in development
		 */
		BETTER_AUTH_SECRET:
			process.env.NODE_ENV === "production" ? z.string() : z.string().optional(),

		/**
		 * Microsoft OAuth client secret
		 * Get this from Azure AD App Registration > Certificates & secrets
		 */
		MICROSOFT_CLIENT_SECRET: z.string(),

		// =================================================================
		// Storage Secrets (S3-compatible)
		// =================================================================

		/**
		 * S3-compatible storage access key ID
		 */
		STORAGE_ACCESS_KEY_ID: z.string(),

		/**
		 * S3-compatible storage secret access key
		 */
		STORAGE_ACCESS_KEY: z.string(),

		/**
		 * S3-compatible storage secure
		 */
		STORAGE_SECURE: z.boolean().default(true),

		/**
		 * S3-compatible storage force path style
		 */
		STORAGE_FORCE_PATH_STYLE: z.boolean().default(false),

		/**
		 * S3-compatible storage force path style
		 */
		// =================================================================
		// Email Service Secret
		// =================================================================

		/**
		 * Resend API key for sending emails
		 * Get this from https://resend.com/api-keys
		 */
		RESEND_API_KEY: z.string(),

		// =================================================================
		// Runtime Environment
		// =================================================================

		/**
		 * Node.js environment
		 */
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),

		// =================================================================
		// Optional Overrides (for CI/CD and backward compatibility)
		// =================================================================

		/**
		 * Database URL override
		 * When set, takes precedence over config.ts database.url
		 * Useful for CI/CD pipelines and Docker deployments
		 */
		DATABASE_URL: z.string().url().optional(),

		/**
		 * Better Auth URL override
		 * When set, takes precedence over config.ts auth.url
		 */
		BETTER_AUTH_URL: z.url(),

		/**
		 * Superuser ID override
		 * When set, takes precedence over config.ts app.superuserId
		 */
		SUPERUSER_ID: z.string().optional(),

		/**
		 * Microsoft tenant ID override
		 * When set, takes precedence over config.ts auth.microsoft.tenantId
		 */
		MICROSOFT_TENANT_ID: z.string(),

		/**
		 * Microsoft client ID override
		 * When set, takes precedence over config.ts auth.microsoft.clientId
		 */
		MICROSOFT_CLIENT_ID: z.string(),

		/**
		 * Storage host override
		 * When set, takes precedence over config.ts storage.host
		 */
		STORAGE_HOST: z.string(),

		/**
		 * Storage region override
		 * When set, takes precedence over config.ts storage.region
		 */
		STORAGE_REGION: z.string(),

		/**
		 * Storage bucket override
		 * When set, takes precedence over config.ts storage.bucket
		 */
		STORAGE_BUCKET: z.string(),

		/**
		 * Email from address override
		 * When set, takes precedence over config.ts email.from
		 */
		EMAIL_FROM: z.string().email().optional(),

		/**
		 * Secret key for signing banking details
		 * Generate with: openssl rand -base64 32
		 */
		SECRET_ENCRYPTION_KEY: z.string(),

		/**
		 * URL of the internal Hono API server (apps/api)
		 */
		API_URL: z.string().url(),

		/**
		 * Shared secret for service-to-service auth with apps/api
		 * Generate with: openssl rand -base64 32
		 */
		INTERNAL_API_SECRET: z.string().min(32),

		// =================================================================
		// Better Stack Error Tracking
		// =================================================================

		/**
		 * Telemetry API token used by the Sentry webpack plugin to upload source maps
		 * to Better Stack Errors.
		 */
		// Build-time only — used by the Sentry webpack plugin to upload source maps.
		// Not required at runtime; the server must start even when these are absent.
		SENTRY_AUTH_TOKEN: z.string().optional(),

		/**
		 * Better Stack team identifier used for source map uploads.
		 */
		SENTRY_ORG: z.string().optional(),

		/**
		 * Better Stack application identifier used for source map uploads.
		 */
		SENTRY_PROJECT: z.string().optional(),

		/**
		 * Better Stack source map upload endpoint.
		 */
		SENTRY_URL: z.url().optional(),

		// =================================================================
		// Better Stack Runtime Error Tracking & Logging
		// =================================================================
		// Read at runtime (not inlined at build). The DSN is the only value
		// exposed to the browser; it is injected into the document at request
		// time rather than baked into the client bundle, keeping the image
		// environment-agnostic. The source token and ingesting URL are used by
		// the server-only logger.

		/**
		 * Better Stack Errors DSN used by the Sentry SDK (server runtimes and,
		 * via runtime injection, the browser).
		 */
		BETTER_STACK_DSN: z.url().optional(),

		/**
		 * Better Stack source token used by the server-side logger.
		 */
		BETTER_STACK_SOURCE_TOKEN: z.string().min(1).optional(),

		/**
		 * Better Stack log ingesting endpoint used by the server-side logger.
		 */
		BETTER_STACK_INGESTING_URL: z.url().optional(),
	},

	/**
	 * Client-side environment variables schema
	 *
	 * No build-time client variables: values the browser needs are injected at
	 * runtime (see src/lib/runtime-env) so the built image stays environment-agnostic.
	 */
	client: {},

	/**
	 * Runtime environment variable mapping
	 *
	 * Required for Next.js edge runtimes and client-side code
	 */
	runtimeEnv: {
		// Secrets (required)
		BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
		MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET,
		STORAGE_ACCESS_KEY_ID: process.env.STORAGE_ACCESS_KEY_ID,
		STORAGE_ACCESS_KEY: process.env.STORAGE_ACCESS_KEY,
		STORAGE_SECURE: process.env.STORAGE_SECURE,
		STORAGE_FORCE_PATH_STYLE: process.env.STORAGE_FORCE_PATH_STYLE,
		RESEND_API_KEY: process.env.RESEND_API_KEY,
		SECRET_ENCRYPTION_KEY: process.env.SECRET_ENCRYPTION_KEY,

		// Runtime
		NODE_ENV: process.env.NODE_ENV,

		// Optional overrides
		DATABASE_URL: process.env.DATABASE_URL,
		BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
		SUPERUSER_ID: process.env.SUPERUSER_ID,
		MICROSOFT_TENANT_ID: process.env.MICROSOFT_TENANT_ID,
		MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID,
		STORAGE_HOST: process.env.STORAGE_HOST,
		STORAGE_REGION: process.env.STORAGE_REGION,
		STORAGE_BUCKET: process.env.STORAGE_BUCKET,
		EMAIL_FROM: process.env.EMAIL_FROM,
		API_URL: process.env.API_URL,
		INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET,
		SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
		SENTRY_ORG: process.env.SENTRY_ORG,
		SENTRY_PROJECT: process.env.SENTRY_PROJECT,
		SENTRY_URL: process.env.SENTRY_URL,

		// Better Stack runtime error tracking & logging
		BETTER_STACK_DSN: process.env.BETTER_STACK_DSN,
		BETTER_STACK_SOURCE_TOKEN: process.env.BETTER_STACK_SOURCE_TOKEN,
		BETTER_STACK_INGESTING_URL: process.env.BETTER_STACK_INGESTING_URL,
	},

	/**
	 * Skip validation during Docker builds
	 *
	 * Set SKIP_ENV_VALIDATION=1 to skip validation during build time.
	 * This is useful for Docker builds where secrets aren't available.
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,

	/**
	 * Treat empty strings as undefined
	 *
	 * This ensures that SOME_VAR="" is treated as if SOME_VAR wasn't set.
	 */
	emptyStringAsUndefined: true,
});
