import { beforeEach, describe, expect, it, vi } from "vitest";

const { envMock } = vi.hoisted(() => ({
	envMock: { APPSIGNAL_FRONTEND_KEY: "fe_real_key" as string | undefined },
}));
vi.mock("@/env", () => ({ env: envMock }));

const { POST } = await import("./route");

function reportRequest(
	body = '{"error":"boom"}',
	init: RequestInit & { url?: string } = {},
) {
	const { url = "https://zemio.test/api/monitoring?version=1.6.1", ...rest } =
		init;
	return new Request(url, { method: "POST", body, ...rest });
}

describe("the AppSignal browser tunnel", () => {
	beforeEach(() => {
		envMock.APPSIGNAL_FRONTEND_KEY = "fe_real_key";
		vi.restoreAllMocks();
	});

	it("relays the report to AppSignal and answers 204", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(new Response(null, { status: 200 }));

		const response = await POST(reportRequest());

		expect(response.status).toBe(204);
		const [target, init] = fetchMock.mock.calls[0] ?? [];
		expect(String(target)).toContain("https://appsignal-endpoint.net/collect");
		expect(init?.body).toBe('{"error":"boom"}');
	});

	it("never forwards the caller's IP headers", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(new Response(null, { status: 200 }));

		await POST(
			reportRequest('{"error":"boom"}', {
				headers: {
					"x-forwarded-for": "203.0.113.7",
					"x-real-ip": "203.0.113.7",
					forwarded: "for=203.0.113.7",
					cookie: "session=secret",
				},
			}),
		);

		const forwarded = JSON.stringify(fetchMock.mock.calls[0]?.[1]?.headers);
		expect(forwarded).not.toContain("203.0.113.7");
		expect(forwarded).not.toContain("session=secret");
	});

	it("uses our own key, not one supplied by the caller", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(new Response(null, { status: 200 }));

		await POST(
			reportRequest('{"error":"boom"}', {
				url: "https://zemio.test/api/monitoring?api_key=someone_elses_key",
			}),
		);

		const target = String(fetchMock.mock.calls[0]?.[0]);
		expect(target).toContain("api_key=fe_real_key");
		expect(target).not.toContain("someone_elses_key");
	});

	it("refuses a version string that is not one", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(new Response(null, { status: 200 }));

		await POST(
			reportRequest('{"error":"boom"}', {
				url: "https://zemio.test/api/monitoring?version=%26api_key%3Devil",
			}),
		);

		const target = String(fetchMock.mock.calls[0]?.[0]);
		expect(target).not.toContain("evil");
		expect(target).toContain("api_key=fe_real_key");
	});

	it("offers no endpoint when AppSignal is not configured", async () => {
		envMock.APPSIGNAL_FRONTEND_KEY = undefined;
		const fetchMock = vi.spyOn(globalThis, "fetch");

		const response = await POST(reportRequest());

		expect(response.status).toBe(404);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("refuses a body past the cap instead of relaying it", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch");

		const response = await POST(
			reportRequest("x".repeat(64 * 1024 + 1), {
				headers: { "content-length": String(64 * 1024 + 1) },
			}),
		);

		expect(response.status).toBe(413);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("swallows an unreachable collector rather than failing in the browser", async () => {
		vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));

		const response = await POST(reportRequest());

		expect(response.status).toBe(502);
	});
});
