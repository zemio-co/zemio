import { createMockDb, type MockPrismaClient } from "@zemio/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { organizationRepository } from "./organization.repository";

let db: MockPrismaClient;

beforeEach(() => {
	db = createMockDb();
});

describe("organizationRepository.findById / findDetailById / listAll", () => {
	it("findById looks up by id", async () => {
		db.organization.findUnique.mockResolvedValue(null);

		await organizationRepository.findById(db, "org_1");

		expect(db.organization.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: "org_1" } }),
		);
	});

	it("findDetailById looks up by id", async () => {
		db.organization.findUnique.mockResolvedValue(null);

		await organizationRepository.findDetailById(db, "org_1");

		expect(db.organization.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: "org_1" } }),
		);
	});

	it("listAll has no tenant filter — it is a platform-scoped query", async () => {
		db.organization.findMany.mockResolvedValue([]);

		await organizationRepository.listAll(db);

		const call = db.organization.findMany.mock.calls[0]?.[0];
		expect(call).not.toHaveProperty("where");
	});
});

describe("organizationRepository.findConflictingSlug", () => {
	it("checks the slug alone when no id is excluded", async () => {
		db.organization.findFirst.mockResolvedValue(null);

		await organizationRepository.findConflictingSlug(db, { slug: "acme" });

		expect(db.organization.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: { slug: "acme" } }),
		);
	});

	it("excludes the given id when checking the slug", async () => {
		db.organization.findFirst.mockResolvedValue(null);

		await organizationRepository.findConflictingSlug(db, {
			slug: "acme",
			excludeId: "org_1",
		});

		expect(db.organization.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { slug: "acme", NOT: { id: "org_1" } },
			}),
		);
	});
});

describe("organizationRepository.create", () => {
	it("generates an id and createdAt, and passes the given fields through", async () => {
		db.organization.create.mockResolvedValue({ joiningRules: [] } as never);

		await organizationRepository.create(db, {
			name: "Acme",
			slug: "acme",
			microsoftTenantId: "TENANT_1",
		});

		const call = db.organization.create.mock.calls[0]?.[0];
		expect(call?.data).toMatchObject({ name: "Acme", slug: "acme" });
		expect(typeof call?.data.id).toBe("string");
		expect(call?.data.createdAt).toBeInstanceOf(Date);
	});

	it("opens the organization to the given tenant, lowercased", async () => {
		db.organization.create.mockResolvedValue({ joiningRules: [] } as never);

		await organizationRepository.create(db, {
			name: "Acme",
			slug: "acme",
			microsoftTenantId: "TENANT_1",
		});

		const call = db.organization.create.mock.calls[0]?.[0];
		expect(call?.data.joiningRules).toEqual({
			create: [{ type: "MS_TENANT", value: "tenant_1", mode: "AUTO_JOIN" }],
		});
	});

	it("creates no rule when no tenant is given", async () => {
		// A self-created organization is invite-only. Seeding a tenant rule from
		// whoever happened to create it would open its expense and banking data
		// to everyone in their university without them choosing it.
		db.organization.create.mockResolvedValue({ joiningRules: [] } as never);

		await organizationRepository.create(db, {
			name: "Acme",
			slug: "acme",
			microsoftTenantId: null,
		});

		const call = db.organization.create.mock.calls[0]?.[0];
		expect(call?.data).not.toHaveProperty("joiningRules");
	});

	it("reports the tenant back as a flat field", async () => {
		db.organization.create.mockResolvedValue({
			id: "org_1",
			joiningRules: [{ value: "tenant_1" }],
		} as never);

		const row = await organizationRepository.create(db, {
			name: "Acme",
			slug: "acme",
			microsoftTenantId: "tenant_1",
		});

		expect(row).toMatchObject({ microsoftTenantId: "tenant_1" });
		expect(row).not.toHaveProperty("joiningRules");
	});
});

describe("organizationRepository.update", () => {
	it("updates by id with the given data", async () => {
		db.organization.update.mockResolvedValue({ joiningRules: [] } as never);

		await organizationRepository.update(db, {
			id: "org_1",
			data: { name: "Renamed" },
		});

		expect(db.organization.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "org_1" },
				data: { name: "Renamed" },
			}),
		);
	});

	it("leaves the tenant rule alone when no tenant is passed", async () => {
		// An organization admin renaming their organization must not silently
		// drop the rule its members are resolved by.
		db.organization.update.mockResolvedValue({ joiningRules: [] } as never);

		await organizationRepository.update(db, {
			id: "org_1",
			data: { name: "Renamed" },
		});

		expect(db.joiningRule.deleteMany).not.toHaveBeenCalled();
		expect(db.$transaction).not.toHaveBeenCalled();
	});

	it("replaces the tenant rule when a tenant is passed", async () => {
		db.$transaction.mockResolvedValue([
			null,
			null,
			{ joiningRules: [{ value: "tenant_2" }] },
		] as never);

		await organizationRepository.update(db, {
			id: "org_1",
			data: { name: "Renamed" },
			microsoftTenantId: "TENANT_2",
		});

		expect(db.joiningRule.deleteMany).toHaveBeenCalledWith({
			where: { organizationId: "org_1", type: "MS_TENANT" },
		});
		expect(db.joiningRule.createMany).toHaveBeenCalledWith({
			data: [
				{
					organizationId: "org_1",
					type: "MS_TENANT",
					value: "tenant_2",
					mode: "AUTO_JOIN",
				},
			],
		});
	});

	it("removes the tenant rule when the tenant is cleared", async () => {
		db.$transaction.mockResolvedValue([
			null,
			null,
			{ joiningRules: [] },
		] as never);

		await organizationRepository.update(db, {
			id: "org_1",
			data: { name: "Renamed" },
			microsoftTenantId: null,
		});

		expect(db.joiningRule.deleteMany).toHaveBeenCalled();
		expect(db.joiningRule.createMany).toHaveBeenCalledWith({ data: [] });
	});
});
