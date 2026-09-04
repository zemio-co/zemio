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
	SETTINGS_ORG_BILLING: () => "/settings/org/billing",
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
	AUTH_MAGIC_LINK_SENT: (email?: string) =>
		`/auth/magic-link-sent${email && `?email=${email}`}`,

	// ======= ONBOARDING =============================================
	// The flow itself, plus the page for somebody who has already been
	// through it and belongs to nothing right now. They show the same two
	// things to two different populations, which is why they share a shell
	// and not a guard.
	ONBOARDING: () => "/onboarding",
	ONBOARDING_VERIFY_EMAIL: () => "/onboarding/verify-email",
	ONBOARDING_NAME: () => "/onboarding/name",
	ONBOARDING_ORGANIZATION: () => "/onboarding/organization",
	ONBOARDING_ORGANIZATION_NEW: () => "/onboarding/organization/new",
	ONBOARDING_INVITE: () => "/onboarding/invite",
	ONBOARDING_TRIAL: () => "/onboarding/trial",
	ONBOARDING_NO_ORG: () => "/onboarding/no-org",

	ACCEPT_INVITATION: (id: string) => `/accept-invitation/${id}`,

	LEGAL_TERMS_AND_CONDITIONS: () => "/legal/terms-and-conditions",
	LEGAL_PRIVACY_POLICY: () => "/legal/privacy-policy",
	LEGAL_PLATFORM_POLICIES: () => "/legal/platform-policies",
	LEGAL_IMPRINT: () => "/legal/imprint",
} as const;
