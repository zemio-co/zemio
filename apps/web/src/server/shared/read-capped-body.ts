/**
 * Reads a request body as text, giving up past `maxBytes`.
 *
 * The declared length is checked first because it is free, but it is not
 * trusted: a chunked request carries no `content-length`, so the read is capped
 * as it goes too. Returns `null` when the body is too large to consider.
 *
 * Route handlers have no body limit of their own, so any endpoint that reads a
 * body before it can authenticate the caller needs this — otherwise an
 * anonymous request can pin arbitrarily much memory.
 */
export async function readCappedBody(
	request: Request,
	maxBytes: number,
): Promise<string | null> {
	const declared = Number(request.headers.get("content-length"));
	if (Number.isFinite(declared) && declared > maxBytes) return null;

	const reader = request.body?.getReader();
	if (!reader) return "";

	const decoder = new TextDecoder();
	let body = "";
	let size = 0;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.length;
		if (size > maxBytes) {
			await reader.cancel();
			return null;
		}
		// Decoded as it arrives, so the bytes are never held twice. Streaming
		// matters here: a multi-byte character split across two chunks would
		// otherwise decode to a replacement character and fail verification.
		body += decoder.decode(value, { stream: true });
	}

	return body + decoder.decode();
}
