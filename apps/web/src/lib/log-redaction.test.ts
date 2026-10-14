import { describe, expect, it } from "vitest";
import { REDACTED, toLogAttributes } from "./log-redaction";

describe("toLogAttributes", () => {
	it("redacts user identifiers at the top level", () => {
		expect(toLogAttributes({ userId: "user_1" })).toEqual({ userId: REDACTED });
	});

	it("matches identifier keys case-insensitively", () => {
		expect(toLogAttributes({ UserID: "user_1", Email: "a@b.c" })).toEqual({
			UserID: REDACTED,
			Email: REDACTED,
		});
	});

	it("keeps organizationId — it identifies a tenant, not a person", () => {
		expect(toLogAttributes({ organizationId: "org_1" })).toEqual({
			organizationId: "org_1",
		});
	});

	it("redacts identifiers nested inside objects", () => {
		const result = toLogAttributes({ ctx: { userId: "user_1", ok: true } });
		expect(result.ctx).toBe(JSON.stringify({ userId: REDACTED, ok: true }));
	});

	it("redacts identifiers nested inside arrays", () => {
		const result = toLogAttributes({ members: [{ userId: "user_1" }] });
		expect(result.members).toBe(JSON.stringify([{ userId: REDACTED }]));
	});

	it("drops absent values rather than emitting a redaction marker", () => {
		expect(toLogAttributes({ userId: undefined, ok: true })).toEqual({
			ok: true,
		});
	});

	it("preserves primitives unchanged", () => {
		expect(toLogAttributes({ path: "read", durationMs: 12, ok: false })).toEqual({
			path: "read",
			durationMs: 12,
			ok: false,
		});
	});

	it("reduces an Error to its message", () => {
		expect(toLogAttributes({ error: new Error("boom") })).toEqual({
			error: "boom",
		});
	});

	it("survives a reference cycle instead of overflowing the stack", () => {
		const node: Record<string, unknown> = { userId: "user_1", ok: true };
		node.self = node;

		expect(toLogAttributes({ node })).toEqual({
			node: JSON.stringify({
				userId: REDACTED,
				ok: true,
				self: "[Circular]",
			}),
		});
	});

	it("returns an empty object when there are no fields", () => {
		expect(toLogAttributes()).toEqual({});
	});
	it("redacts identifier variants, not just the exact names", () => {
		expect(
			toLogAttributes({
				inviteeEmail: "a@b.c",
				memberEmail: "x@y.z",
				authorUserId: "user_9",
				requestingIp: "203.0.113.5",
				user_id: "user_1",
				ipAddress: "198.51.100.4",
			}),
		).toEqual({
			inviteeEmail: REDACTED,
			memberEmail: REDACTED,
			authorUserId: REDACTED,
			requestingIp: REDACTED,
			user_id: REDACTED,
			ipAddress: REDACTED,
		});
	});

	it("leaves field names that merely look similar alone", () => {
		expect(
			toLogAttributes({
				recipientId: "r_1",
				description: "a note",
				zipCode: "50667",
				organizationId: "org_1",
				reportId: "rep_1",
			}),
		).toEqual({
			recipientId: "r_1",
			description: "a note",
			zipCode: "50667",
			organizationId: "org_1",
			reportId: "rep_1",
		});
	});

	it("scrubs an address out of an error message", () => {
		expect(
			toLogAttributes({ error: new Error("No user found for a@example.com") }),
		).toEqual({ error: `No user found for ${REDACTED}` });
	});

	it("scrubs an address out of any free text, not just errors", () => {
		expect(toLogAttributes({ detail: "invited b@example.com" })).toEqual({
			detail: `invited ${REDACTED}`,
		});
	});

	it("writes a shared object twice rather than calling it circular", () => {
		const shared = { id: "shared" };
		const result = toLogAttributes({ pair: { a: shared, b: shared } });
		expect(result.pair).toBe(JSON.stringify({ a: shared, b: shared }));
	});

	it("still breaks a genuine cycle", () => {
		const loop: Record<string, unknown> = { name: "loop" };
		loop.self = loop;
		expect(String(toLogAttributes({ loop }).loop)).toContain("[Circular]");
	});

	it("keeps a Date readable instead of collapsing it to {}", () => {
		const when = new Date("2026-08-19T10:00:00.000Z");
		expect(toLogAttributes({ when })).toEqual({
			when: "2026-08-19T10:00:00.000Z",
		});
		expect(toLogAttributes({ nested: { when } }).nested).toBe(
			JSON.stringify({ when: "2026-08-19T10:00:00.000Z" }),
		);
	});

	it("renders Maps and Sets instead of collapsing them to {}", () => {
		expect(toLogAttributes({ m: new Map([["k", "v"]]) }).m).toBe(
			JSON.stringify({ k: "v" }),
		);
		expect(toLogAttributes({ s: new Set([1, 2]) }).s).toBe(
			JSON.stringify([1, 2]),
		);
	});

	it("redacts identifier keys inside a Map too", () => {
		expect(toLogAttributes({ m: new Map([["userId", "user_1"]]) }).m).toBe(
			JSON.stringify({ userId: REDACTED }),
		);
	});

	it("survives a value that cannot be serialised", () => {
		const hostile = {
			get boom() {
				throw new Error("nope");
			},
		};
		expect(toLogAttributes({ hostile }).hostile).toBe("[Unserializable]");
	});
});
