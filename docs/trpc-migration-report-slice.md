# tRPC Migration — `report` slice

This document tracks the migration of the **`report` domain** to the layered architecture
described in [`trpc-architecture.md`](./trpc-architecture.md). It is the first vertical slice and
proves the pattern before other domains follow.

## Status

| Step | Description | State |
|---|---|---|
| 0 | Decision/progress doc (this file) | ✅ done |
| 1 | `shared/` primitives (errors, money, pagination, event bus) | ✅ done |
| 2 | `modules/report/` (query, state, policy, dto, repository, events, emails, service, procedure) | ✅ done |
| 3 | Rewrite `reportRouter` as thin adapters; remove report endpoints from `admin` (router deleted) | ✅ done |
| 4 | Migrate frontend callers to the new endpoint names | ✅ done |
| 5 | `bun run typecheck` + `bun run check` green | ✅ done |

## Naming / endpoint-shape convergence

The router follows the doc's naming convention: reads are `byId` + `list` + view-specific
reads (`review`, `financialSummary`); writes are `create`/`update`/`delete` + domain verbs
(`submit`, `transition`, `exportToPdf`). Two points were tightened after review:

- **`filterOptions` moved out.** It returns cost-units + owners (not reports), so it no longer
  belongs on `reportRouter`. It now lives at `reportFilters.options`
  (`modules/report-filters/`, `routers/report-filters.ts`).
- **`list` / `reviewList` — converged to one canonical `list`.** `list` now takes a public
  `scope: "own" | "all"` input (`all` enforced by the policy), offset pagination, and
  server-side filters (`status`, `costUnitId`, `ownerId`, `createdAt`) via the shared query
  core. The admin report table was reworked to use it with page buttons (infinite-scroll +
  client-side filtering removed), and `reviewList` (router + service + repository) was deleted.
  Both the owner and admin tables now share the offset pagination contract.

## Resolved follow-ups

- **Dead duplicate components removed.** `app/(app)/admin/review/[id]/_components/*` (unused —
  the page renders `@/modules/review`) were deleted.

## Deliberate deviations from the target architecture

These keep the first slice scoped. Each is intentional, isolated, and revisitable. They are
**not** oversights.

### 1. Side-effects use an in-process event bus, not a transactional outbox

The target ([`trpc-architecture.md` §5](./trpc-architecture.md)) calls for a durable outbox table
committed in the same transaction and drained by a worker. This slice ships only the in-process
emitter (`server/shared/events/bus.ts`): the service emits domain events and email handlers
subscribe out-of-band (decoupled from the response, no `await` in the request path).

**Consequence / debt:** if the process crashes after the DB commit but before a handler runs, the
email is lost. Acceptable for now (emails are best-effort notifications). **Future work:** promote
to a transactional outbox + worker (a natural standalone service, like the existing PDF service).

### 2. Tenant scoping stays explicit, no global Prisma `$extends`

The target ([§1](./trpc-architecture.md)) binds `organizationId` via a Prisma client extension on
`orgProcedure`. That would change query behavior for **every** router at once — out of scope for a
single-domain slice. Instead the report repository keeps explicit `where: { organizationId }`
sourced from `ctx`.

**Future work:** introduce `shared/db/scoped-client.ts` and wire it into `orgProcedure` in a
dedicated, repo-wide step, then drop the explicit filters.

### 3. DTOs are typed pure mappers; runtime `.output()` validation is deferred

The target ([Cross-cutting conventions](./trpc-architecture.md)) describes a zod output schema per
module plus a SuperJSON `Decimal` serializer. This slice implements the **single Decimal→number
conversion point** and a typed DTO contract via pure mapper functions (`report.dto.ts`,
`shared/money.ts`), but does **not** attach `.output()` zod schemas to procedures, and does not
register a global SuperJSON `Decimal` serializer.

**Why:** several frontend types infer from `RouterOutputs` (e.g. `modules/review/components/
review-types.ts`) and depend on `Prisma.JsonValue` (`expense.meta`) and `BigInt` (`attachment.
size`). Attaching `.output()` schemas would degrade those inferred types and risk a behavioral
break, and a server-only SuperJSON custom serializer would desynchronize client/server
(de)serialization. The pure mappers already satisfy the enterprise rules (strict types, no `any`,
unit-testable, one Decimal conversion).

**Future work:** add zod output schemas + a synchronized client/server SuperJSON `Decimal`
serializer as a safety net once the client transformer config is centralized.

### 4. Lean context (lazy `activeMember`) not changed

Resolving `activeMember` lazily is a cross-cutting context change ([§ Lean context]
(./trpc-architecture.md)) affecting all procedures; left untouched in this slice.

## Endpoint contract changes (this slice)

| New | Replaced |
|---|---|
| `report.list` (scope `own`/`all`) | `report.listOwn` **and** `admin.listAllPaginated` |
| `reportFilters.options` | `admin.getFilterOptions` |
| `report.byId` | `report.getById`, `admin.getReportById` (unused) |
| `report.financialSummary` | `report.getDetails` |
| `report.review` | `admin.getReview` |
| `report.create` / `delete` / `submit` / `exportToPdf` | same names |
| `report.update` | `report.update` (now: no `status`; only `title`/`description`) |
| `report.transition` | `report.updateStatus`, `admin.updateReportStatus` (unused) |

`report.list` is the single canonical list: `scope: "own"` (owner views, default) or
`scope: "all"` (admin, enforced by policy), offset-paginated with server-side filters
(`status`, `costUnitId`, `ownerId`, `createdAt`). The owner and admin tables both use page
buttons. `reviewList` (the transitional cursor adapter) and `filterOptions` on `reportRouter`
have been **removed**; `reportFilters.options` returns cost-unit/owner **ids** so its values map
straight onto the list filter DSL.

**Deleted (provably zero consumers):** `admin.listAll`, `admin.stats`, `admin.listOpen`,
`admin.listRelevant`, `admin.getAllReports`, `admin.getReportById`, `admin.updateReportStatus`.
The `admin` router contained only report procedures, so it is removed entirely.

### Behavioral notes

- **State machine:** owner `submit` is strict (`DRAFT`/`NEEDS_REVISION` → `PENDING_APPROVAL`).
  Admin `transition` uses a broader table that also permits re-opening finalized reports
  (`ACCEPTED`/`REJECTED` → `PENDING_APPROVAL`/`NEEDS_REVISION`/…), preserving the existing admin
  review UI behavior (chosen over the doc's literal terminal-state table to avoid a regression).
- **Authorization correctness:** `update` and `delete` now require the report to be editable
  (`DRAFT`/`NEEDS_REVISION`), matching the documented lifecycle in `CLAUDE.md`. The old code
  allowed owners to delete/update in any status; both endpoints are unused by the frontend, so
  this is a safe correctness fix.
</content>
