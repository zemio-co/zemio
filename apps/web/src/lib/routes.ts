export const ROUTES = {
	SETTINGS: () => "/settings",

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

	ADMIN_REPORTING: () => "/admin/reporting",

	ADMIN_REVIEW_REPORT: (reportId: string) => `/admin/reports/${reportId}`,
	ADMIN_REVIEW_OVERVIEW: () => "/admin/reports",

	USER_REPORTS_LIST: () => "/reports",
	USER_REPORT_DETAILS: (reportId: string) => `/reports/${reportId}`,
	USER_DASHBOARD: () => "/",

	AUTH: () => "/auth",

	LEGAL_TERMS_AND_CONDITIONS: () => "/legal/terms-and-conditions",
	LEGAL_PRIVACY_POLICY: () => "/legal/privacy-policy",
	LEGAL_PLATFORM_POLICIES: () => "/legal/platform-policies",
} as const;
