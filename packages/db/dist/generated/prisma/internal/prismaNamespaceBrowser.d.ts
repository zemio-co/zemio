import * as runtime from "@prisma/client/runtime/index-browser";
export type * from '../models';
export type * from './prismaNamespace';
export declare const Decimal: typeof runtime.Decimal;
export declare const NullTypes: {
    DbNull: (new (secret: never) => typeof runtime.DbNull);
    JsonNull: (new (secret: never) => typeof runtime.JsonNull);
    AnyNull: (new (secret: never) => typeof runtime.AnyNull);
};
/**
 * Helper for filtering JSON entries that have `null` on the database (empty on the db)
 *
 * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
 */
export declare const DbNull: import("@prisma/client/runtime/client").DbNullClass;
/**
 * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
 *
 * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
 */
export declare const JsonNull: import("@prisma/client/runtime/client").JsonNullClass;
/**
 * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
 *
 * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
 */
export declare const AnyNull: import("@prisma/client/runtime/client").AnyNullClass;
export declare const ModelName: {
    readonly Report: "Report";
    readonly Expense: "Expense";
    readonly Attachment: "Attachment";
    readonly User: "User";
    readonly Session: "Session";
    readonly Account: "Account";
    readonly Verification: "Verification";
    readonly Organization: "Organization";
    readonly Member: "Member";
    readonly Invitation: "Invitation";
    readonly Preferences: "Preferences";
    readonly LegalAcceptance: "LegalAcceptance";
    readonly Settings: "Settings";
    readonly CostUnitGroup: "CostUnitGroup";
    readonly CostUnit: "CostUnit";
    readonly BankingDetails: "BankingDetails";
};
export type ModelName = (typeof ModelName)[keyof typeof ModelName];
export declare const TransactionIsolationLevel: {
    readonly ReadUncommitted: "ReadUncommitted";
    readonly ReadCommitted: "ReadCommitted";
    readonly RepeatableRead: "RepeatableRead";
    readonly Serializable: "Serializable";
};
export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel];
export declare const ReportScalarFieldEnum: {
    readonly id: "id";
    readonly tag: "tag";
    readonly title: "title";
    readonly description: "description";
    readonly status: "status";
    readonly organizationId: "organizationId";
    readonly costUnitId: "costUnitId";
    readonly ownerId: "ownerId";
    readonly bankingDetailsId: "bankingDetailsId";
    readonly createdAt: "createdAt";
    readonly lastUpdatedAt: "lastUpdatedAt";
};
export type ReportScalarFieldEnum = (typeof ReportScalarFieldEnum)[keyof typeof ReportScalarFieldEnum];
export declare const ExpenseScalarFieldEnum: {
    readonly id: "id";
    readonly description: "description";
    readonly amount: "amount";
    readonly startDate: "startDate";
    readonly endDate: "endDate";
    readonly type: "type";
    readonly meta: "meta";
    readonly reportId: "reportId";
};
export type ExpenseScalarFieldEnum = (typeof ExpenseScalarFieldEnum)[keyof typeof ExpenseScalarFieldEnum];
export declare const AttachmentScalarFieldEnum: {
    readonly id: "id";
    readonly key: "key";
    readonly size: "size";
    readonly originalName: "originalName";
    readonly createdAt: "createdAt";
    readonly updatedAt: "updatedAt";
    readonly expenseId: "expenseId";
};
export type AttachmentScalarFieldEnum = (typeof AttachmentScalarFieldEnum)[keyof typeof AttachmentScalarFieldEnum];
export declare const UserScalarFieldEnum: {
    readonly id: "id";
    readonly name: "name";
    readonly email: "email";
    readonly emailVerified: "emailVerified";
    readonly image: "image";
    readonly createdAt: "createdAt";
    readonly updatedAt: "updatedAt";
    readonly role: "role";
    readonly microsoftTenantId: "microsoftTenantId";
    readonly banned: "banned";
    readonly banReason: "banReason";
    readonly banExpires: "banExpires";
};
export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum];
export declare const SessionScalarFieldEnum: {
    readonly id: "id";
    readonly expiresAt: "expiresAt";
    readonly token: "token";
    readonly createdAt: "createdAt";
    readonly updatedAt: "updatedAt";
    readonly ipAddress: "ipAddress";
    readonly userAgent: "userAgent";
    readonly userId: "userId";
    readonly impersonatedBy: "impersonatedBy";
    readonly activeOrganizationId: "activeOrganizationId";
    readonly legalAcceptedAt: "legalAcceptedAt";
    readonly legalAcceptedReleaseVersion: "legalAcceptedReleaseVersion";
};
export type SessionScalarFieldEnum = (typeof SessionScalarFieldEnum)[keyof typeof SessionScalarFieldEnum];
export declare const AccountScalarFieldEnum: {
    readonly id: "id";
    readonly accountId: "accountId";
    readonly providerId: "providerId";
    readonly userId: "userId";
    readonly accessToken: "accessToken";
    readonly refreshToken: "refreshToken";
    readonly idToken: "idToken";
    readonly accessTokenExpiresAt: "accessTokenExpiresAt";
    readonly refreshTokenExpiresAt: "refreshTokenExpiresAt";
    readonly scope: "scope";
    readonly password: "password";
    readonly createdAt: "createdAt";
    readonly updatedAt: "updatedAt";
};
export type AccountScalarFieldEnum = (typeof AccountScalarFieldEnum)[keyof typeof AccountScalarFieldEnum];
export declare const VerificationScalarFieldEnum: {
    readonly id: "id";
    readonly identifier: "identifier";
    readonly value: "value";
    readonly expiresAt: "expiresAt";
    readonly createdAt: "createdAt";
    readonly updatedAt: "updatedAt";
};
export type VerificationScalarFieldEnum = (typeof VerificationScalarFieldEnum)[keyof typeof VerificationScalarFieldEnum];
export declare const OrganizationScalarFieldEnum: {
    readonly id: "id";
    readonly name: "name";
    readonly slug: "slug";
    readonly logo: "logo";
    readonly metadata: "metadata";
    readonly createdAt: "createdAt";
    readonly microsoftTenantId: "microsoftTenantId";
};
export type OrganizationScalarFieldEnum = (typeof OrganizationScalarFieldEnum)[keyof typeof OrganizationScalarFieldEnum];
export declare const MemberScalarFieldEnum: {
    readonly id: "id";
    readonly userId: "userId";
    readonly organizationId: "organizationId";
    readonly role: "role";
    readonly createdAt: "createdAt";
};
export type MemberScalarFieldEnum = (typeof MemberScalarFieldEnum)[keyof typeof MemberScalarFieldEnum];
export declare const InvitationScalarFieldEnum: {
    readonly id: "id";
    readonly email: "email";
    readonly inviterId: "inviterId";
    readonly organizationId: "organizationId";
    readonly role: "role";
    readonly status: "status";
    readonly expiresAt: "expiresAt";
    readonly createdAt: "createdAt";
};
export type InvitationScalarFieldEnum = (typeof InvitationScalarFieldEnum)[keyof typeof InvitationScalarFieldEnum];
export declare const PreferencesScalarFieldEnum: {
    readonly id: "id";
    readonly userId: "userId";
    readonly notifications: "notifications";
};
export type PreferencesScalarFieldEnum = (typeof PreferencesScalarFieldEnum)[keyof typeof PreferencesScalarFieldEnum];
export declare const LegalAcceptanceScalarFieldEnum: {
    readonly id: "id";
    readonly userId: "userId";
    readonly releaseVersion: "releaseVersion";
    readonly acceptanceType: "acceptanceType";
    readonly acceptedAt: "acceptedAt";
    readonly documentVersions: "documentVersions";
};
export type LegalAcceptanceScalarFieldEnum = (typeof LegalAcceptanceScalarFieldEnum)[keyof typeof LegalAcceptanceScalarFieldEnum];
export declare const SettingsScalarFieldEnum: {
    readonly id: "id";
    readonly organizationId: "organizationId";
    readonly kilometerRate: "kilometerRate";
    readonly reviewerEmail: "reviewerEmail";
    readonly costUnitInfoUrl: "costUnitInfoUrl";
    readonly createdAt: "createdAt";
    readonly updatedAt: "updatedAt";
    readonly dailyFoodAllowance: "dailyFoodAllowance";
    readonly breakfastDeduction: "breakfastDeduction";
    readonly lunchDeduction: "lunchDeduction";
    readonly dinnerDeduction: "dinnerDeduction";
};
export type SettingsScalarFieldEnum = (typeof SettingsScalarFieldEnum)[keyof typeof SettingsScalarFieldEnum];
export declare const CostUnitGroupScalarFieldEnum: {
    readonly id: "id";
    readonly title: "title";
    readonly organizationId: "organizationId";
    readonly createdAt: "createdAt";
    readonly updatedAt: "updatedAt";
};
export type CostUnitGroupScalarFieldEnum = (typeof CostUnitGroupScalarFieldEnum)[keyof typeof CostUnitGroupScalarFieldEnum];
export declare const CostUnitScalarFieldEnum: {
    readonly id: "id";
    readonly tag: "tag";
    readonly title: "title";
    readonly examples: "examples";
    readonly organizationId: "organizationId";
    readonly createdAt: "createdAt";
    readonly updatedAt: "updatedAt";
    readonly costUnitGroupId: "costUnitGroupId";
};
export type CostUnitScalarFieldEnum = (typeof CostUnitScalarFieldEnum)[keyof typeof CostUnitScalarFieldEnum];
export declare const BankingDetailsScalarFieldEnum: {
    readonly id: "id";
    readonly title: "title";
    readonly iban: "iban";
    readonly fullName: "fullName";
    readonly userId: "userId";
    readonly createdAt: "createdAt";
    readonly updatedAt: "updatedAt";
};
export type BankingDetailsScalarFieldEnum = (typeof BankingDetailsScalarFieldEnum)[keyof typeof BankingDetailsScalarFieldEnum];
export declare const SortOrder: {
    readonly asc: "asc";
    readonly desc: "desc";
};
export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];
export declare const JsonNullValueInput: {
    readonly JsonNull: import("@prisma/client/runtime/client").JsonNullClass;
};
export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput];
export declare const QueryMode: {
    readonly default: "default";
    readonly insensitive: "insensitive";
};
export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode];
export declare const NullsOrder: {
    readonly first: "first";
    readonly last: "last";
};
export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder];
export declare const JsonNullValueFilter: {
    readonly DbNull: import("@prisma/client/runtime/client").DbNullClass;
    readonly JsonNull: import("@prisma/client/runtime/client").JsonNullClass;
    readonly AnyNull: import("@prisma/client/runtime/client").AnyNullClass;
};
export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter];
//# sourceMappingURL=prismaNamespaceBrowser.d.ts.map