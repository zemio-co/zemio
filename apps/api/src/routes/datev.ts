import { Hono } from "hono";
import { z } from "zod";
import { serviceAuth } from "../middleware/service-auth";
import { generateBuchungsstapel } from "../services/datev/service";

const datev = new Hono();

const requestSchema = z
	.object({
		periodFrom: z.coerce.date(),
		periodTo: z.coerce.date(),
		// At least one: an empty selection would fall through to the service's
		// "already exported by another export" conflict, which is a caller bug
		// wearing the message of a race. The service checks that the ids and the
		// period actually agree; only their emptiness is decidable here.
		reportIds: z.array(z.string()).min(1),
		// Already folded to header field 9's charset by the caller, which is the
		// side that knows the person. Empty is valid and means the name had
		// nothing writable in it.
		exportiertVon: z.string().max(25),
	})
	.refine((body) => body.periodFrom <= body.periodTo, {
		message: "periodFrom must not be after periodTo",
		path: ["periodFrom"],
	});

datev.post("/buchungsstapel", serviceAuth, async (c) => {
	// Whose books these are. Everything else the file needs travels in the body,
	// "Exportiert von" included: that field may legally be empty, and an empty
	// header value is the kind of thing a proxy drops on the way.
	const organizationId = c.req.header("X-Organization-Id");

	if (!organizationId) {
		return c.json({ error: "Missing organization context header" }, 400);
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
				exportiertVon: parsed.data.exportiertVon,
			}),
		);
	} catch (err) {
		const status = (err as { status?: number }).status;
		const message = err instanceof Error ? err.message : "Internal server error";
		return c.json({ error: message }, status === 409 ? status : 500);
	}
});

export default datev;
