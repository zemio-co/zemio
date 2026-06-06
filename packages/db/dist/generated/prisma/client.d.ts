import * as runtime from "@prisma/client/runtime/client";
import * as $Class from "./internal/class";
import * as Prisma from "./internal/prismaNamespace";
export * as $Enums from './enums';
export * from "./enums";
/**
 * ## Prisma Client
 *
 * Type-safe database client for TypeScript
 * @example
 * ```
 * const prisma = new PrismaClient({
 *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
 * })
 * // Fetch zero or more Reports
 * const reports = await prisma.report.findMany()
 * ```
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export declare const PrismaClient: $Class.PrismaClientConstructor;
export type PrismaClient<LogOpts extends Prisma.LogLevel = never, OmitOpts extends Prisma.PrismaClientOptions["omit"] = Prisma.PrismaClientOptions["omit"], ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = $Class.PrismaClient<LogOpts, OmitOpts, ExtArgs>;
export { Prisma };
/**
 * Model Report
 *
 */
export type Report = Prisma.ReportModel;
/**
 * Model Expense
 *
 */
export type Expense = Prisma.ExpenseModel;
/**
 * Model Attachment
 *
 */
export type Attachment = Prisma.AttachmentModel;
/**
 * Model User
 *
 */
export type User = Prisma.UserModel;
/**
 * Model Session
 *
 */
export type Session = Prisma.SessionModel;
/**
 * Model Account
 *
 */
export type Account = Prisma.AccountModel;
/**
 * Model Verification
 *
 */
export type Verification = Prisma.VerificationModel;
/**
 * Model Organization
 *
 */
export type Organization = Prisma.OrganizationModel;
/**
 * Model Member
 *
 */
export type Member = Prisma.MemberModel;
/**
 * Model Invitation
 *
 */
export type Invitation = Prisma.InvitationModel;
/**
 * Model Preferences
 *
 */
export type Preferences = Prisma.PreferencesModel;
/**
 * Model LegalAcceptance
 *
 */
export type LegalAcceptance = Prisma.LegalAcceptanceModel;
/**
 * Model Settings
 *
 */
export type Settings = Prisma.SettingsModel;
/**
 * Model CostUnitGroup
 *
 */
export type CostUnitGroup = Prisma.CostUnitGroupModel;
/**
 * Model CostUnit
 *
 */
export type CostUnit = Prisma.CostUnitModel;
/**
 * Model BankingDetails
 *
 */
export type BankingDetails = Prisma.BankingDetailsModel;
//# sourceMappingURL=client.d.ts.map