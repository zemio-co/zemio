// ================================================
// Scaleway Transactional Email client
// ================================================

import { render, toPlainText } from "@react-email/render";
import type { ReactElement } from "react";

/**
 * Transactional Email is only offered in `fr-par`, so the region is part of the
 * constant rather than configuration.
 */
const ENDPOINT =
	"https://api.scaleway.com/transactional-email/v1alpha1/regions/fr-par/emails";

const MAX_ATTEMPTS = 3;

/**
 * A send sits on the request path for invitations, so an unresponsive endpoint
 * has to fail rather than hold the caller open. Node applies no request timeout
 * of its own.
 *
 * One deadline covers the whole send, retries included: a per-attempt timeout
 * would let `MAX_ATTEMPTS` multiply it, and a caller held for three timeouts
 * plus the backoff is exactly what this is meant to prevent.
 */
const SEND_TIMEOUT_MS = 15_000;

export interface EmailAddress {
	name: string;
	email: string;
}

export interface SendInput {
	from: EmailAddress;
	to: string[];
	subject: string;
	react: ReactElement;
}

export type SendResult =
	| { ok: true; messageIds: string[] }
	| { ok: false; status: number; error: string };

export interface ScalewayClientConfig {
	apiKey: string;
	projectId: string;
	/** Base delay between retries, multiplied by the attempt number. */
	retryDelayMs?: number;
	/** Deadline for the whole send, retries included. */
	timeoutMs?: number;
}

export interface ScalewayClient {
	send(input: SendInput): Promise<SendResult>;
}

/**
 * A rate limit or a server-side fault is worth another try. A request that never
 * came back is not: it may have been accepted with only the response lost, and
 * the API takes no idempotency key, so retrying risks a second copy in the inbox.
 */
function isRetryable(status: number): boolean {
	return status === 429 || status >= 500;
}

/**
 * Resolves after `ms`, or as soon as `signal` aborts — whichever comes first.
 * A plain timer would let the backoff run past the send's deadline, which is
 * the one thing the deadline is supposed to prevent.
 */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
	if (signal.aborted) {
		return Promise.resolve();
	}
	return new Promise((resolve) => {
		const done = () => {
			clearTimeout(timer);
			signal.removeEventListener("abort", done);
			resolve();
		};
		const timer = setTimeout(done, ms);
		signal.addEventListener("abort", done, { once: true });
	});
}

/**
 * Bodies are read as text and parsed here rather than with `response.json()`: a
 * gateway in front of Scaleway can answer either status with something that is
 * not JSON, and that must not surface as a thrown send.
 */
function parseJson(body: string): unknown {
	try {
		return JSON.parse(body);
	} catch {
		return undefined;
	}
}

/** Scaleway describes a rejection in a JSON `message`. */
function errorFrom(body: string): string {
	const parsed = parseJson(body);
	if (
		typeof parsed === "object" &&
		parsed !== null &&
		"message" in parsed &&
		typeof parsed.message === "string"
	) {
		return parsed.message;
	}
	return body.trim();
}

function messageIdsFrom(payload: unknown): string[] {
	if (
		typeof payload !== "object" ||
		payload === null ||
		!("emails" in payload) ||
		!Array.isArray(payload.emails)
	) {
		return [];
	}
	return payload.emails
		.map((entry: unknown) =>
			typeof entry === "object" && entry !== null && "message_id" in entry
				? entry.message_id
				: undefined,
		)
		.filter((id): id is string => typeof id === "string");
}

export function createScalewayClient({
	apiKey,
	projectId,
	retryDelayMs = 250,
	timeoutMs = SEND_TIMEOUT_MS,
}: ScalewayClientConfig): ScalewayClient {
	async function attempt(
		body: string,
		signal: AbortSignal,
	): Promise<SendResult> {
		let response: Response;
		try {
			response = await fetch(ENDPOINT, {
				method: "POST",
				headers: {
					"X-Auth-Token": apiKey,
					"Content-Type": "application/json",
				},
				body,
				signal,
			});
		} catch (cause) {
			// A thrown fetch never reached Scaleway, so there is no status to report.
			return {
				ok: false,
				status: 0,
				error: cause instanceof Error ? cause.message : String(cause),
			};
		}

		// Reading the body can fail on its own — a connection reset mid-stream, or
		// the deadline expiring between the headers and the last chunk. Callers
		// treat sending as best-effort, so that must not escape as a thrown send;
		// the status is already known and is what decides a retry.
		let payload: string;
		try {
			payload = await response.text();
		} catch {
			payload = "";
		}

		if (!response.ok) {
			return {
				ok: false,
				status: response.status,
				error: errorFrom(payload),
			};
		}

		return {
			ok: true,
			messageIds: messageIdsFrom(parseJson(payload)),
		};
	}

	return {
		async send({ from, to, subject, react }) {
			// Scaleway takes html and text; a plaintext part is not optional the way
			// it was with a provider that rendered React itself. Converted from the
			// html rather than rendered a second time — `render(…, { plainText })`
			// is that same conversion applied to its own render of the tree.
			const html = await render(react);
			const text = toPlainText(html);

			const body = JSON.stringify({
				project_id: projectId,
				from,
				to: to.map((email) => ({ email })),
				subject,
				html,
				text,
			});

			const signal = AbortSignal.timeout(timeoutMs);

			let result = await attempt(body, signal);
			for (let n = 2; n <= MAX_ATTEMPTS && !result.ok; n++) {
				if (!isRetryable(result.status)) {
					return result;
				}
				await sleep(retryDelayMs * (n - 1), signal);
				result = await attempt(body, signal);
			}
			return result;
		},
	};
}
