import { env } from "@/env";
import { createResendAdapter } from "./adapters/resend";
import type { EmailAdapter } from "./types/adapter";

function createMailer(): EmailAdapter {
	return createResendAdapter();
}

const globalForEmail = globalThis as unknown as {
	email: EmailAdapter | undefined;
};

export const mailer = globalForEmail.email ?? createMailer();

if (env.NODE_ENV !== "production") globalForEmail.email = mailer;
