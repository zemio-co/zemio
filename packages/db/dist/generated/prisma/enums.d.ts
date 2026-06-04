export declare const ReportStatus: {
    readonly DRAFT: "DRAFT";
    readonly PENDING_APPROVAL: "PENDING_APPROVAL";
    readonly NEEDS_REVISION: "NEEDS_REVISION";
    readonly ACCEPTED: "ACCEPTED";
    readonly REJECTED: "REJECTED";
};
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];
export declare const ExpenseType: {
    readonly RECEIPT: "RECEIPT";
    readonly TRAVEL: "TRAVEL";
    readonly FOOD: "FOOD";
};
export type ExpenseType = (typeof ExpenseType)[keyof typeof ExpenseType];
export declare const NotificationPreference: {
    readonly ALL: "ALL";
    readonly STATUS_CHANGES: "STATUS_CHANGES";
    readonly NONE: "NONE";
};
export type NotificationPreference = (typeof NotificationPreference)[keyof typeof NotificationPreference];
export declare const LegalAcceptanceType: {
    readonly CHECKBOX_AND_BUTTON: "CHECKBOX_AND_BUTTON";
};
export type LegalAcceptanceType = (typeof LegalAcceptanceType)[keyof typeof LegalAcceptanceType];
//# sourceMappingURL=enums.d.ts.map