import { Hono } from "hono";
import { env } from "./env";
import { logger } from "./lib/logger";
import routes from "./routes";

const app = new Hono();

app.route("/", routes);

app.get("/health", (c) => c.json({ status: "ok" }));

Bun.serve({
	port: env.PORT,
	fetch: app.fetch,
});

logger.info(`API server started on port ${env.PORT}`);
