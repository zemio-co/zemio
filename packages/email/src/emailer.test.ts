import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmailer } from "./emailer";

const CONFIG = {
	apiKey: "test-secret-key",
	projectId: "test-project-id",
	from: { name: "zemio", email: "noreply@send.zemio.co" },
	appUrl: "https://staging.zemio.co",
};

let fetchMock: ReturnType<typeof vi.fn>;

function sentPayload() {
	const [, init] = fetchMock.mock.calls[0] ?? [];
	return JSON.parse(init.body);
}

beforeEach(() => {
	fetchMock = vi.fn(
		() =>
			new Response(
				JSON.stringify({ emails: [{ id: "email-1", message_id: "message-1" }] }),
				{ status: 200 },
			),
	);
	vi.stubGlobal("fetch", fetchMock);
});

describe("createEmailer", () => {
	it("sends the report-received mail to the reviewer", async () => {
		const result = await createEmailer(CONFIG).sendReportReceived({
			to: "reviewer@example.de",
			title: "Dienstreise Berlin",
			submittedBy: "Markus Müller",
			reportUrl: "https://staging.zemio.co/admin/reports/report-1",
		});

		expect(result).toEqual({ ok: true, messageIds: ["message-1"] });
		const payload = sentPayload();
		expect(payload.subject).toBe("Neuer Spesenbericht eingegangen");
		expect(payload.to).toEqual([{ email: "reviewer@example.de" }]);
		expect(payload.from).toEqual(CONFIG.from);
		expect(payload.html).toContain(
			"https://staging.zemio.co/admin/reports/report-1",
		);
		expect(payload.html).toContain("Markus Müller");
		expect(payload.text.trim()).not.toBe("");
	});

	it("sends the report-submitted confirmation to the owner", async () => {
		await createEmailer(CONFIG).sendReportSubmitted({
			to: "owner@example.de",
			name: "Markus",
			title: "Dienstreise Berlin",
		});

		const payload = sentPayload();
		expect(payload.subject).toBe("Spesenbericht eingereicht");
		expect(payload.to).toEqual([{ email: "owner@example.de" }]);
		expect(payload.html).toContain("Dienstreise Berlin");
		expect(payload.text.trim()).not.toBe("");
	});

	it("sends the status-changed mail with the label the caller resolved", async () => {
		await createEmailer(CONFIG).sendStatusChanged({
			to: "owner@example.de",
			name: "Markus",
			title: "Dienstreise Berlin",
			statusLabel: "Angenommen",
			reportUrl: "https://staging.zemio.co/reports/report-1",
		});

		const payload = sentPayload();
		expect(payload.subject).toBe("Status deines Spesenberichts geändert");
		expect(payload.html).toContain("Angenommen");
		expect(payload.html).toContain("https://staging.zemio.co/reports/report-1");
		expect(payload.text.trim()).not.toBe("");
	});

	it("sends the invitation mail with the organization in the subject", async () => {
		await createEmailer(CONFIG).sendOrgInvitation({
			to: "invited@example.de",
			organizationName: "Move e.V.",
			inviterName: "Markus Müller",
			acceptUrl: "https://staging.zemio.co/accept-invitation/invitation-1",
		});

		const payload = sentPayload();
		expect(payload.subject).toBe("Einladung zu Move e.V.");
		expect(payload.html).toContain(
			"https://staging.zemio.co/accept-invitation/invitation-1",
		);
		expect(payload.html).toContain("Markus Müller");
		expect(payload.text.trim()).not.toBe("");
	});

	it("resolves email assets against the configured app url", async () => {
		await createEmailer(CONFIG).sendReportSubmitted({
			to: "owner@example.de",
			name: "Markus",
			title: "Dienstreise Berlin",
		});

		expect(sentPayload().html).toContain(
			"https://staging.zemio.co/assets/zemio-logo-woodmark.png",
		);
	});
});
