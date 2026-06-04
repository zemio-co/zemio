import { PrismaPg } from "@prisma/adapter-pg";
import { createDbClient, PrismaClient } from "@zemio/db";
import { env } from "../env";

export const db = createDbClient(
	() =>
		new PrismaClient({
			adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
		}),
);
