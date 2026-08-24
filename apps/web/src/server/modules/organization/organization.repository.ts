import type { Prisma, PrismaClient } from "@zemio/db";

type Db = PrismaClient;

/**
 * The platform admin manages a single Microsoft tenant per organization. That
 * is no longer a column — it is one `MS_TENANT` joining rule — so every read
 * selects the rule and flattens it back to `microsoftTenantId`, and every write
 * goes the other way. The admin API keeps the shape its forms are written
 * against; the storage is the one the resolver reads.
 */
const tenantRuleSelect = {
	where: { type: "MS_TENANT" as const },
	select: { value: true },
	take: 1,
} satisfies Prisma.Organization$joiningRulesArgs;

type WithTenantRule = { joiningRules: { value: string }[] };

/**
 * The rule that opens an organization to a Microsoft tenant.
 *
 * One definition for both writes: a create nests it, an update inserts it, and
 * a tenant lowercased on one path and not the other would resolve for some
 * people and not others.
 */
function tenantRule(value: string) {
	return {
		type: "MS_TENANT",
		value: value.toLowerCase(),
		mode: "AUTO_JOIN",
	} as const;
}

function flattenTenant<T extends WithTenantRule>(
	row: T,
): Omit<T, "joiningRules"> & { microsoftTenantId: string | null } {
	const { joiningRules, ...rest } = row;
	return { ...rest, microsoftTenantId: joiningRules[0]?.value ?? null };
}

const organizationSelect = {
	id: true,
	name: true,
	slug: true,
	logo: true,
	metadata: true,
	joiningRules: tenantRuleSelect,
	createdAt: true,
} satisfies Prisma.OrganizationSelect;

export type OrganizationRow = ReturnType<
	typeof flattenTenant<
		Prisma.OrganizationGetPayload<{ select: typeof organizationSelect }>
	>
>;

/** Platform-admin detail view: the org plus its settings, members and invites. */
const organizationDetailSelect = {
	id: true,
	name: true,
	slug: true,
	logo: true,
	metadata: true,
	joiningRules: tenantRuleSelect,
	createdAt: true,
	settings: {
		select: {
			id: true,
			reviewerEmail: true,
			kilometerRate: true,
			costUnitInfoUrl: true,
			dailyFoodAllowance: true,
			breakfastDeduction: true,
			lunchDeduction: true,
			dinnerDeduction: true,
			updatedAt: true,
		},
	},
	members: {
		orderBy: [{ role: "asc" }, { createdAt: "asc" }],
		select: {
			id: true,
			role: true,
			createdAt: true,
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					image: true,
					role: true,
					microsoftTenantId: true,
				},
			},
		},
	},
	invitations: {
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			email: true,
			role: true,
			status: true,
			expiresAt: true,
			createdAt: true,
			inviter: { select: { id: true, name: true, email: true } },
		},
	},
	_count: {
		select: {
			members: true,
			invitations: true,
			reports: true,
			costUnits: true,
			costUnitGroups: true,
		},
	},
} satisfies Prisma.OrganizationSelect;

const organizationSummarySelect = {
	id: true,
	name: true,
	slug: true,
	joiningRules: tenantRuleSelect,
	createdAt: true,
	_count: { select: { members: true } },
} satisfies Prisma.OrganizationSelect;

export type OrganizationDetail = ReturnType<
	typeof flattenTenant<
		Prisma.OrganizationGetPayload<{ select: typeof organizationDetailSelect }>
	>
>;

export type OrganizationSummary = ReturnType<
	typeof flattenTenant<
		Prisma.OrganizationGetPayload<{ select: typeof organizationSummarySelect }>
	>
>;

export const organizationRepository = {
	async findById(db: Db, id: string): Promise<OrganizationRow | null> {
		const row = await db.organization.findUnique({
			where: { id },
			select: organizationSelect,
		});

		return row && flattenTenant(row);
	},

	/** Platform scope: every organization, no tenant filter. */
	async listAll(db: Db): Promise<OrganizationSummary[]> {
		const rows = await db.organization.findMany({
			orderBy: { createdAt: "asc" },
			select: organizationSummarySelect,
		});

		return rows.map(flattenTenant);
	},

	async findDetailById(db: Db, id: string): Promise<OrganizationDetail | null> {
		const row = await db.organization.findUnique({
			where: { id },
			select: organizationDetailSelect,
		});

		return row && flattenTenant(row);
	},

	/** Returns the id of a different org already holding `slug`, if any. */
	findConflictingSlug(
		db: Db,
		args: { slug: string; excludeId?: string },
	): Promise<{ id: string } | null> {
		return db.organization.findFirst({
			where: {
				slug: args.slug,
				...(args.excludeId ? { NOT: { id: args.excludeId } } : {}),
			},
			select: { id: true },
		});
	},

	/**
	 * Creates an organization and, when a tenant is given, the rule that opens
	 * it to that tenant. One statement, so an organization is never briefly
	 * visible without the rule its members are resolved by.
	 */
	async create(
		db: Db,
		args: { name: string; slug: string; microsoftTenantId: string | null },
	): Promise<OrganizationRow> {
		const row = await db.organization.create({
			data: {
				id: crypto.randomUUID(),
				name: args.name,
				slug: args.slug,
				createdAt: new Date(),
				...(args.microsoftTenantId
					? { joiningRules: { create: [tenantRule(args.microsoftTenantId)] } }
					: {}),
			},
			select: organizationSelect,
		});

		return flattenTenant(row);
	},

	/**
	 * Updates the organization's profile, and its tenant rule when one is given.
	 *
	 * `microsoftTenantId` follows Prisma's own convention: omit it to leave the
	 * rule alone, pass `null` to remove it. Only the platform admin passes it —
	 * an organization admin renaming their organization must not silently drop
	 * the rule its members are resolved by.
	 *
	 * When it is given the rule is replaced rather than edited: there is at most
	 * one, and delete-then-insert expresses "set it" and "clear it" without a
	 * three-branch upsert. Both happen with the profile update in one
	 * transaction, so an organization is never briefly open to a tenant its
	 * profile no longer names.
	 */
	async update(
		db: Db,
		args: {
			id: string;
			data: Prisma.OrganizationUpdateInput;
			microsoftTenantId?: string | null;
		},
	): Promise<OrganizationRow> {
		if (args.microsoftTenantId === undefined) {
			const row = await db.organization.update({
				where: { id: args.id },
				data: args.data,
				select: organizationSelect,
			});

			return flattenTenant(row);
		}

		const tenantId = args.microsoftTenantId;

		const [, , row] = await db.$transaction([
			db.joiningRule.deleteMany({
				where: { organizationId: args.id, type: "MS_TENANT" },
			}),
			db.joiningRule.createMany({
				data: tenantId
					? [{ organizationId: args.id, ...tenantRule(tenantId) }]
					: [],
			}),
			db.organization.update({
				where: { id: args.id },
				data: args.data,
				select: organizationSelect,
			}),
		]);

		return flattenTenant(row);
	},
} as const;

export type OrganizationRepository = typeof organizationRepository;
