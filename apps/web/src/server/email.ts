import "server-only";

import {
	createEmailer,
	type EmailAddress,
	type Emailer,
	type SendResult,
} from "@zemio/email";
import type { LogFields } from "@zemio/logger";
import { EMAIL_FROM_HINT, EMAIL_FROM_PATTERN, env } from "@/env";
import { logger } from "@/lib/logger";

/**
 * Splits `EMAIL_FROM` into the shape Scaleway's API expects. Throwing beats
 * falling back to an empty sender: with `SKIP_ENV_VALIDATION` set the schema
 * never checks the format, and a silently empty `from` turns every send into a
 * 400 that is only visible in logs.
 */
function parseSender(value: string): EmailAddress {
	const match = EMAIL_FROM_PATTERN.exec(value);
	if (!match?.[2]) {
		throw new Error(`${EMAIL_FROM_HINT}, got: ${value}`);
	}
	return { name: match[1] ?? "", email: match[2] };
}

/**
 * Resolves an app-relative path against `BETTER_AUTH_URL`. Every link in an
 * email has to be absolute, and the base belongs to the deployment rather than
 * to the template — guessing it from `NODE_ENV` is what sent staging mail to
 * production.
 */
export function absoluteUrl(path: string): string {
	return new URL(path, env.BETTER_AUTH_URL).toString();
}

/**
 * The app's only way to send mail. Cheap to build — the transport holds no
 * connection of its own — so there is nothing worth caching between calls.
 */
export function getEmailer(): Emailer {
	return createEmailer({
		apiKey: env.SCALEWAY_TEM_SECRET_KEY,
		projectId: env.SCALEWAY_TEM_PROJECT_ID,
		from: parseSender(env.EMAIL_FROM),
		appUrl: env.BETTER_AUTH_URL,
	});
}

/**
 * Records the outcome of a send. Scaleway accepts mail for later delivery, so a
 * success here is a queue receipt, not an inbox — the message ids are what makes
 * "I never got it" answerable afterwards.
 */
export function logSend(
	name: string,
	result: SendResult,
	fields: LogFields = {},
): void {
	if (result.ok) {
		logger.info(`${name}_sent`, { ...fields, messageIds: result.messageIds });
		return;
	}
	logger.error(`${name}_failed`, {
		...fields,
		status: result.status,
		error: result.error,
	});
}
