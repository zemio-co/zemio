import { Hono } from "hono";
import { serviceAuth } from "../middleware/service-auth";
import { userAuth } from "../middleware/user-auth";
import { generateReportPdf } from "../services/pdf/service";
import type { AuthVariables } from "../types/context";

const pdf = new Hono<{ Variables: AuthVariables }>();

pdf.post("/report/:id", serviceAuth, userAuth, async (c) => {
	const reportId = c.req.param("id");
	const user = c.get("user");
	const session = c.get("session");
	const member = c.get("member");

	const organizationId = session.activeOrganizationId;
	if (!organizationId) {
		return c.json({ error: "No active organization" }, 403);
	}

	try {
		const result = await generateReportPdf(
			reportId,
			user.id,
			organizationId,
			member.role,
		);
		return c.json(result);
	} catch (err) {
		const status = (err as { status?: number }).status;
		const message = err instanceof Error ? err.message : "Internal server error";
		return c.json(
			{ error: message },
			status === 404 || status === 403 ? status : 500,
		);
	}
});

export default pdf;
