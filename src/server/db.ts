import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "@/env";
import { PrismaClient } from "@/generated/prisma/client";

const createPrismaClient = () => {
	const connectionString = env.DATABASE_URL;

	// const adapter = new PrismaNeon({
	// 	connectionString,
	// });

	// Create a connection pool with proper configuration for serverless
	const pool = new Pool({
		connectionString,
		// Serverless-friendly settings
		max: 1, // Limit to 1 connection per serverless instance
		idleTimeoutMillis: 30000, // Close idle connections after 30s
		connectionTimeoutMillis: 10000, // Timeout connection attempts after 10s
	});

	// Handle errors from idle clients in the pool to prevent process crashes.
	// Without this handler, connection errors during idle periods would be unhandled
	// and crash the Node.js process.
	// pool.on("error", (err) => {
	// 	console.error("Unexpected error on idle database client:", err);
	// });

	const adapter = new PrismaPg(pool);

	return new PrismaClient({
		adapter,
		log: env.NODE_ENV === "development" ? ["error"] : [],
	});
};

const globalForPrisma = globalThis as unknown as {
	prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

// Cache the Prisma client globally in ALL environments to prevent
// connection pool exhaustion in serverless functions
globalForPrisma.prisma = db;
