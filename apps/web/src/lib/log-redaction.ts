import type { LogFields } from "@zemio/logger";

/** Attribute shape AppSignal accepts: primitives only, no nested values. */
export type LogAttributes = Record<string, string | number | boolean>;

export const REDACTED = "[REDACTED]";

/** Stands in for a value that refers back to something already being written. */
const CYCLE = "[Circular]";

/**
 * Anything shaped like an email address, wherever it appears in free text.
 *
 * Field names are the primary defence; this is the second one. An error thrown
 * by the database or the auth provider routinely quotes the offending value
 * ("no user found for someone@example.com"), and that message is carried by a
 * field called `error`, which no name-based rule would ever catch.
 */
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

/**
 * Splits a field name into lowercase words.
 *
 * `inviteeEmail` → `["invitee", "email"]`, `user_id` → `["user", "id"]`. Words
 * matter because a bare substring test cannot tell `requestingIp` from
 * `zipCode` or `recipient`.
 */
function tokenize(key: string): string[] {
	return key
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.split(/[^a-zA-Z0-9]+/)
		.filter(Boolean)
		.map((token) => token.toLowerCase());
}

/**
 * Whether a field name identifies a natural person.
 *
 * Matched on shape rather than an exact list, because the risk is the call site
 * nobody has written yet: `inviteeEmail`, `memberEmail` and `authorUserId` all
 * name a person as surely as `userId` does, and an exact-match list silently
 * lets each new one through.
 *
 * This is the evidence for the promise that no user identifiers reach the
 * monitoring provider — the counterpart, for logs, of the data-minimisation
 * block in appsignal.cjs. Cited by the legal documents; if you change these
 * rules, update them in the same commit.
 *
 * `organizationId` is deliberately NOT matched: it identifies a customer
 * organization rather than a person, and keeping it is what makes a log line
 * actionable ("which tenant is broken?").
 */
function isUserIdentifier(key: string): boolean {
	const squashed = key.toLowerCase().replace(/[^a-z0-9]/g, "");

	// Substring is right for these: they are distinctive enough that a false
	// positive costs a redacted count field, not a leaked address.
	if (
		squashed.includes("email") ||
		squashed.includes("ipaddress") ||
		squashed.includes("userid") ||
		squashed.includes("username")
	) {
		return true;
	}

	// "ip" needs word matching — as a substring it also hits `recipient`,
	// `description` and `zipCode`.
	return tokenize(key).includes("ip");
}

/** Removes personal data that a name-based rule cannot see. */
function scrubText(value: string): string {
	return value.replace(EMAIL_PATTERN, REDACTED);
}

/**
 * Recursively replaces identifier values inside nested structures.
 *
 * `path` holds the ancestors currently being written, not everything ever seen:
 * an object reached twice as a sibling is written twice, and only a genuine
 * loop back into an ancestor becomes `[Circular]`. A shared `seen` set would
 * mislabel `{a: shared, b: shared}` and quietly drop the second copy.
 */
function redactDeep(value: unknown, path: WeakSet<object>): unknown {
	if (typeof value === "string") {
		return scrubText(value);
	}

	if (value instanceof Error) {
		return { name: value.name, message: scrubText(value.message) };
	}

	// Dates, Maps and Sets carry nothing in `Object.entries`, so walking them as
	// plain objects renders every one of them as an empty `{}`.
	if (value instanceof Date) {
		return value.toISOString();
	}

	if (value !== null && typeof value === "object") {
		if (path.has(value)) {
			return CYCLE;
		}
		path.add(value);
		try {
			if (value instanceof Map) {
				return Object.fromEntries(
					[...value].map(([key, nested]) => [
						String(key),
						isUserIdentifier(String(key)) ? REDACTED : redactDeep(nested, path),
					]),
				);
			}

			if (value instanceof Set) {
				return [...value].map((entry) => redactDeep(entry, path));
			}

			if (Array.isArray(value)) {
				return value.map((entry) => redactDeep(entry, path));
			}

			const result: Record<string, unknown> = {};
			for (const [key, nested] of Object.entries(value)) {
				result[key] = isUserIdentifier(key) ? REDACTED : redactDeep(nested, path);
			}
			return result;
		} finally {
			path.delete(value);
		}
	}

	return value;
}

function toPrimitive(value: unknown): string | number | boolean {
	if (typeof value === "string") {
		return scrubText(value);
	}

	if (typeof value === "number" || typeof value === "boolean") {
		return value;
	}

	if (value instanceof Error) {
		return scrubText(value.message);
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	try {
		return JSON.stringify(redactDeep(value, new WeakSet())) ?? String(value);
	} catch {
		// A getter that throws, or a BigInt, must not take the logging call with
		// it — the caller is usually already reporting a failure.
		return "[Unserializable]";
	}
}

/**
 * Flattens log fields into AppSignal attributes, redacting user identifiers.
 *
 * Absent keys stay absent; a present identifier becomes `[REDACTED]`, which
 * still distinguishes an authenticated request from an anonymous one without
 * naming anyone.
 */
export function toLogAttributes(fields?: LogFields): LogAttributes {
	const attributes: LogAttributes = {};
	if (!fields) {
		return attributes;
	}

	for (const [key, value] of Object.entries(fields)) {
		if (value === undefined || value === null) {
			continue;
		}
		attributes[key] = isUserIdentifier(key) ? REDACTED : toPrimitive(value);
	}

	return attributes;
}
