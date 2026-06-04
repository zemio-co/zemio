import { PrismaClient } from "./generated/prisma/client";
const g = globalThis;
export function createDbClient(create) {
    if (!g.__zemio_db) {
        g.__zemio_db = create();
    }
    return g.__zemio_db;
}
