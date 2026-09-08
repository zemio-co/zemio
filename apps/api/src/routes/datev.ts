import { Hono } from "hono";
import { z } from "zod";
import { serviceAuth } from "../middleware/service-auth";
import { generateBuchungsstapel } from "../services/datev/service";

const datev = new Hono();

const requestSchema = z
	.object({
		periodFrom: z.coerce.date(),
		periodTo: z.coerce.date(),
		reportIds: z.array(z.string()).min(1),
	})
	.refine((body) => body.periodFrom <= body.periodTo, {
		message: "periodFrom must not be after periodTo",
		path: ["periodFrom"],
	});

datev.post("/buchungsstapel", serviceAuth, async (c) => {
	const organizationId = c.req.header("X-Organization-Id");
	const exportedBy = c.req.header("X-Exported-By") ?? "";

	if (!organizationId) {
		return c.json({ error: "Missing user context headers" }, 400);
	}

	const parsed = requestSchema.safeParse(await c.req.json().catch(() => null));
	if (!parsed.success) {
		return c.json({ error: "Invalid request body" }, 400);
	}

	try {
		return c.json(
			await generateBuchungsstapel({
				organizationId,
				periodFrom: parsed.data.periodFrom,
				periodTo: parsed.data.periodTo,
				reportIds: parsed.data.reportIds,
				exportedBy,
			}),
		);
	} catch (err) {
		const status = (err as { status?: number }).status;
		const message = err instanceof Error ? err.message : "Internal server error";
		return c.json({ error: message }, status === 409 ? status : 500);
	}
});

export default datev;
