export interface SendEmailOptions {
	from: string;
	to: string[];
	subject: string;
	react?: React.ReactNode;
	html?: string;
	text?: string;
}

export interface EmailAdapter {
	send(
		options: SendEmailOptions,
	): Promise<
		{ ok: true; status: number } | { ok: false; status: number; error: string }
	>;
}
