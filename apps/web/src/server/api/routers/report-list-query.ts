import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ReportStatus } from "@/generated/prisma/enums";

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
		limit: z.number().int().min(1).max(101).optional(),
		page: z.number().int().min(1),
		pageSize: z.number().int().min(1).max(100),
		sorting: reportListSortingSchema,
	})
	.superRefine((input, ctx) => {
		if (!input.filters) return;

		const ruleCount = countFilterRules(input.filters);
		if (ruleCount > MAX_FILTER_RULES) {
			ctx.addIssue({
				code: "custom",
				message: `Filter tree may contain at most ${MAX_FILTER_RULES} rules`,
				path: ["filters", "rules"],
			});
		}

		const depth = getFilterDepth(input.filters);
		if (depth > MAX_FILTER_DEPTH) {
			ctx.addIssue({
				code: "custom",
				message: `Filter tree may be nested at most ${MAX_FILTER_DEPTH} levels`,
				path: ["filters", "rules"],
			});
		}
	});

type ReportListFilterRule = z.infer<typeof reportListFilterRuleSchema>;

type ReportListFilterGroup = {
	logic: "and" | "or";
	rules: ReportListFilterNode[];
};

type ReportListFilterNode = ReportListFilterGroup | ReportListFilterRule;

type ReportListSorting = z.infer<typeof reportListSortingSchema>;

type ReportListWhereInput = {
	filters?: ReportListFilterGroup;
	organizationId: string;
	userId: string;
};

const reportListFilterGroupSchema: z.ZodType<ReportListFilterGroup> = z.object({
	logic: z.enum(["and", "or"]),
	rules: z.array(z.lazy(() => reportListFilterNodeSchema)).min(1),
});

const reportListFilterNodeSchema: z.ZodType<ReportListFilterNode> = z.lazy(() =>
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
	filters,
	organizationId,
	userId,
}: ReportListWhereInput): Prisma.ReportWhereInput {
	const scope: Prisma.ReportWhereInput = {
		organizationId,
		ownerId: userId,
	};

	if (!filters) {
		return scope;
	}

	return {
		AND: [scope, compileFilterGroup(filters)],
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
	field: "costUnitId" | "title",
	rule: Extract<ReportListFilterRule, { field: "costUnitId" | "title" }>,
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
