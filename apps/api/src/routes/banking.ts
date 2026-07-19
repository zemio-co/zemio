import { Hono } from "hono";
import { serviceAuth } from "../middleware/service-auth";
import { getBicForIban } from "../services/banking/iban-to-bic";
import { isValidIban } from "../services/banking/validate-iban";

const banking = new Hono();

banking.get("/iban/:iban", serviceAuth, async (c) => {
	// The IBAN arrives URL-decoded by Hono; callers must strip formatting
	// whitespace (or percent-encode it) before building the request path.
	const iban = c.req.param("iban");

	if (!isValidIban(iban)) {
		return c.json({ valid: false, error: "Invalid IBAN" }, 400);
	}

	const bic = getBicForIban(iban) ?? null;

	return c.json({ valid: true, bic });
});

export default banking;
