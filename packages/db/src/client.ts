import type { PrismaClient } from "./generated/prisma/client";

const g = globalThis as unknown as { __zemio_db: PrismaClient | undefined };

export function createDbClient(create: () => PrismaClient): PrismaClient {
	if (!g.__zemio_db) {
		g.__zemio_db = create();
	}
	return g.__zemio_db;
}
