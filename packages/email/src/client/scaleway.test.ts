import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createScalewayClient } from "./scaleway";

const FROM = { name: "zemio", email: "noreply@send.zemio.co" };

function client() {
	return createScalewayClient({
		apiKey: "test-secret-key",
		projectId: "test-project-id",
		retryDelayMs: 0,
	});
}

function send() {
	return client().send({
		from: FROM,
		to: ["empfaenger@example.de"],
		subject: "Ein Betreff mit Laenge",
		react: createElement("p", null, "Hallo Welt"),
	});
}

function accepted(messageId = "message-1") {
	return new Response(
		JSON.stringify({ emails: [{ id: "email-1", message_id: messageId }] }),
		{ status: 200 },
	);
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
	fetchMock = vi.fn();
	vi.stubGlobal("fetch", fetchMock);
});

describe("createScalewayClient", () => {
	it("posts to the fr-par transactional email endpoint", async () => {
		fetchMock.mockResolvedValue(accepted());

		await send();

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] ?? [];
		expect(url).toBe(
			"https://api.scaleway.com/transactional-email/v1alpha1/regions/fr-par/emails",
		);
		expect(init.method).toBe("POST");
		expect(init.headers["X-Auth-Token"]).toBe("test-secret-key");
		expect(init.headers["Content-Type"]).toBe("application/json");
	});

	it("sends the payload shape Scaleway requires", async () => {
		fetchMock.mockResolvedValue(accepted());

		await send();

		const [, init] = fetchMock.mock.calls[0] ?? [];
		const body = JSON.parse(init.body);
		expect(body.project_id).toBe("test-project-id");
		expect(body.from).toEqual(FROM);
		expect(body.to).toEqual([{ email: "empfaenger@example.de" }]);
		expect(body.subject).toBe("Ein Betreff mit Laenge");
		expect(body.html).toContain("Hallo Welt");
		expect(body.text.trim()).toBe("Hallo Welt");
	});

	it("returns the message ids of accepted mail", async () => {
		fetchMock.mockResolvedValue(accepted("message-abc"));

		await expect(send()).resolves.toEqual({
			ok: true,
			messageIds: ["message-abc"],
		});
	});

	it("retries a 500 and succeeds on the next attempt", async () => {
		fetchMock
			.mockResolvedValueOnce(new Response("boom", { status: 500 }))
			.mockResolvedValueOnce(accepted());

		await expect(send()).resolves.toEqual({
			ok: true,
			messageIds: ["message-1"],
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("retries a 429", async () => {
		fetchMock
			.mockResolvedValueOnce(new Response("slow down", { status: 429 }))
			.mockResolvedValueOnce(accepted());

		await expect(send()).resolves.toMatchObject({ ok: true });
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("gives up after three attempts", async () => {
		// A fresh Response per call: a body can only be read once.
		fetchMock.mockImplementation(() => new Response("boom", { status: 503 }));

		await expect(send()).resolves.toEqual({
			ok: false,
			status: 503,
			error: "boom",
		});
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it("does not retry a rejected request", async () => {
		fetchMock.mockImplementation(
			() =>
				new Response(JSON.stringify({ message: "subject is too short" }), {
					status: 400,
				}),
		);

		await expect(send()).resolves.toEqual({
			ok: false,
			status: 400,
			error: "subject is too short",
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("reports an accepted send with an unreadable body instead of throwing", async () => {
		// A proxy answering 200 with something other than JSON must not escape as
		// an exception: every caller treats sending as best-effort.
		fetchMock.mockImplementation(
			() => new Response("<html>gateway</html>", { status: 200 }),
		);

		await expect(send()).resolves.toEqual({ ok: true, messageIds: [] });
	});

	it("does not retry a transport failure, which may already have been accepted", async () => {
		fetchMock.mockRejectedValue(new TypeError("fetch failed"));

		await expect(send()).resolves.toEqual({
			ok: false,
			status: 0,
			error: "fetch failed",
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("holds every attempt to a single deadline", async () => {
		// One signal across all attempts: a per-attempt timeout would let the
		// retry count multiply the wait the timeout exists to bound.
		fetchMock.mockImplementation(() => new Response("boom", { status: 503 }));

		await send();

		const signals = fetchMock.mock.calls.map(([, init]) => init.signal);
		expect(signals).toHaveLength(3);
		expect(new Set(signals).size).toBe(1);
	});

	it("abandons an attempt that never answers", async () => {
		// A request that stays pending until the deadline fires, the way an
		// unresponsive endpoint behaves.
		fetchMock.mockImplementation(
			(_url: string, init: RequestInit) =>
				new Promise((_resolve, reject) => {
					init.signal?.addEventListener("abort", () =>
						reject(new Error("The operation was aborted due to timeout")),
					);
				}),
		);

		const result = await createScalewayClient({
			apiKey: "test-secret-key",
			projectId: "test-project-id",
			retryDelayMs: 0,
			timeoutMs: 25,
		}).send({
			from: FROM,
			to: ["empfaenger@example.de"],
			subject: "Ein Betreff mit Laenge",
			react: createElement("p", null, "Hallo Welt"),
		});

		expect(result).toEqual({
			ok: false,
			status: 0,
			error: "The operation was aborted due to timeout",
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("does not let the backoff outlive the deadline", async () => {
		// A retryable status with a backoff far longer than the deadline: the wait
		// has to end when the deadline does, not when the timer does.
		fetchMock.mockImplementation(() => new Response("boom", { status: 503 }));

		const started = Date.now();
		const result = await createScalewayClient({
			apiKey: "test-secret-key",
			projectId: "test-project-id",
			retryDelayMs: 30_000,
			timeoutMs: 25,
		}).send({
			from: FROM,
			to: ["empfaenger@example.de"],
			subject: "Ein Betreff mit Laenge",
			react: createElement("p", null, "Hallo Welt"),
		});

		expect(result.ok).toBe(false);
		expect(Date.now() - started).toBeLessThan(5_000);
	});
});
