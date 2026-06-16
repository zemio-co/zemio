import z from "zod";

export const attachmentInputSchema = z.object({
	key: z
		.string()
		.regex(/^attachment\/[^/]+\/[^/]+$/, "Invalid attachment key format"),
	size: z
		.number()
		.int()
		.nonnegative()
		.transform((n) => BigInt(n)),
	originalName: z.string().min(1),
});
