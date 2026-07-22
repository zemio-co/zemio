import type { Prisma } from "@zemio/db";
import { ReportStatus } from "@zemio/db";
import { z } from "zod";

const MAX_FILTER_RULES = 50;
const MAX_FILTER_DEPTH = 3;

const reportStatusValueSchema = z.nativeEnum(ReportStatus);
const nonEmptyStringSchema = z.string().trim().min(1);
const nonEmptyStringArraySchema = z.array(nonEmptyStringSchema).min(1);
const reportStatusArraySchema = z.array(reportStatusValueSchema).min(1);
const numberArraySchema = z.array(z.number().int()).min(1);

const dateRangeSchema = z
	.object({
		end: z.coerce.date(),
		start: z.coerce.date(),
	})
	.refine((range) => range.start <= range.end, {
		message: "Date range start must be before or equal to end",
		path: ["end"],
	});

const numberRangeSchema = z
	.object({
		max: z.number().int(),
		min: z.number().int(),
	})
	.refine((range) => range.min <= range.max, {
		message: "Number range min must be before or equal to max",
		path: ["max"],
	});

const statusSingleFilterSchema = z.object({
	field: z.literal("status"),
	op: z.enum(["is", "isNot"]),
	value: reportStatusValueSchema,
});

const statusArrayFilterSchema = z.object({
	field: z.literal("status"),
	op: z.enum(["in", "notIn"]),
	value: reportStatusArraySchema,
});

const titleSingleFilterSchema = z.object({
	field: z.literal("title"),
	op: z.enum(["is", "isNot"]),
	value: nonEmptyStringSchema,
});

const titleArrayFilterSchema = z.object({
	field: z.literal("title"),
	op: z.enum(["in", "notIn"]),
	value: nonEmptyStringArraySchema,
});

const costUnitSingleFilterSchema = z.object({
	field: z.literal("costUnitId"),
	op: z.enum(["is", "isNot"]),
	value: nonEmptyStringSchema,
});

const costUnitArrayFilterSchema = z.object({
	field: z.literal("costUnitId"),
	op: z.enum(["in", "notIn"]),
	value: nonEmptyStringArraySchema,
});

const ownerSingleFilterSchema = z.object({
	field: z.literal("ownerId"),
	op: z.enum(["is", "isNot"]),
	value: nonEmptyStringSchema,
});

const ownerArrayFilterSchema = z.object({
	field: z.literal("ownerId"),
	op: z.enum(["in", "notIn"]),
	value: nonEmptyStringArraySchema,
});

const tagSingleFilterSchema = z.object({
	field: z.literal("tag"),
	op: z.enum(["eq", "gt", "lt"]),
	value: z.number().int(),
});

const tagArrayFilterSchema = z.object({
	field: z.literal("tag"),
	op: z.enum(["in", "notIn"]),
	value: numberArraySchema,
});

const tagRangeFilterSchema = z.object({
	field: z.literal("tag"),
	op: z.enum(["between", "notBetween"]),
	value: numberRangeSchema,
});

const createdAtRangeFilterSchema = z.object({
	field: z.literal("createdAt"),
	op: z.enum(["between", "notBetween"]),
	value: dateRangeSchema,
});

const lastUpdatedAtRangeFilterSchema = z.object({
	field: z.literal("lastUpdatedAt"),
	op: z.enum(["between", "notBetween"]),
	value: dateRangeSchema,
});

const reportListFilterRuleSchema = z.union([
	statusSingleFilterSchema,
	statusArrayFilterSchema,
	titleSingleFilterSchema,
	titleArrayFilterSchema,
	costUnitSingleFilterSchema,
	costUnitArrayFilterSchema,
	ownerSingleFilterSchema,
	ownerArrayFilterSchema,
	tagSingleFilterSchema,
	tagArrayFilterSchema,
	tagRangeFilterSchema,
	createdAtRangeFilterSchema,
	lastUpdatedAtRangeFilterSchema,
]);

const reportListSortingSchema = z
	.array(
		z.object({
			desc: z.boolean(),
			id: z.enum(["createdAt", "lastUpdatedAt", "status", "tag", "title"]),
		}),
	)
	.max(1)
	.optional();

export const reportListInputSchema = z
	.object({
		filters: z.lazy(() => reportListFilterGroupSchema).optional(),
		scope: z.enum(["own", "all"]).default("own"),
		page: z.number().int().min(1),
		pageSize: z.number().int().min(1).max(100),
		sorting: reportListSortingSchema,
	})
	.superRefine((input, ctx) => checkFilterGroupLimits(input.filters, ctx));

/**
 * Enforces the same rule-count/nesting-depth limits on any schema embedding
 * `reportListFilterGroupSchema` — shared so callers other than the report list
 * (e.g. reporting) don't accept unbounded filter trees.
 */
export function checkFilterGroupLimits(
	filters: ReportListFilterGroup | undefined,
	ctx: z.RefinementCtx,
): void {
	if (!filters) return;

	const ruleCount = countFilterRules(filters);
	if (ruleCount > MAX_FILTER_RULES) {
		ctx.addIssue({
			code: "custom",
			message: `Filter tree may contain at most ${MAX_FILTER_RULES} rules`,
			path: ["filters", "rules"],
		});
	}

	const depth = getFilterDepth(filters);
	if (depth > MAX_FILTER_DEPTH) {
		ctx.addIssue({
			code: "custom",
			message: `Filter tree may be nested at most ${MAX_FILTER_DEPTH} levels`,
			path: ["filters", "rules"],
		});
	}
}

export type ReportListInput = z.infer<typeof reportListInputSchema>;

type ReportListFilterRule = z.infer<typeof reportListFilterRuleSchema>;
/** True pre-coercion input type — differs from the output above wherever a
 * rule value goes through `z.coerce.date()` (`dateRangeSchema`). */
type ReportListFilterRuleInput = z.input<typeof reportListFilterRuleSchema>;

export type ReportListFilterGroup = {
	logic: "and" | "or";
	rules: ReportListFilterNode[];
};

export type ReportListFilterGroupInput = {
	logic: "and" | "or";
	rules: ReportListFilterNodeInput[];
};

type ReportListFilterNode = ReportListFilterGroup | ReportListFilterRule;
type ReportListFilterNodeInput =
	| ReportListFilterGroupInput
	| ReportListFilterRuleInput;

type ReportListSorting = z.infer<typeof reportListSortingSchema>;

/**
 * Whose reports the list should return:
 * - `own`: the requesting user's reports (owner views)
 * - `all`: every report in the org (admin views; the policy must permit it)
 */
export type ReportListScope = "own" | "all";

type ReportListWhereInput = {
	scope: ReportListScope;
	filters?: ReportListFilterGroup;
	organizationId: string;
	userId: string;
};

// Zod v4's `ZodType<Output, Input, Internals>` no longer defaults `Input` to
// `Output` (unlike v3) — both type args must be supplied explicitly, or the
// schema's inferred input type (what tRPC uses for the client-side argument
// type) silently collapses to `unknown`. The two types genuinely differ here
// because of `dateRangeSchema`'s `z.coerce.date()`.
export const reportListFilterGroupSchema: z.ZodType<
	ReportListFilterGroup,
	ReportListFilterGroupInput
> = z.object({
	logic: z.enum(["and", "or"]),
	rules: z.array(z.lazy(() => reportListFilterNodeSchema)).min(1),
});

const reportListFilterNodeSchema: z.ZodType<
	ReportListFilterNode,
	ReportListFilterNodeInput
> = z.lazy(() =>
	z.union([reportListFilterRuleSchema, reportListFilterGroupSchema]),
);

function isFilterGroup(
	node: ReportListFilterNode,
): node is ReportListFilterGroup {
	return "rules" in node;
}

function countFilterRules(group: ReportListFilterGroup): number {
	return group.rules.reduce((count, rule) => {
		if (!isFilterGroup(rule)) {
			return count + 1;
		}

		return count + countFilterRules(rule);
	}, 0);
}

function getFilterDepth(group: ReportListFilterGroup): number {
	const childDepths = group.rules.map((rule) => {
		if (!isFilterGroup(rule)) {
			return 1;
		}

		return 1 + getFilterDepth(rule);
	});

	return Math.max(...childDepths);
}

export function buildReportListWhere({
	scope,
	filters,
	organizationId,
	userId,
}: ReportListWhereInput): Prisma.ReportWhereInput {
	const base: Prisma.ReportWhereInput =
		scope === "own"
			? { organizationId, ownerId: userId }
			: { organizationId, status: { not: ReportStatus.DRAFT } };

	if (!filters) {
		return base;
	}

	return {
		AND: [base, compileFilterGroup(filters)],
	};
}

export function buildReportListOrderBy(
	sorting: ReportListSorting,
): Prisma.ReportOrderByWithRelationInput {
	const sort = sorting?.[0];

	if (!sort) {
		return { createdAt: "desc" };
	}

	return {
		[sort.id]: sort.desc ? "desc" : "asc",
	};
}

function compileFilterGroup(
	group: ReportListFilterGroup,
): Prisma.ReportWhereInput {
	const rules = group.rules.map((rule) => {
		if (isFilterGroup(rule)) {
			return compileFilterGroup(rule);
		}

		return compileFilterRule(rule);
	});

	if (group.logic === "and") {
		return { AND: rules };
	}

	return { OR: rules };
}

function compileFilterRule(
	rule: ReportListFilterRule,
): Prisma.ReportWhereInput {
	switch (rule.field) {
		case "costUnitId":
			return compileStringFilter("costUnitId", rule);
		case "ownerId":
			return compileStringFilter("ownerId", rule);
		case "createdAt":
			return compileDateFilter("createdAt", rule);
		case "lastUpdatedAt":
			return compileDateFilter("lastUpdatedAt", rule);
		case "status":
			return compileStatusFilter(rule);
		case "tag":
			return compileTagFilter(rule);
		case "title":
			return compileStringFilter("title", rule);
	}
}

function compileStatusFilter(
	rule: Extract<ReportListFilterRule, { field: "status" }>,
): Prisma.ReportWhereInput {
	switch (rule.op) {
		case "in":
			return { status: { in: rule.value } };
		case "is":
			return { status: rule.value };
		case "isNot":
			return { status: { not: rule.value } };
		case "notIn":
			return { status: { notIn: rule.value } };
	}
}

function compileStringFilter(
	field: "costUnitId" | "title" | "ownerId",
	rule: Extract<
		ReportListFilterRule,
		{ field: "costUnitId" | "title" | "ownerId" }
	>,
): Prisma.ReportWhereInput {
	switch (rule.op) {
		case "in":
			return { [field]: { in: rule.value } };
		case "is":
			return { [field]: rule.value };
		case "isNot":
			return { [field]: { not: rule.value } };
		case "notIn":
			return { [field]: { notIn: rule.value } };
	}
}

function compileTagFilter(
	rule: Extract<ReportListFilterRule, { field: "tag" }>,
): Prisma.ReportWhereInput {
	switch (rule.op) {
		case "between":
			return { tag: { gte: rule.value.min, lte: rule.value.max } };
		case "eq":
			return { tag: rule.value };
		case "gt":
			return { tag: { gt: rule.value } };
		case "in":
			return { tag: { in: rule.value } };
		case "lt":
			return { tag: { lt: rule.value } };
		case "notBetween":
			return {
				OR: [{ tag: { lt: rule.value.min } }, { tag: { gt: rule.value.max } }],
			};
		case "notIn":
			return { tag: { notIn: rule.value } };
	}
}

function compileDateFilter(
	field: "createdAt" | "lastUpdatedAt",
	rule: Extract<ReportListFilterRule, { field: "createdAt" | "lastUpdatedAt" }>,
): Prisma.ReportWhereInput {
	switch (rule.op) {
		case "between":
			return { [field]: { gte: rule.value.start, lte: rule.value.end } };
		case "notBetween":
			return {
				OR: [
					{ [field]: { lt: rule.value.start } },
					{ [field]: { gt: rule.value.end } },
				],
			};
	}
}
