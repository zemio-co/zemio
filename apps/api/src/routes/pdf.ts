import { Hono } from "hono";
import { serviceAuth } from "../middleware/service-auth";
import { generateReportPdf } from "../services/pdf/service";

const pdf = new Hono();

pdf.post("/report/:id", serviceAuth, async (c) => {
	const reportId = c.req.param("id");
	const userId = c.req.header("X-User-Id");
	const organizationId = c.req.header("X-Organization-Id");
	const memberRole = c.req.header("X-Member-Role");

	if (!userId || !organizationId || !memberRole) {
		return c.json({ error: "Missing user context headers" }, 400);
	}

	try {
		const result = await generateReportPdf(
			reportId,
			userId,
			organizationId,
			memberRole,
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
