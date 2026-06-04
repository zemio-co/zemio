import * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "./prismaNamespace";
export type LogOptions<ClientOptions extends Prisma.PrismaClientOptions> = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never;
export interface PrismaClientConstructor {
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
    new <Options extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions, LogOpts extends LogOptions<Options> = LogOptions<Options>, OmitOpts extends Prisma.PrismaClientOptions['omit'] = Options extends {
        omit: infer U;
    } ? U : Prisma.PrismaClientOptions['omit'], ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs>(options: Prisma.Subset<Options, Prisma.PrismaClientOptions>): PrismaClient<LogOpts, OmitOpts, ExtArgs>;
}
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
export interface PrismaClient<in LogOpts extends Prisma.LogLevel = never, in out OmitOpts extends Prisma.PrismaClientOptions['omit'] = undefined, in out ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['other'];
    };
    $on<V extends LogOpts>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;
    /**
     * Connect with the database
     */
    $connect(): runtime.Types.Utils.JsPromise<void>;
    /**
     * Disconnect from the database
     */
    $disconnect(): runtime.Types.Utils.JsPromise<void>;
    /**
       * Executes a prepared raw query and returns the number of affected rows.
       * @example
       * ```
       * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
       * ```
       *
       * Read more in our [docs](https://pris.ly/d/raw-queries).
       */
    $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;
    /**
     * Executes a raw query and returns the number of affected rows.
     * Susceptible to SQL injections, see documentation.
     * @example
     * ```
     * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
     * ```
     *
     * Read more in our [docs](https://pris.ly/d/raw-queries).
     */
    $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;
    /**
     * Performs a prepared raw query and returns the `SELECT` data.
     * @example
     * ```
     * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
     * ```
     *
     * Read more in our [docs](https://pris.ly/d/raw-queries).
     */
    $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;
    /**
     * Performs a raw query and returns the `SELECT` data.
     * Susceptible to SQL injections, see documentation.
     * @example
     * ```
     * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
     * ```
     *
     * Read more in our [docs](https://pris.ly/d/raw-queries).
     */
    $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;
    /**
     * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
     * @example
     * ```
     * const [george, bob, alice] = await prisma.$transaction([
     *   prisma.user.create({ data: { name: 'George' } }),
     *   prisma.user.create({ data: { name: 'Bob' } }),
     *   prisma.user.create({ data: { name: 'Alice' } }),
     * ])
     * ```
     *
     * Read more in our [docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).
     */
    $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: {
        maxWait?: number;
        timeout?: number;
        isolationLevel?: Prisma.TransactionIsolationLevel;
    }): runtime.Types.Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>;
    $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => runtime.Types.Utils.JsPromise<R>, options?: {
        maxWait?: number;
        timeout?: number;
        isolationLevel?: Prisma.TransactionIsolationLevel;
    }): runtime.Types.Utils.JsPromise<R>;
    $extends: runtime.Types.Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<OmitOpts>, ExtArgs, runtime.Types.Utils.Call<Prisma.TypeMapCb<OmitOpts>, {
        extArgs: ExtArgs;
    }>>;
    /**
 * `prisma.report`: Exposes CRUD operations for the **Report** model.
  * Example usage:
  * ```ts
  * // Fetch zero or more Reports
  * const reports = await prisma.report.findMany()
  * ```
  */
    get report(): Prisma.ReportDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.expense`: Exposes CRUD operations for the **Expense** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more Expenses
      * const expenses = await prisma.expense.findMany()
      * ```
      */
    get expense(): Prisma.ExpenseDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.attachment`: Exposes CRUD operations for the **Attachment** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more Attachments
      * const attachments = await prisma.attachment.findMany()
      * ```
      */
    get attachment(): Prisma.AttachmentDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.user`: Exposes CRUD operations for the **User** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more Users
      * const users = await prisma.user.findMany()
      * ```
      */
    get user(): Prisma.UserDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.session`: Exposes CRUD operations for the **Session** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more Sessions
      * const sessions = await prisma.session.findMany()
      * ```
      */
    get session(): Prisma.SessionDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.account`: Exposes CRUD operations for the **Account** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more Accounts
      * const accounts = await prisma.account.findMany()
      * ```
      */
    get account(): Prisma.AccountDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.verification`: Exposes CRUD operations for the **Verification** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more Verifications
      * const verifications = await prisma.verification.findMany()
      * ```
      */
    get verification(): Prisma.VerificationDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.organization`: Exposes CRUD operations for the **Organization** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more Organizations
      * const organizations = await prisma.organization.findMany()
      * ```
      */
    get organization(): Prisma.OrganizationDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.member`: Exposes CRUD operations for the **Member** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more Members
      * const members = await prisma.member.findMany()
      * ```
      */
    get member(): Prisma.MemberDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.invitation`: Exposes CRUD operations for the **Invitation** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more Invitations
      * const invitations = await prisma.invitation.findMany()
      * ```
      */
    get invitation(): Prisma.InvitationDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.preferences`: Exposes CRUD operations for the **Preferences** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more Preferences
      * const preferences = await prisma.preferences.findMany()
      * ```
      */
    get preferences(): Prisma.PreferencesDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.legalAcceptance`: Exposes CRUD operations for the **LegalAcceptance** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more LegalAcceptances
      * const legalAcceptances = await prisma.legalAcceptance.findMany()
      * ```
      */
    get legalAcceptance(): Prisma.LegalAcceptanceDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.settings`: Exposes CRUD operations for the **Settings** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more Settings
      * const settings = await prisma.settings.findMany()
      * ```
      */
    get settings(): Prisma.SettingsDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.costUnitGroup`: Exposes CRUD operations for the **CostUnitGroup** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more CostUnitGroups
      * const costUnitGroups = await prisma.costUnitGroup.findMany()
      * ```
      */
    get costUnitGroup(): Prisma.CostUnitGroupDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.costUnit`: Exposes CRUD operations for the **CostUnit** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more CostUnits
      * const costUnits = await prisma.costUnit.findMany()
      * ```
      */
    get costUnit(): Prisma.CostUnitDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.bankingDetails`: Exposes CRUD operations for the **BankingDetails** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more BankingDetails
      * const bankingDetails = await prisma.bankingDetails.findMany()
      * ```
      */
    get bankingDetails(): Prisma.BankingDetailsDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
}
export declare function getPrismaClientClass(): PrismaClientConstructor;
//# sourceMappingURL=class.d.ts.map