// AppSignal agent configuration (DEV-43).
//
// CommonJS on purpose: this file is loaded from the Next.js instrumentation
// hook before the rest of the server, which is the point at which the agent
// must be started. It reads process.env directly rather than src/env.js
// because it runs before the app (and therefore before the validated env) is
// loaded; src/env.js still declares and validates the same variables.

const { Appsignal } = require("@appsignal/nodejs");

new Appsignal({
	// Off when no key is configured, so a local or self-hosted instance runs
	// without AppSignal instead of failing to boot.
	active: Boolean(process.env.APPSIGNAL_PUSH_API_KEY),
	// `||`, not `??`: an unset variable and one set to the empty string are the
	// same thing here, and src/env.js already treats them alike
	// (emptyStringAsUndefined). With `??` an empty APPSIGNAL_APP_NAME would
	// name the app "" — and name + environment are what identify it.
	name: process.env.APPSIGNAL_APP_NAME || "zemio-web",
	environment: process.env.APPSIGNAL_APP_ENV || process.env.NODE_ENV,
	pushApiKey: process.env.APPSIGNAL_PUSH_API_KEY,
	// Ties errors to a release; CI bakes the commit SHA into the image.
	revision: process.env.APP_REVISION || undefined,

	// ── Data minimisation ─────────────────────────────────────────────────
	// These four lines are the evidence for the promise that no request
	// parameters, session data, environment metadata or request headers reach
	// the error tracker from the server. They replace Sentry's single
	// `sendDefaultPii: false`, which AppSignal has no equivalent of.
	//
	// The browser half is covered separately, not here: reports from
	// @appsignal/javascript are relayed through our own origin
	// (src/app/api/monitoring/route.ts) so AppSignal sees this server's
	// address rather than the end user's.
	//
	// Cited by the legal documents — if you move or change them, update
	// docs/legal/toms-annex.md and the privacy policy in the same commit.
	sendParams: false,
	sendSessionData: false,
	sendEnvironmentMetadata: false,
	requestHeaders: [],

	// Next.js emits its own OpenTelemetry HTTP spans; AppSignal's would
	// duplicate them.
	disableDefaultInstrumentations: ["@opentelemetry/instrumentation-http"],
});
