# Plan: Reporting Feature — Backend Only

Org-admin-only analytics over `Report`/`Expense` data. **Scope of this plan: backend only** —
the `apps/web` tRPC surface and the `apps/api` PDF-generation service. Frontend dashboard cards
are explicitly out of scope here and will be planned separately once the backend contract is settled.

Decisions already made (see conversation, not repeated per-phase):
- Router: `reporting`, entirely gated by `orgAdminProcedure` (org-wide, no `own` scope).
- Time axis: `Report.createdAt` (submitted) / `Report.lastUpdatedAt` + `status = ACCEPTED`
  (reimbursed) — same convention as the existing per-user dashboard, not `Expense.startDate/endDate`.
- Dashboard cards are **separate tRPC procedures**, not one mega-endpoint — `httpBatchStreamLink`
  already batches same-tick calls into one HTTP request, so there's no round-trip cost, and
  separate procedures give independent loading/cache/error state per card.
- CSV export: one tRPC query returning itemized rows (one row per expense); client serializes to CSV.
- PDF export: an aggregate/summary document (mirrors `report.exportToPdf`'s existing pattern of
  delegating to `apps/api`), not an itemized dump — CSV already owns the itemized use case.
- Breakdowns for v1: by cost unit, by member/owner, by expense type, by status.

---

## Phase 0: Documentation & Pattern Discovery (consolidated findings)

### Allowed APIs / patterns to copy — `apps/web`

**Layering** — `docs/trpc-architecture.md`: router = parse input → call service → return DTO.
Service owns orchestration; repository owns all Prisma access; DTO owns `Decimal → number` mapping.
Do not put Prisma calls in the router or business logic in the router.

**Tenant + authz procedure** — `apps/web/src/server/api/trpc.ts:192-215`:
```ts
export const orgProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.activeMember) throw new TRPCError({ code: "FORBIDDEN", ... });
  return next({ ctx: { ...ctx, organizationId: ctx.activeMember.organizationId, orgRole: ctx.activeMember.role } });
});

export const orgAdminProcedure = orgProcedure.use(({ ctx, next }) => {
  if (!isOrganizationAdminRole(ctx.orgRole)) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx });
});
```
Reporting endpoints use `orgAdminProcedure` directly (no per-resource loader needed — there's no
single "resource" being loaded, unlike `reportProcedure`).

**Existing filter DSL to reuse (not reinvent)** — `apps/web/src/server/modules/report/report.query.ts`:
- `reportListFilterGroupSchema` (lines 195-202) — the recursive filter tree input type.
- `buildReportListWhere` (lines 232-248) — currently takes `{ scope, filters, organizationId, userId }`
  and branches `scope === "own" ? {organizationId, ownerId} : {organizationId}`.
  For reporting, we always want the `"all"` branch — **do not** duplicate the filter-compiling
  functions (`compileFilterGroup`, `compileFilterRule`, `compileStatusFilter`, etc. lines 264-375).
  Reuse `buildReportListWhere({ scope: "all", filters, organizationId, userId: "" })` and drop the
  unused `userId` — it's inert on the `"all"` branch. Do not widen `report.query.ts`'s exports
  unless strictly required.

**Money conversion** — `apps/web/src/server/shared/money.ts`:
```ts
export function decimalToNumber(value: Prisma.Decimal): number
export function nullableDecimalToNumber(value: Prisma.Decimal | null | undefined): number // defaults to 0
```
Every aggregate `_sum.amount` in the reporting repository must go through `nullableDecimalToNumber`.
`Number(x.amount)` must not appear anywhere in the new `apps/web` code.

**Period bucketing (for `timeSeries`)** — `apps/web/src/server/modules/dashboard/dashboard.utils.ts`:
`startOfPeriod`, `buildPeriodSeries`, `fillPeriodGaps` are pure, generic, and take no owner/org
context — **reuse these directly**, don't reimplement. The raw SQL pattern to copy (org-wide, drop
the `ownerId` filter) is `dashboard.repository.ts:24-39` (`submittedSeries`, using
`DATE_TRUNC(${granularityLiteral}, ...)`, with the `Prisma.raw` comment justifying its safety at
line 17-18 — the granularity is Zod-validated before reaching the repository).

**Existing groupBy/join pattern for enrichment** — `apps/web/src/server/modules/report-filters/report-filters.repository.ts`:
```ts
db.costUnit.findMany({ where: { organizationId }, select: { id: true, tag: true, title: true } })
db.user.findMany({ where: { ownReports: { some: { organizationId } } }, select: {...} })
```
A `groupBy` result only returns raw ids — join the small set of referenced cost units/users back in
by id, don't over-fetch.

### Allowed APIs / patterns to copy — `apps/api`

`apps/api` is a **separate deployable service** (Hono + Bun) that owns PDF generation. It has its
own Prisma client and does **not** import `apps/web`'s server modules — this is an existing,
deliberate boundary (see `apps/api/src/services/pdf/service.ts`'s `generateReportPdf`, which
independently re-queries `Report` rather than calling into `apps/web`'s `report.repository`). The
reporting PDF generator must follow the same boundary: duplicate the minimal query logic needed,
don't attempt a cross-app import.

**Internal-service auth** — `apps/api/src/middleware/service-auth.ts`:
```ts
export const serviceAuth = createMiddleware(async (c, next) => {
  const key = c.req.header("X-Service-Key");
  if (key !== env.INTERNAL_API_SECRET) return c.json({ error: "Unauthorized" }, 401);
  await next();
});
```
This only validates the shared secret; per-request actor headers (`X-User-Id`, `X-Organization-Id`,
`X-Member-Role`) are read and validated inside the route handler itself, same as `pdf.ts:6-13`.

**Existing route + service shape** — `apps/api/src/routes/pdf.ts:1-31`:
```ts
pdf.post("/report/:id", serviceAuth, async (c) => {
  const userId = c.req.header("X-User-Id");
  const organizationId = c.req.header("X-Organization-Id");
  const memberRole = c.req.header("X-Member-Role");
  if (!userId || !organizationId || !memberRole) return c.json({ error: "Missing user context headers" }, 400);
  try {
    const result = await generateReportPdf(reportId, userId, organizationId, memberRole);
    return c.json(result);
  } catch (err) {
    const status = (err as { status?: number }).status;
    const message = err instanceof Error ? err.message : "Internal server error";
    return c.json({ error: message }, status === 404 || status === 403 ? status : 500);
  }
});
```
Registered via `apps/api/src/routes/index.ts:1-8` (`routes.route("/pdf", pdf)`).

**Existing PDF generation pipeline** — `apps/api/src/services/pdf/service.ts:80-96` +
`apps/api/src/services/pdf/generate.ts`:
1. Query Prisma directly for the data the PDF needs (`db` from `apps/api/src/lib/db.ts`).
2. Build the PDF buffer with `pdfkit` (+ `pdf-lib` for merging attachment PDFs — not needed for an
   aggregate report, no attachments involved).
3. `uploadToStorage(key, buffer, "application/pdf")` — key convention `` `pdf/temp/${crypto.randomUUID()}.pdf` ``.
4. `getPresignedDownloadUrl(key, filename, 120)` (120s expiry) — return `{ url, filename }`, exactly
   the `PdfExportResult` shape `apps/web` already expects from `report.exportToPdf`.

`generate.ts` has three **private, unexported** pure helpers worth reusing rather than
re-implementing: `translateReportStatus` (line ~28), `translateExpenseType` (line ~41),
`formatEuroAmount` (line ~93). They're duplicated with `apps/web/src/server/pdf/summary.ts`'s copies
already (that's a pre-existing, separate-app duplication — out of scope to fix here), but within
`apps/api` itself there's no reason to re-write them a third time for the reporting PDF.
**Action:** extract these three into `apps/api/src/services/pdf/format.ts` and have both
`generate.ts` and the new reporting generator import them — this is reuse strictly required by the
new feature, not unrelated cleanup, so it's in scope per `ai/ROLE_FEATURE.md`.
`generate.ts` also uses `Number(expense.amount)` directly (line ~315) rather than a shared Decimal
helper — `apps/api` has no `money.ts` equivalent. **Do not propagate this into new code**: call
`.toNumber()` on the `Prisma.Decimal` directly in the new reporting service (same underlying
behavior as `apps/web`'s `decimalToNumber`), and don't introduce a new shared package across apps
just for this one helper (scope creep for a two-line function).

### Anti-patterns to avoid
- **Don't** re-derive `organizationId + status/date` filtering logic in `apps/web` — reuse `buildReportListWhere`'s compiled output.
- **Don't** build one mega `reporting.dashboard` endpoint in `apps/web` — keep cards as separate procedures over a shared query-core.
- **Don't** use `Number(x.amount)` in `apps/web`'s new code — always `nullableDecimalToNumber`/`decimalToNumber`.
- **Don't** import `apps/web` server modules from `apps/api`, or vice versa — they're separate deployables; duplicate the minimal query logic in `apps/api` instead.
- **Don't** invent a new internal-service auth header scheme for the reporting PDF route — reuse `X-Service-Key`/`serviceAuth` and the existing actor-header contract verbatim.
- **Don't** send the full recursive filter-tree DSL over the wire to `apps/api` (see Phase 3) — flatten it web-side first; `apps/api` should not need its own copy of the filter-tree compiler.

---

## Phase 1: Shared query core + DTOs (`apps/web`)

**Files to create:**
- `apps/web/src/server/modules/reporting/reporting.query.ts`
- `apps/web/src/server/modules/reporting/reporting.dto.ts`

**What to implement:**
- `reportingWhere({ organizationId, filters }): Prisma.ReportWhereInput` — thin wrapper calling
  `buildReportListWhere({ scope: "all", filters, organizationId, userId: "" })` from `report.query.ts`.
- `reportingFilterInputSchema = z.object({ filters: reportListFilterGroupSchema.optional() })` — the
  shared input type every reporting procedure takes.
- DTO schemas (zod) for: `ReportingOverviewDTO`, `ReportingTimeSeriesDTO` (reuse `statSeriesSchema`
  shape from `dashboard.dto.ts`), `ReportingBreakdownRowDTO` (generic `{ key, label, amount, count }`
  shape reused by cost-unit/member/expense-type/status breakdowns), `ReportingExportRowDTO`.

**Verification checklist:**
- `bun run typecheck` passes with no new `any`.
- `reportingWhere` produces an identical `Prisma.ReportWhereInput` to
  `buildReportListWhere({scope: "all", ...})` for the same filters (read side-by-side — no test suite in this repo).

**Anti-pattern guards:** no Prisma client import inside `reporting.dto.ts` (DTOs are pure zod + mappers).

---

## Phase 2: Repository + service (`apps/web`)

**Files to create:**
- `apps/web/src/server/modules/reporting/reporting.repository.ts`
- `apps/web/src/server/modules/reporting/reporting.service.ts`

**What to implement (copy the dashboard/report-filters patterns, don't invent new query shapes):**
- `overview(db, where)` — grouped counts + sums per `ReportStatus` in one round trip (mirror the
  `aggregate` shape in `dashboard.repository.ts:59-88`, grouped by status instead of a single sum).
- `timeSeries(db, { where, granularity, metric })` — copy `dashboard.repository.ts:24-39`
  (`submittedSeries`) verbatim, minus the `ownerId` filter; branch on `metric` the same way
  `reimbursedSeries` adds `status = 'ACCEPTED'` + uses `lastUpdatedAt`. Service layer reuses
  `startOfPeriod`/`buildPeriodSeries`/`fillPeriodGaps` from `dashboard.utils.ts` unchanged.
  `Prisma.raw` stays reserved for the Zod-validated granularity literal only, never user input.
- `byCostUnit`, `byMember`, `byExpenseType`, `byStatus` — one generic repository function
  `groupedTotals(db, where, groupField)` using `db.expense.groupBy({ by: [...], where: { report: where }, _sum: { amount: true }, _count: true })`,
  joined to display data the same way `report-filters.repository.ts` joins `costUnit`/`user` (fetch
  the small referenced set by id, not per-row). Four thin service methods call this one repository
  function with a different group field + join source.
- `exportRows(db, where)` — flat query: `db.expense.findMany({ where: { report: where }, include: { report: { select: {...} } } })`
  projected to the DTO shape (report tag/title/owner name/cost unit tag + expense type/amount/dates).

**Verification checklist:**
- `bun run typecheck` passes.
- Manually trace one query per method against `packages/db/prisma/schema.prisma:17-80` to confirm
  every `where`/`select` field exists (`Report.costUnitId`, `Expense.reportId`, etc.).
- Confirm every money field passes through `nullableDecimalToNumber`.

**Anti-pattern guards:** no authorization logic in the repository — `orgAdminProcedure` already
fully gates access; there's no per-row ownership check here since reporting is inherently org-wide.

---

## Phase 3: Router + registration (`apps/web`)

**Files to create/edit:**
- `apps/web/src/server/api/routers/reporting.ts` (new)
- `apps/web/src/server/api/root.ts` (edit — add `reporting: reportingRouter`)

**What to implement:** thin procedures only — copy `dashboard.ts`'s router shape
(`apps/web/src/server/api/routers/dashboard.ts:8-28`) but with `orgAdminProcedure` instead of
`orgProcedure`, and `reportingFilterInputSchema` (+ per-endpoint extras like `granularity`/`metric`
for `timeSeries`) as input. Each procedure is exactly:
`.input(...).query(({ctx, input}) => reportingService.X(toReportingServiceContext(ctx), input))`.

Also add the `exportToPdf` **mutation** here (input: `reportingFilterInputSchema`), which:
1. Flattens the (possibly nested) `filters` tree into the simple, JSON-transportable shape
   `apps/api` will consume: `{ dateRange?: {start, end}, costUnitIds?: string[], ownerIds?: string[], statuses?: ReportStatus[] }`.
   This flattening happens **in `apps/web`**, not `apps/api` — see Phase 5's rationale for why the
   wire contract is deliberately simpler than the full recursive filter DSL.
2. POSTs to `${env.API_URL}/pdf/reporting` with the same header contract as
   `report.service.ts:364-397` (`X-Service-Key`, `X-User-Id`, `X-Organization-Id`, `X-Member-Role`)
   plus the flattened filters as the JSON body.
3. Maps 404/403/else the same way `report.service.ts` does, and returns `PdfExportResult`.

**Verification checklist:**
- `bun run typecheck`.
- `bun run check` (biome).
- Call each procedure as an org admin and as a non-admin org member to confirm `UNAUTHORIZED` fires for non-admins.

**Anti-pattern guards:** no `Number()`, no bare `Error`, no Prisma import in the router file.

---

## Phase 4: CSV export data endpoint (`apps/web`)

**Scope note:** this phase is the **data endpoint only** (`reporting.export` query → `reportingService.exportRows`).
CSV serialization and the download UI are frontend concerns, out of scope for this plan.

**What to implement:** add `export` procedure to `reporting.ts`, `orgAdminProcedure`-gated, input
`reportingFilterInputSchema`, returning `ReportingExportRowDTO[]` from Phase 2's `exportRows`.

**Verification checklist:** call the procedure with a non-trivial filter set and confirm row count/shape matches `reporting.overview`'s totals for the same filters (cross-check aggregate vs. itemized sum).

---

## Phase 5: `apps/api` — Reporting PDF service

This is the other backend surface this feature touches, and it's a **separate deployable app**, not
a module inside `apps/web`. Full detail below since this is the part the previous version of this
plan under-specified.

### 5.1 Wire contract (what `apps/web` sends, decided here)

`POST {API_URL}/pdf/reporting`, headers identical to the existing `/pdf/report/:id` route
(`X-Service-Key`, `X-User-Id`, `X-Organization-Id`, `X-Member-Role`), JSON body:
```ts
{
  dateRange?: { start: string; end: string };   // ISO strings; undefined = all-time
  costUnitIds?: string[];
  ownerIds?: string[];
  statuses?: ReportStatus[];
}
```
**Why flattened, not the recursive filter tree:** `apps/web`'s `reportListFilterGroupSchema` is a
general-purpose nested AND/OR tree built for the report list UI's arbitrary column filters. The PDF
is a single aggregate snapshot, not a filtered table — an admin generating "the Q1 report" needs a
date range plus a handful of narrowing dimensions, not the full boolean expressiveness of the list
filter DSL. Shipping the flattened shape means `apps/api` never needs its own copy of
`compileFilterGroup`/`compileFilterRule` — a real duplication saving, since that compiler is the
most complex piece of `report.query.ts`. If a genuine need for arbitrary nested filters on the PDF
surfaces later, that's a deliberate follow-up, not a default.

### 5.2 Route

**File to edit:** `apps/api/src/routes/pdf.ts` — add, alongside the existing `/report/:id` route:
```ts
pdf.post("/reporting", serviceAuth, async (c) => {
  const userId = c.req.header("X-User-Id");
  const organizationId = c.req.header("X-Organization-Id");
  const memberRole = c.req.header("X-Member-Role");
  if (!userId || !organizationId || !memberRole) {
    return c.json({ error: "Missing user context headers" }, 400);
  }
  const parsed = reportingPdfInputSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "Invalid request body" }, 400);

  try {
    const result = await generateReportingPdf(organizationId, memberRole, parsed.data);
    return c.json(result);
  } catch (err) {
    const status = (err as { status?: number }).status;
    const message = err instanceof Error ? err.message : "Internal server error";
    return c.json({ error: message }, status === 403 ? status : 500);
  }
});
```
No 404 branch here (unlike `/report/:id`) — there's no single resource that can be "not found";
an org with zero matching reports just renders an empty-state PDF. `memberRole` must be admin/owner
— **reuse the existing `isAdminRole` helper from `apps/api/src/services/pdf/service.ts`** (currently
unexported private function — export it, or duplicate the one-liner; either is fine, it's a single
`role === "admin" || role === "owner"` check) — and throw a `403` if not, mirroring
`generateReportPdf`'s existing `Object.assign(new Error(...), { status: 403 })` convention.

**File to create:** `apps/api/src/services/pdf/reporting.validators.ts` — the zod schema for the
request body above (validate at the boundary — untrusted input, per `ai/RULES.md` §5).

### 5.3 Service — data layer

**File to create:** `apps/api/src/services/pdf/reporting-data.ts`

Queries `db` (from `apps/api/src/lib/db.ts`) directly — this duplicates a subset of Phase 2's
`apps/web` repository logic, which is unavoidable and consistent with the existing cross-app
boundary (see Phase 0). Keep it deliberately smaller than the web repository: only what the PDF
actually renders, using the flattened filter shape from §5.1 to build a plain
`Prisma.ReportWhereInput` directly (no filter-tree compiler needed):

```ts
function buildWhere(organizationId: string, filters: ReportingPdfFilters): Prisma.ReportWhereInput {
  return {
    organizationId,
    ...(filters.costUnitIds && { costUnitId: { in: filters.costUnitIds } }),
    ...(filters.ownerIds && { ownerId: { in: filters.ownerIds } }),
    ...(filters.statuses && { status: { in: filters.statuses } }),
    ...(filters.dateRange && {
      createdAt: { gte: new Date(filters.dateRange.start), lte: new Date(filters.dateRange.end) },
    }),
  };
}
```

Data needed for the PDF (decide the exact contents now, so 5.4's layout isn't guessing):
- **Overview totals**: total spent, total reimbursed (accepted), pending amount, rejected amount,
  report count per status — same shape as Phase 2's `overview`, recomputed independently here.
- **By cost unit**: sum + count grouped by `costUnitId`, joined to `{ tag, title }` — same shape as
  Phase 2's `byCostUnit`.
- **By expense type**: sum + count grouped by `Expense.type`.
- Organization name/tag for the document header (`db.organization.findUniqueOrThrow`).

Explicitly **not** included: by-member breakdown and itemized rows — the aggregate PDF stays a
summary document; per-member detail and itemized data are what the CSV export (Phase 4) already
covers, and duplicating that here would make the two exports redundant with each other. Flagging
this as a scoping call, not a hard requirement — revisit if you want member-level detail in the PDF too.

Every `_sum.amount` result must call `.toNumber()` (see Phase 0 — no `Number()`, and no new
cross-app shared package just for this).

### 5.4 Service — PDF rendering

**File to create:** `apps/api/src/services/pdf/reporting-generate.ts`, mirroring
`apps/api/src/services/pdf/generate.ts`'s structure (pdfkit document, `MUTED_COLOR`/`COLUMN_WIDTHS`
constants, table-drawing helpers) but for an aggregate document instead of a single report:
header (org name, generated-at date, applied filter summary in plain text), an overview section
(totals as a simple key/value or small table), a cost-unit breakdown table, an expense-type
breakdown table. No attachment merging (`pdf-lib`/`prepareAttachmentBuffers`) — not applicable to an
aggregate document, don't copy that part of `generate.ts`.

**File to create:** `apps/api/src/services/pdf/format.ts` — extract `translateReportStatus`,
`translateExpenseType`, `formatEuroAmount` out of `generate.ts` (currently private there) so both
generators import the same implementation instead of a third copy.

**File to create:** `apps/api/src/services/pdf/reporting.ts` — the orchestrating
`generateReportingPdf(organizationId, memberRole, filters)` function, following
`service.ts:80-96`'s pipeline: check `isAdminRole`, fetch data (5.3), render buffer (5.4),
`uploadToStorage` with key `` `pdf/temp/${crypto.randomUUID()}.pdf` ``,
`getPresignedDownloadUrl(key, filename, 120)`, return `{ url, filename }`. Filename convention:
new `buildReportingPdfFilename(organizationTag, filters)` alongside `buildReportPdfFilename` (same
`toSnakeCaseFilenameSegment` normalization already in `generate.ts`).

### 5.5 Registration

No change needed to `apps/api/src/routes/index.ts` — `/reporting` is added under the same
already-mounted `pdf` sub-router (`routes.route("/pdf", pdf)`), same as `/report/:id`.

**Verification checklist:**
- `bun run typecheck` in `apps/api`.
- Call `POST /pdf/reporting` directly (curl/Postman) with a valid `X-Service-Key` and admin actor
  headers, confirm a downloadable PDF with correct org-scoped totals.
- Call it with a non-admin `X-Member-Role` and confirm `403`.
- Call it with a missing/invalid body and confirm `400`, not a 500.
- Confirm no cross-app import was introduced (`grep -r "apps/web" apps/api/src` → no hits).

**Anti-pattern guards:** don't duplicate the auth-header contract or invent a new error-mapping
scheme; don't add attachment-merging logic that doesn't apply to an aggregate document; don't send
or accept the full recursive filter tree here.

---

## Final Phase: Backend Verification

1. `bun run typecheck` and `bun run check` clean across `apps/web` and `apps/api`.
2. Re-read `docs/trpc-architecture.md`'s "known issues" list and confirm this feature didn't
   reintroduce any of them (duplicated read endpoints, copy-pasted authz, manual Decimal handling).
3. Grep for `Number(` in the new `reporting` files in both apps — zero hits outside the one
   explicitly-accepted `.toNumber()` call sites.
4. Exercise every `reporting.*` procedure as an org admin and confirm `UNAUTHORIZED` for a
   non-admin org member on each.
5. Exercise `POST /pdf/reporting` per Phase 5's verification checklist.
6. Confirm no new dependency was added to either app without being explicitly flagged/approved.

Frontend dashboard cards, the CSV serializer, and the export-trigger UI are deliberately excluded
here — plan those once this backend contract is implemented and reviewed.

---

## Implementation notes (as-built deltas from this plan)

All phases are implemented and committed. Three review passes (one per phase group) surfaced
refinements applied during implementation — recorded here so this document matches what actually
shipped, not just what was originally sketched:

- **`exportToPdf`'s filter-flattening lives in `reporting.service.ts`, not the router.** Phase 3's
  pseudocode described the flattening as a router-level step; the actual router procedure is a pure
  one-line delegation (`reportingService.exportToPdf(ctx, input)`), consistent with Phase 0's own
  "router = parse input → call service" principle.
- **Breakdown grouping is two strategies, not one generic helper.** Phase 2 sketched a single
  `groupedTotals(db, where, groupField)` repository function for all four breakdowns. In practice,
  `costUnitId`/`ownerId`/`status` live on `Report` while `Expense.amount` lives on `Expense`, and
  Prisma cannot `groupBy` a relation field in one call — so `byStatus`/`byCostUnit`/`byMember` go
  through a shared `reportsWithSums` + `bucketReportsBy` (fetch matching reports, fetch per-report
  expense sums, bucket in JS), while `byExpenseType` uses a direct one-step `Expense.groupBy` since
  type is expense-native. `overview` and `byStatus` share one internal `statusBuckets` computation
  rather than each re-fetching independently.
- **Renamed `totalSpent` → `totalSubmitted`** in `ReportingOverviewDTO` — it sums across every
  report status including DRAFT/REJECTED, so "spent" was misleading; matches the per-user
  dashboard's existing "submitted" terminology for the same semantics.
- **Added validation Phase 0 didn't call out:** `reportingFilterInputSchema` reuses the report
  list's rule-count/nesting-depth limits (`checkFilterGroupLimits`, exported from `report.query.ts`
  for this reuse); `reportingTimeSeriesInputSchema` and the PDF's `dateRange` both got the same
  `start <= end` / max-range guards the sibling schemas already enforce.
- **Deduplicated `expenseSumsByReport`** (web) to call the existing `reportRepository.sumByReportIds`
  instead of re-declaring the same `groupBy` query.
- **`apps/api` hardening found during review:** `POST /pdf/reporting`'s body parse is now wrapped in
  try/catch (malformed JSON previously produced an unhandled 500 instead of a clean 400); a missing
  organization now throws a controlled 404 instead of leaking a raw Prisma error message; empty
  filter arrays (`costUnitIds: []`) are now treated as "no filter" rather than "match nothing".

**Not independently exercised in this session:** Final Phase items 4 and 5 (live-calling each
procedure as an admin/non-admin, and curling `POST /pdf/reporting`) require a running dev server
with real auth/org data. Verification here was structural instead: every `reporting.*` procedure is
confirmed `orgAdminProcedure`-gated (grep), and the request/response/error-mapping code paths were
traced line-by-line by the review passes rather than exercised at runtime. Recommend an actual
manual smoke test before this ships.
