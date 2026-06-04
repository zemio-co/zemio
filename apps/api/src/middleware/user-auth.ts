import { createMiddleware } from "hono/factory";
import { db } from "../lib/db";
import type { AuthVariables } from "../types/context";

export const userAuth = createMiddleware<{ Variables: AuthVariables }>(
	async (c, next) => {
		const authorization = c.req.header("Authorization");
		const token = authorization?.startsWith("Bearer ")
			? authorization.slice(7)
			: null;

		if (!token) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const session = await db.session.findUnique({
			where: { token },
			include: { user: true },
		});

		if (!session || session.expiresAt < new Date()) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		if (!session.activeOrganizationId) {
			return c.json({ error: "No active organization" }, 403);
		}

		const member = await db.member.findFirst({
			where: {
				userId: session.userId,
				organizationId: session.activeOrganizationId,
			},
		});

		if (!member) {
			return c.json({ error: "Forbidden" }, 403);
		}

		c.set("session", session);
		c.set("user", session.user);
		c.set("member", member);

		await next();
	},
);
