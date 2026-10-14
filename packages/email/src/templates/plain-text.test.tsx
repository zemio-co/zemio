import { expect, it, vi } from "vitest";
import { createEmailer } from "../emailer";

const CONFIG = {
	apiKey: "test-secret-key",
	projectId: "test-project-id",
	from: { name: "zemio", email: "noreply@send.zemio.co" },
	appUrl: "https://staging.zemio.co",
};

/**
 * The plaintext part is derived from the rendered html rather than rendered a
 * second time, so it is worth pinning that nothing structural leaks into it —
 * a doctype or a tag reaching the text part is invisible until a recipient
 * whose client prefers plaintext reads it.
 */
it.each([
	[
		"report-received",
		(emailer: ReturnType<typeof createEmailer>) =>
			emailer.sendReportReceived({
				to: "reviewer@example.de",
				title: "Dienstreise Berlin",
				submittedBy: "Markus Müller",
				reportUrl: "https://staging.zemio.co/admin/reports/r1",
			}),
	],
	[
		"report-submitted",
		(emailer: ReturnType<typeof createEmailer>) =>
			emailer.sendReportSubmitted({
				to: "owner@example.de",
				name: "Markus",
				title: "Dienstreise Berlin",
			}),
	],
	[
		"status-changed",
		(emailer: ReturnType<typeof createEmailer>) =>
			emailer.sendStatusChanged({
				to: "owner@example.de",
				name: "Markus",
				title: "Dienstreise Berlin",
				statusLabel: "Angenommen",
				reportUrl: "https://staging.zemio.co/reports/r1",
			}),
	],
	[
		"org-invitation",
		(emailer: ReturnType<typeof createEmailer>) =>
			emailer.sendOrgInvitation({
				to: "invited@example.de",
				organizationName: "Move e.V.",
				inviterName: "Markus Müller",
				acceptUrl: "https://staging.zemio.co/accept-invitation/i1",
			}),
	],
])("sends %s with a clean plaintext part", async (_name, send) => {
	const fetchMock = vi.fn();
	fetchMock.mockImplementation(
		() => new Response(JSON.stringify({ emails: [] }), { status: 200 }),
	);
	vi.stubGlobal("fetch", fetchMock);

	await send(createEmailer(CONFIG));

	const [, init] = fetchMock.mock.calls[0] ?? [];
	const { text } = JSON.parse(init.body);
	expect(text.trim()).not.toBe("");
	expect(text).not.toContain("DOCTYPE");
	expect(text).not.toMatch(/<[a-z/]/i);
	expect(text).toContain("zemio");
});
