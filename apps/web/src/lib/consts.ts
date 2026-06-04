export const ROUTES = {
	USER_DASHBOARD: "/",
	AUTH: "/auth",
	ONBOARDING: "/onboarding",
	NO_ORG: "/no-org",
	ACCEPT_INVITATION: (id: string) => `/accept-invitation/${id}`,
	REPORT_DETAIL: (id: string) => `/reports/${id}`,
	REPORT_NEW: "/reports/new",
	ADMIN_DASHBOARD: "/admin",
	ADMIN_SETTINGS: "/admin/settings",
	USER_SETTINGS: "/preferences",
	PLATFORM_ADMIN_ORGANIZATIONS: "/platform-admin/organizations",
};

export const DEFAULT_EMAIL_FROM = "zemio <noreply@mail.zemio.co>";

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
