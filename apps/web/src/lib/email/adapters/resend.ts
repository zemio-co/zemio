// ================================================
// Resend Email Adapter
// ================================================

import { Resend } from "resend";
import z from "zod";
import type { EmailAdapter } from "../types/adapter";

const resendAdapterConfigSchema = z.object({
	RESEND_API_KEY: z.string().min(1),
});

export function createResendAdapter(): EmailAdapter {
	const { RESEND_API_KEY } = process.env;

	const validationResult = resendAdapterConfigSchema.safeParse({
		RESEND_API_KEY,
	});

	if (!validationResult.success) {
		throw new Error(
			`Invalid Resend adapter configuration: ${validationResult.error.message}`,
		);
	}

	const { data } = validationResult;

	const resend = new Resend(data.RESEND_API_KEY);

	return {
		async send({ from, to, subject, react, html, text }) {
			// No need to render the content here, Resend handles that automatically
			const { error } = await resend.emails.send({
				from,
				to,
				subject,
				react,
				html,
				text,
			});

			if (error) {
				return {
					ok: false,
					error: error.message,
					status: error.statusCode ?? 500,
				};
			}

			return {
				ok: true,
				status: 200,
			};
		},
	};
}
