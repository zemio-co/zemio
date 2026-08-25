import type { CostUnitStatus } from "@zemio/db";

export const ROUTES = {
	USER_DASHBOARD: "/",
	AUTH: "/auth",
	ACCEPT_INVITATION: (id: string) => `/accept-invitation/${id}`,
	REPORT_DETAIL: (id: string) => `/reports/${id}`,
	ADMIN_DASHBOARD: "/admin",
	ADMIN_SETTINGS: "/admin/settings",
	USER_SETTINGS: "/preferences",
	PLATFORM_ADMIN_ORGANIZATIONS: "/platform-admin/organizations",
};

export const ADMIN_SETTINGS_MENU = {
	GENERAL: "/admin/settings",
	USERS: "/admin/settings/users",
	ALLOWANCES: "/admin/settings/allowances",
	COST_UNITS: "/admin/settings/cost-units",
};

/**
 * Value used in select inputs to represent "no group" selection for cost units
 */
export const NO_COST_UNIT_GROUP = "NO_GROUP" as const;

/**
 * Page size for the cost units grid. The server page prefetches with it and the
 * grid queries with it; a mismatch silently misses the cache.
 *
 * It lives here rather than next to the grid because the grid module is
 * `"use client"`, and Next replaces *every* named export of a client module
 * with a client reference in the server graph — the page would import a
 * function proxy instead of the number.
 */
export const COST_UNITS_PAGE_SIZE = 20;

/**
 * Cost unit columns the list endpoint can order by. Shared by the tRPC input
 * schema and the grid so the two can't drift; it lives here rather than in the
 * server module because importing that module client-side would pull the Prisma
 * client into the browser bundle.
 *
 * `examples` is absent deliberately — it is an array length, which Postgres
 * cannot order by without a computed column.
 */
export const COST_UNIT_SORT_FIELDS = [
	"tag",
	"title",
	"status",
	"group",
	"createdAt",
] as const;

export type CostUnitSortField = (typeof COST_UNIT_SORT_FIELDS)[number];

/**
 * The `CostUnitStatus` enum spelled out as literals. `satisfies` ties it to the
 * schema at compile time without importing the enum as a value, which would
 * also drag Prisma into the client bundle.
 */
export const COST_UNIT_STATUSES = [
	"ACTIVE",
	"ARCHIVED",
] as const satisfies readonly CostUnitStatus[];
