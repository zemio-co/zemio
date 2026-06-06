import { createMiddleware } from "hono/factory";
import { env } from "../env";

export const serviceAuth = createMiddleware(async (c, next) => {
	const key = c.req.header("X-Service-Key");
	if (key !== env.INTERNAL_API_SECRET) {
		return c.json({ error: "Unauthorized" }, 401);
	}
	await next();
});
