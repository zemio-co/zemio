export const ROUTES = {
	// ======= USER SETTINGS ==========================================
	SETTINGS_USER_GENERAL: () => "/settings/user/general",
	SETTINGS_USER_NOTIFICATIONS: () => "/settings/user/notifications",
	SETTINGS_USER_BANK_DETAILS: () => "/settings/user/bank-details",
	// ======= ORGANIZATION SETTINGS ==================================
	SETTINGS_ORG_GENERAL: () => "/settings/org/general",
	SETTINGS_ORG_MEMBERS: () => "/settings/org/members",
	SETTINGS_ORG_ALLOWANCES: () => "/settings/org/allowances",
	SETTINGS_ORG_COST_UNITS: () => "/settings/org/cost-units",
	// ======= ADMIN SETTINGS =========================================
	SETTINGS_ADMIN_ORGS: () => "/settings/admin/orgs",
	SETTINGS_ADMIN_ORG_DETAILS: (id: string) => `/settings/admin/orgs/${id}`,

	ADMIN_REVIEW_REPORT: (reportId: string) => `/admin/review/${reportId}`,
	ADMIN_REVIEW_OVERVIEW: () => "/admin/review",

	USER_REPORTS_LIST: () => "/reports",
	USER_REPORT_DETAILS: (reportId: string) => `/reports/${reportId}`,
	USER_DASHBOARD: () => "/dashboard",
	USER_REPORT_NEW: () => "/reports/new",

	NEW_REPORT: () => "/reports/new",
} as const;
