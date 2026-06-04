import { PrismaNeon } from "@prisma/adapter-neon";
import { createDbClient, PrismaClient } from "@zemio/db";
import { env } from "@/env";

export const db = createDbClient(
	() =>
		new PrismaClient({
			adapter: new PrismaNeon({ connectionString: env.DATABASE_URL }),
			log: env.NODE_ENV === "development" ? ["error"] : [],
		}),
);
