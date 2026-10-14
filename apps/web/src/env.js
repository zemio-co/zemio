import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * `Name <address>` as written in `EMAIL_FROM`. Matched here so a malformed value
 * fails at boot rather than at the first send, and exported so the one place
 * that splits it into Scaleway's `{name, email}` uses the same rule.
 *
 * This only describes the shape — the captured address is checked separately
 * below, because `a@b` and `a@-b` satisfy any pattern loose enough to accept
 * every legal local part, and Scaleway would reject them one send at a time.
 *
 * The split deliberately does not happen in the schema below: `skipValidation`
 * hands back `process.env` untouched, so a `.transform()` would be skipped along
 * with the validation and leave a bare string behind a parsed-object type.
 */
export const EMAIL_FROM_PATTERN =
	/^\s*(.+?)\s*<\s*([^\s<>@]+@[^\s<>@]+)\s*>\s*$/;

/** Stated once so the schema and the split that follows it agree. */
export const EMAIL_FROM_HINT =
	'EMAIL_FROM must look like "zemio <noreply@send.zemio.co>"';

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
		 * S3-compatible storage secure.
		 *
		 * `stringbool` rather than `boolean`: environment variables arrive as
		 * strings, so a plain boolean schema rejects the `STORAGE_SECURE=true`
		 * that .env.example itself ships.
		 */
		STORAGE_SECURE: z.stringbool().default(true),

		/**
		 * S3-compatible storage force path style
		 */
		STORAGE_FORCE_PATH_STYLE: z.stringbool().default(false),

		/**
		 * S3-compatible storage force path style
		 */
		// =================================================================
		// Email Service Secret
		// =================================================================

		/**
		 * Scaleway IAM secret key used as `X-Auth-Token` against the
		 * Transactional Email API
		 */
		SCALEWAY_TEM_SECRET_KEY: z.string(),

		/**
		 * Scaleway project the verified sending domain belongs to
		 */
		SCALEWAY_TEM_PROJECT_ID: z.string(),

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
		 * Sender of every outgoing email, as `Name <address>`. The address has to
		 * sit on a domain verified in Scaleway, so moving to another sending
		 * domain is a change to this value rather than to the code.
		 */
		EMAIL_FROM: z
			.string()
			.regex(EMAIL_FROM_PATTERN, EMAIL_FROM_HINT)
			.refine(
				(value) => z.email().safeParse(EMAIL_FROM_PATTERN.exec(value)?.[2]).success,
				"EMAIL_FROM must carry a valid address on a domain verified in Scaleway",
			),

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
		// AppSignal (optional — error tracking & monitoring)
		// =================================================================
		// Consumed by appsignal.cjs, which reads process.env directly because it
		// runs before this module is loaded. Declared here so a typo fails the
		// build rather than silently disabling monitoring.

		/**
		 * AppSignal push API key (server). Absent turns monitoring off.
		 */
		APPSIGNAL_PUSH_API_KEY: z.string().min(1).optional(),

		/**
		 * AppSignal application name. Name + environment identify the app;
		 * changing either creates a NEW app on appsignal.com rather than
		 * renaming the existing one.
		 */
		APPSIGNAL_APP_NAME: z.string().min(1).default("zemio-web"),

		/**
		 * AppSignal environment, e.g. "production" or "staging". Falls back to
		 * NODE_ENV when unset.
		 */
		APPSIGNAL_APP_ENV: z.string().min(1).optional(),

		/**
		 * AppSignal front-end key, used by the browser SDK. Distinct from the
		 * push API key and exposed to the browser by design; it is injected at
		 * request time rather than inlined at build (see src/lib/runtime-env).
		 */
		APPSIGNAL_FRONTEND_KEY: z.string().min(1).optional(),

		/**
		 * Release identifier for deploy markers. Baked into the image by CI from
		 * the commit SHA — not set per environment. Unset simply leaves errors
		 * ungrouped by release.
		 */
		APP_REVISION: z.string().min(1).optional(),

		// =================================================================
		// Billing (optional — Zemio runs fully without it)
		// =================================================================
		// Shape only. Whether these are *required* depends on BILLING_ENABLED,
		// which no per-key schema can express — that cross-field rule lives in
		// src/server/modules/billing/billing.config.ts, which also parses the
		// flag. Left as plain strings here so there is one parser, not two.

		/**
		 * Turns billing on for this deployment. Off unless explicitly "true" or
		 * "1", so a self-hosted instance bills nothing and treats every
		 * organization as entitled (ADR-0001).
		 */
		BILLING_ENABLED: z.string().optional(),

		/**
		 * Stripe secret API key. Required only when BILLING_ENABLED is on.
		 */
		STRIPE_SECRET_KEY: z.string().optional(),

		/**
		 * Signing secret for the Stripe webhook endpoint. Required only when
		 * BILLING_ENABLED is on.
		 */
		STRIPE_WEBHOOK_SECRET: z.string().optional(),

		// =================================================================
		// Local Development Tuning
		// =================================================================

		/**
		 * Opt-in cap on Turbopack's memory use, in megabytes. Build-time only.
		 * Unset by default so it doesn't affect anyone else's machine; set it in
		 * your local .env on memory-constrained setups (e.g. a small VPS) to stop
		 * dev-server RSS from growing unbounded over a long session.
		 */
		TURBOPACK_MEMORY_LIMIT_MB: z.coerce.number().int().positive().optional(),
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
		SCALEWAY_TEM_SECRET_KEY: process.env.SCALEWAY_TEM_SECRET_KEY,
		SCALEWAY_TEM_PROJECT_ID: process.env.SCALEWAY_TEM_PROJECT_ID,
		SECRET_ENCRYPTION_KEY: process.env.SECRET_ENCRYPTION_KEY,

		// Runtime
		NODE_ENV: process.env.NODE_ENV,

		// Optional overrides
		DATABASE_URL: process.env.DATABASE_URL,
		BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
		MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID,
		STORAGE_HOST: process.env.STORAGE_HOST,
		STORAGE_REGION: process.env.STORAGE_REGION,
		STORAGE_BUCKET: process.env.STORAGE_BUCKET,
		EMAIL_FROM: process.env.EMAIL_FROM,
		API_URL: process.env.API_URL,
		INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET,
		// AppSignal
		APPSIGNAL_PUSH_API_KEY: process.env.APPSIGNAL_PUSH_API_KEY,
		APPSIGNAL_APP_NAME: process.env.APPSIGNAL_APP_NAME,
		APPSIGNAL_APP_ENV: process.env.APPSIGNAL_APP_ENV,
		APPSIGNAL_FRONTEND_KEY: process.env.APPSIGNAL_FRONTEND_KEY,
		APP_REVISION: process.env.APP_REVISION,

		// Billing
		BILLING_ENABLED: process.env.BILLING_ENABLED,
		STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
		STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,

		// Local development tuning
		TURBOPACK_MEMORY_LIMIT_MB: process.env.TURBOPACK_MEMORY_LIMIT_MB,
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
