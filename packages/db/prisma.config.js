// Plain JS version used by the Docker runner container.
// Locally, prisma.config.ts takes precedence (Prisma 7 searches .ts first).
export default {
	schema: "prisma/schema.prisma",
	migrations: {
		path: "prisma/migrations",
	},
	datasource: {
		url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
	},
};
