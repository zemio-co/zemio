import { logger } from "@/lib/logger";
import { getEmailer, logSend } from "@/server/email";

/**
 * Confirming that an address belongs to the person using it.
 *
 * Microsoft's tokens carry no `email_verified` claim and its documentation says
 * the address "isn't guaranteed to be correct" and must never be used for
 * authorization — so the proof has to come from Zemio, and this is where it is
 * asked for (ADR-0008).
 */
export async function sendEmailVerification(args: {
	to: string;
	verifyUrl: string;
}): Promise<void> {
	// Best-effort, like every other send: the token exists either way and the
	// mail can be requested again. Better Auth awaits this hook, so a throw —
	// a misconfigured sender, a template fault — would take down the very
	// login that triggered it.
	try {
		const result = await getEmailer().sendEmailVerification({
			to: args.to,
			verifyUrl: args.verifyUrl,
		});
		logSend("email.verification", result);
	} catch (error) {
		logger.error("email.verification_failed", { error });
	}
}
