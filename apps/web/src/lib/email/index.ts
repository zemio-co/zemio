import { createResendAdapter } from "./adapters/resend";
import type { EmailAdapter } from "./types/adapter";

const globalForEmail = globalThis as unknown as {
	email: EmailAdapter | undefined;
};

export function getMailer(): EmailAdapter {
	if (!globalForEmail.email) {
		globalForEmail.email = createResendAdapter();
	}
	return globalForEmail.email;
}
