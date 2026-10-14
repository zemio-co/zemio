import { env } from "@/env";
import { readCappedBody } from "@/server/shared/read-capped-body";

/**
 * Same-origin tunnel for browser error reports.
 *
 * `@appsignal/javascript` posts directly to AppSignal by default, which means
 * AppSignal observes the end user's IP address on every client-side report.
 * Pointing the SDK's `uri` at this route makes the browser talk to our origin
 * instead, and this handler relays the payload — so the only address AppSignal
 * sees is the server's. It replaces the `tunnelRoute` the Sentry setup used.
 *
 * The relay is deliberately narrow: one fixed destination, one allowlisted
 * request header, our own configured key. It is not a general proxy.
 */

/** The only destination this route will ever forward to. */
const APPSIGNAL_COLLECT_URL = "https://appsignal-endpoint.net/collect";

/**
 * The largest report worth relaying. A browser error span is a few kilobytes;
 * this leaves room to grow without leaving an unauthenticated endpoint open.
 */
const MAX_BODY_BYTES = 64 * 1024;

/**
 * How long to wait on AppSignal before giving up.
 *
 * This endpoint is unauthenticated and public, so every caller can open a
 * connection to the collector. Without a bound, a slow or hung collector holds
 * each one open and the relay becomes a way to exhaust sockets.
 */
const UPSTREAM_TIMEOUT_MS = 5_000;

/** Matches the SDK version string the browser appends to its request. */
const VERSION_PATTERN = /^[\w.-]{1,32}$/;

export async function POST(request: Request): Promise<Response> {
	// Without a key there is nothing to relay to, and answering anything else
	// would advertise an endpoint that cannot work.
	const frontendKey = env.APPSIGNAL_FRONTEND_KEY;
	if (!frontendKey) {
		return new Response("Not found", { status: 404 });
	}

	const body = await readCappedBody(request, MAX_BODY_BYTES);
	if (body === null) {
		return new Response("Payload too large", { status: 413 });
	}

	const target = new URL(APPSIGNAL_COLLECT_URL);
	// Our own key, never the one the browser sent: that stops this route being
	// used to write into somebody else's AppSignal account.
	target.searchParams.set("api_key", frontendKey);

	const version = new URL(request.url).searchParams.get("version");
	if (version && VERSION_PATTERN.test(version)) {
		target.searchParams.set("version", version);
	}

	let upstream: Response;
	try {
		upstream = await fetch(target, {
			method: "POST",
			body,
			signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
			// An allowlist, not a denylist: forwarding the incoming headers
			// wholesale would hand AppSignal the `x-forwarded-for` this route
			// exists to withhold, and any header added later would leak by
			// default. User-agent is passed because AppSignal derives browser
			// and OS attribution from it and the payload carries none itself.
			headers: {
				"content-type": "text/plain;charset=UTF-8",
				"user-agent": request.headers.get("user-agent") ?? "",
			},
		});
	} catch {
		// Covers the timeout above as well as an unreachable host. Either way the
		// report is lost and the page carries on: a monitoring relay must never
		// surface as a failed request in somebody's browser.
		return new Response(null, { status: 502 });
	}

	return new Response(null, { status: upstream.ok ? 204 : 502 });
}
