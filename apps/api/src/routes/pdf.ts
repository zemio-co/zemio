import { Hono } from "hono";
import { serviceAuth } from "../middleware/service-auth";
import { generateReportingPdf } from "../services/pdf/reporting";
import { reportingPdfRequestSchema } from "../services/pdf/reporting.validators";
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

pdf.post("/reporting", serviceAuth, async (c) => {
	const userId = c.req.header("X-User-Id");
	const organizationId = c.req.header("X-Organization-Id");
	const memberRole = c.req.header("X-Member-Role");

	if (!userId || !organizationId || !memberRole) {
		return c.json({ error: "Missing user context headers" }, 400);
	}

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	const parsed = reportingPdfRequestSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid request body" }, 400);
	}

	try {
		const result = await generateReportingPdf(
			organizationId,
			memberRole,
			parsed.data,
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
