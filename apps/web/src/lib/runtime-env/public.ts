import { z } from "zod";

/**
 * Runtime configuration that is safe to expose to the browser.
 *
 * These values are NOT inlined at build time. They are read from the server
 * environment at request time and injected into the document via
 * {@link PublicEnvScript}, then read back here in the browser. This keeps the
 * built image environment-agnostic ("build once, deploy anywhere").
 */
const publicRuntimeEnvSchema = z.object({
	betterStackDsn: z.string().min(1).optional(),
});

export type PublicRuntimeEnv = z.infer<typeof publicRuntimeEnvSchema>;

/** Global key under which the injected public runtime env is stored. */
export const PUBLIC_ENV_WINDOW_KEY = "__ZEMIO_PUBLIC_ENV__";

interface PublicEnvWindow {
	[PUBLIC_ENV_WINDOW_KEY]?: unknown;
}

/**
 * Reads the validated public runtime env in the browser.
 *
 * Must only be called on the client. The values are injected by
 * {@link PublicEnvScript} in the document head before any deferred Next.js
 * bundle executes, so the global is guaranteed to be present here.
 */
export function getPublicRuntimeEnv(): PublicRuntimeEnv {
	const raw = (globalThis as PublicEnvWindow)[PUBLIC_ENV_WINDOW_KEY];
	return publicRuntimeEnvSchema.parse(raw ?? {});
}
