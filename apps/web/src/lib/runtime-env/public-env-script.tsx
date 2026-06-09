import "server-only";

import { PUBLIC_ENV_WINDOW_KEY } from "./public";
import { getPublicRuntimeEnvFromServer } from "./server";

/**
 * Serializes a value for safe inlining inside an HTML <script> tag.
 *
 * Escapes `<` so the payload cannot terminate the script element early
 * (defends against `</script>` injection through env values).
 */
function serializeForScript(value: unknown): string {
	return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * Injects the public runtime env into the document.
 *
 * Rendered as a classic inline script in the document <head>. It executes
 * synchronously during HTML parsing, so the global is set before any client
 * code runs at hydration time — including the Sentry client instrumentation.
 * This keeps the built image environment-agnostic ("build once, deploy
 * anywhere"): the browser-visible config comes from the server environment at
 * request time rather than being inlined at build time.
 */
export function PublicEnvScript() {
	const publicEnv = getPublicRuntimeEnvFromServer();
	return (
		<script
			// biome-ignore lint/security/noDangerouslySetInnerHtml: required to inline runtime env; payload is escaped via serializeForScript
			dangerouslySetInnerHTML={{
				__html: `window.${PUBLIC_ENV_WINDOW_KEY}=${serializeForScript(publicEnv)};`,
			}}
		/>
	);
}
