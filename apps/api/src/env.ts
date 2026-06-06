import { z } from "zod";

const schema = z.object({
	PORT: z.coerce.number().default(3001),
	DATABASE_URL: z.string().url(),
	INTERNAL_API_SECRET: z.string().min(32),
	SECRET_ENCRYPTION_KEY: z.string(),
	STORAGE_HOST: z.string(),
	STORAGE_REGION: z.string(),
	STORAGE_BUCKET: z.string(),
	STORAGE_ACCESS_KEY_ID: z.string(),
	STORAGE_ACCESS_KEY: z.string(),
	STORAGE_SECURE: z
		.string()
		.transform((v) => v !== "false")
		.default("true"),
	STORAGE_FORCE_PATH_STYLE: z
		.string()
		.transform((v) => v === "true")
		.default("false"),
});

const result = schema.safeParse(process.env);

if (!result.success) {
	console.error(
		"Invalid environment variables:",
		result.error.flatten().fieldErrors,
	);
	process.exit(1);
}

export const env = result.data;
