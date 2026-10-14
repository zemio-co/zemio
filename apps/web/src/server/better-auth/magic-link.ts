import { logger } from "@/lib/logger";
import { getEmailer, logSend } from "@/server/email";

/**
 * Signing in with nothing but an address.
 *
 * The link is the proof: whoever opens it read the mailbox, which is the same
 * thing {@link sendEmailVerification} asks for. So a magic-link sign-in marks
 * the address verified, and someone who arrives this way never sees the
 * confirmation step (ADR-0008).
 */
export async function sendMagicLinkEmail(args: {
	to: string;
	signInUrl: string;
}): Promise<void> {
	// Best-effort, like every other send. Better Auth awaits this hook, so a
	// throw — a misconfigured sender, a template fault — would answer the
	// sign-in request with a 500 and tell somebody their address was rejected.
	try {
		const result = await getEmailer().sendMagicLink({
			to: args.to,
			signInUrl: args.signInUrl,
		});
		logSend("email.magic_link", result);
	} catch (error) {
		logger.error("email.magic_link_failed", { error });
	}
}
