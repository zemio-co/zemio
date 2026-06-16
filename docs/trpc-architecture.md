# tRPC Architecture & Conventions

This document captures the target architecture for zemio's tRPC layer: how routers should be
structured, where business logic lives, and the conventions that keep the API maintainable and
scalable as the surface grows.

It is written as the **destination**, not a description of the current code. The current routers
under `apps/web/src/server/api/routers/` predate these conventions and diverge from them in the ways
listed in [Known issues in the current implementation](#known-issues-in-the-current-implementation).

---

## Guiding principle

> The tRPC procedure is a **thin transport adapter**. Everything reusable lives in layers beneath it.

Today a single procedure often carries tenancy, authorization, business rules, persistence,
serialization, and side-effects all at once. That is why routers sprawl and why the same logic gets
copy-pasted across endpoints. The fix is to split those concerns into composable layers so a router
procedure reads as: *parse input → call a service → return a DTO*.

---

## Layered architecture

```
apps/web/src/server/
  api/
    trpc.ts                 # procedure builders + middleware only
    root.ts                 # router composition
    routers/                # THIN: parse input -> call service -> return DTO
  modules/                  # one folder per domain (the real code)
    report/
      report.service.ts     # use-cases / business logic
      report.repository.ts  # all Prisma access for Report
      report.policy.ts      # authorization rules
      report.state.ts       # status state machine
      report.dto.ts         # zod output schemas + entity -> DTO mappers
      report.query.ts       # shared list query core (where/orderBy/pagination)
      report.events.ts      # domain events emitted by the service
  shared/
    db/scoped-client.ts     # tenant-scoped Prisma extension
    authz/policy.ts         # ability/policy primitives
    pagination.ts           # one cursor/offset contract
    money.ts                # Decimal serialization, single source
    events/bus.ts           # in-process event bus + outbox
    errors.ts               # Prisma -> TRPCError mapping
```

**Responsibilities**

| Layer | Owns | Must NOT contain |
|---|---|---|
| Router | input parsing, calling a service, returning a DTO | business rules, Prisma, side-effects |
| Service | use-cases, orchestration, transactions, emitting events | HTTP/tRPC concerns, raw SQL |
| Repository | all Prisma access for one model, projections, aggregates | authorization, business rules |
| Policy | authorization decisions (pure functions over ctx + subject) | data access |
| DTO | output zod schema + `Decimal -> number` mapping | data access |

A procedure should look like this — and this is the *whole* procedure:

```ts
// routers/report.ts
export const reportRouter = createTRPCRouter({
  byId: reportProcedure("read")            // middleware loads + authorizes the report
    .query(({ ctx }) => toReportDetailDTO(ctx.report)),

  list: orgProcedure
    .input(reportListInput)
    .query(({ ctx, input }) => reportService.list(ctx, input)),

  submit: reportProcedure("submit")
    .mutation(({ ctx }) => reportService.submit(ctx, ctx.report)),
});
```

---

## The five building blocks

### 1. Tenant scoping as a Prisma client extension

`orgProcedure` injects a Prisma client already bound to the active org via `$extends`, so queries no
longer repeat `where: { organizationId }` and a forgotten tenant filter becomes structurally
impossible rather than a code-review responsibility.

```ts
// shared/db/scoped-client.ts
export function scopedDb(base: PrismaClient, organizationId: string) {
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, args, query }) {
          if (TENANT_MODELS.has(model)) {
            args.where = { ...args.where, organizationId };
          }
          return query(args);
        },
      },
    },
  });
}
```

### 2. Authorization as a policy layer

One policy module per resource, expressed as data — not branching copy-pasted into every procedure.
One mechanism, derived from `ctx` (no second Better-Auth round trip per check). Better Auth remains
the source of truth for **role assignment**; the per-request **decision** is pure and cheap.

```ts
// modules/report/report.policy.ts
export const reportPolicy = definePolicy<ReportSubject>({
  read:      (ctx, r) => ctx.isOrgAdmin || r.ownerId === ctx.userId,
  update:    (ctx, r) => r.ownerId === ctx.userId && isEditable(r.status),
  submit:    (ctx, r) => r.ownerId === ctx.userId,
  setStatus: (ctx)    => ctx.isOrgAdmin,
});
```

`authorize(ctx, reportPolicy, action, subject)` throws a typed `FORBIDDEN`.

### 3. Resource-loader procedure factories

The "load entity by id → scope to org → authorize → attach to ctx" sequence becomes one reusable
factory. Every per-resource query/mutation reuses it; none re-implement existence + tenancy +
ownership again.

```ts
// modules/report/report.procedure.ts
export const reportProcedure = (action: ReportAction) =>
  orgProcedure
    .input(z.object({ id: z.string() }))
    .use(async ({ ctx, input, next }) => {
      const report = await reportRepository.findById(ctx.db, input.id);
      if (!report) throw new TRPCError({ code: "NOT_FOUND" });
      authorize(ctx, reportPolicy, action, report);
      return next({ ctx: { ...ctx, report } });
    });
```

### 4. Domain state machine

Status transitions are declarative and enforced in exactly one place. `report.update` no longer
accepts `status`; all status changes funnel through `reportService.transition()`.

```ts
// modules/report/report.state.ts
const TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  DRAFT:            [PENDING_APPROVAL],
  NEEDS_REVISION:   [PENDING_APPROVAL],
  PENDING_APPROVAL: [ACCEPTED, REJECTED, NEEDS_REVISION],
  ACCEPTED:         [],
  REJECTED:         [],
};

export function assertTransition(from: ReportStatus, to: ReportStatus) {
  if (!TRANSITIONS[from].includes(to))
    throw new TRPCError({ code: "BAD_REQUEST", message: `Illegal ${from} -> ${to}` });
}
```

### 5. Side-effects via a domain event bus + outbox

Services emit events; they never `await` a mailer inside the request path. Email/notification/audit
handlers subscribe out-of-band. For production durability, write to a transactional **outbox** table
committed in the same transaction and drained by a worker. The DB write and the user's response are
no longer hostage to an external provider's uptime.

```ts
// in reportService.transition()
await this.repo.setStatus(report.id, to);
await this.events.emit({ type: "report.status_changed", reportId, to, actorId });
return toReportDTO(report);   // returns immediately; DB is consistent
```

---

## Router structuring conventions

### Naming

- **Reads:** `byId`, `list`, plus view-specific reads named by what the view needs
  (see [Per-view read models](#per-view-read-models)).
- **Writes:** `create`, `update`, `delete`, and explicit domain verbs (`submit`, `transition`).
- Avoid the historical zoo of `getById` / `get` / `getDetails` / `getReview` / `getReportById` and
  `listOwn` / `listAll` / `listAllPaginated` / `getAllReports` / `listOpen` / `listRelevant`.

### One canonical read model per resource

Do **not** create a new endpoint per screen by default. A single `list` takes filter/sort/page and
serves both owner and admin views; the **policy** widens the scope for admins. Bespoke list
endpoints are a smell unless the projection genuinely differs (next section).

### Per-view read models

When two pages need overlapping-but-different projections of the same resource, separate **the shared
core** (filter/sort/pagination/tenancy — identical) from **the per-view enrichment** (the expensive,
differing part). Put the shared 80% in a reusable query builder so the per-view endpoint stays tiny.

```ts
// modules/report/report.query.ts — reused by every view
export function reportListBase(ctx, input) {
  return {
    where: buildReportListWhere(ctx, input.filters),
    orderBy: buildReportListOrderBy(input.sorting),
    ...cursorPage(input),
  };
}
```

**What not to do:**

- **One fat endpoint returning every enrichment** — each page pays for joins it never shows; the
  expensive part runs unconditionally.
- **A field-selection / `include` flag endpoint** (`list({ with: [...] })`) — it destroys return-type
  inference, forces null-checks on every consumer, and blocks per-shape query tuning. This is
  reinventing GraphQL badly.

### Handling expensive enrichment

Treat the expensive, differing projection as its own problem, decoupled from the list query:

| Situation | Approach |
|---|---|
| Enrichment is cheap (a direct `_count`, a simple join) | Inline it in the per-view endpoint |
| Enrichment is expensive **and** reused by other screens | Separate endpoint fetched in parallel by the visible ids (composition) |
| Enrichment is expensive **and** on a hot path | Denormalize a counter/column, maintained on write |
| Two pages share filter/pagination but differ in projection | Always: shared query core + thin per-view endpoints |

**Worked example.** Page A lists reports with the *attachment count*; Page B lists the same reports
with *cost-unit name + cost-unit creator*. Attachments are two relations deep
(`Report -> Expense -> Attachment`), so the count is the expensive part. Ship:

- `report.list` — shared core, lean (id, title, owner).
- `attachmentCountsByReport({ reportIds })` — one `GROUP BY` aggregate, scoped to the **visible page**
  (~25 rows, not the whole org); fetched in parallel by Page A and merged client-side. Reusable on
  the detail page too, and cached independently by TanStack Query.
- `costUnitsByReport({ reportIds })` — same pattern for Page B.

If profiling later flags the attachment traversal, promote it to an `attachmentCount` column on
`Report`, maintained by the service that already owns attachment mutations. Reserve denormalization
for cases the profiler actually flags.

---

## Cross-cutting conventions

- **DTOs + Decimal once.** Each module exposes `*.dto.ts` with a zod output schema and a single
  `toDTO` mapper that converts `Decimal -> number`. Register a SuperJSON custom serializer for
  `Decimal` as a safety net. `Number(x.amount)` must not appear in routers. List totals use
  `groupBy`/`_sum` in the repository — never JS reduction over over-fetched rows.
- **One pagination contract.** Shared `cursorPaginate` / `offsetPaginate` helpers and input schema.
  Default to cursor pagination; do not invent a new pagination shape per endpoint.
- **Centralized error mapping.** A shared helper maps Prisma errors globally
  (`P2002 -> CONFLICT`, `P2025 -> NOT_FOUND`). Bare `throw new Error(...)` is banned — always
  `TRPCError`.
- **Lean context.** Resolve `activeMember` lazily — only `orgProcedure` and deeper need it. Don't pay
  a `member.findFirst` on `legal` / `user` / `banking` requests that never touch an org.
- **Observability as middleware.** One logging/metrics/audit middleware; no per-procedure ad-hoc
  `logger.info`. Audit logging is a single event-bus subscriber, not scattered calls with
  inconsistent event names.
- **Testability.** Services depend on repository / policy / event-bus interfaces passed via context,
  so business rules are unit-testable without spinning up tRPC or HTTP.

---

## Why tRPC (and where a separate service is warranted)

Contract style and deployment topology are **orthogonal** decisions; don't bundle them.

- **Contract style — tRPC.** With one TypeScript web client and one team, tRPC's end-to-end inference
  is a durable maintainability win: no OpenAPI spec to sync, no codegen, no client/server drift. The
  trigger to introduce REST/OpenAPI or gRPC is a **non-TS consumer** (native mobile, third party,
  another-language service) — and even then you expose only the endpoints that consumer needs, not
  the whole surface.
- **Topology — in-process by default.** tRPC over the HTTP batch link *is* HTTP and scales
  horizontally like any stateless Next.js deployment. The throughput ceiling here is Postgres/Prisma,
  not the RPC framework. "Separate backend = more scalable" is a myth absent a specific driver.
- **When a standalone service earns its keep:** a genuinely different workload profile (CPU-heavy or
  long-running jobs), polyglot/public consumers, team-ownership boundaries, or a runtime mismatch
  (websockets, queue workers). zemio already does this correctly for **PDF generation**
  (`report.exportToPdf` calls a separate service at `env.API_URL/pdf/...`). The email/outbox worker
  is the next natural candidate.

Because business logic lives in framework-agnostic services (not inside tRPC), exposing part of it as
REST/gRPC or moving it to a standalone Node process later means wrapping the same services in a
different transport adapter — the contract decision stays reversible per-endpoint.

---

## Known issues in the current implementation

Recorded so the migration has a concrete punch-list. References point at the current code.

1. **Duplicated read endpoints.** Single report: `report.getById`, `report.getDetails`,
   `admin.getReportById`, `admin.getReview`. Report lists: `report.listOwn`, `admin.listAll`
   (`@deprecated` but still wired), `admin.listAllPaginated`, `admin.getAllReports`, `admin.listOpen`,
   `admin.listRelevant` — three pagination styles among them. Expenses: `listForReport` vs
   `getByReportId` are equivalent; `getById` is a subset of `get`. Cost units: four overlapping list
   projections.
2. **Authorization copy-pasted, two mechanisms.** The "load -> compare `organizationId` -> compare
   `ownerId`/`isOrganizationAdminRole`" block is repeated in nearly every procedure. `report`/`expense`
   use `ctx.orgRole`; `attachment` calls `auth.api.hasPermission(...)` for the same question.
   `attachment` uses `protectedProcedure` and re-derives org from the entity instead of `orgProcedure`
   + active org.
3. **No status state machine.** Status changes from four places with four rule sets: `report.submit`
   (guarded), `report.updateStatus` (any status), `report.update` (owner can set arbitrary status,
   bypassing `submit`), `admin.updateReportStatus` (any status, no notify/log).
4. **Side-effects entangled with the request.** `report.update` fires email fire-and-forget;
   `report.submit` / `report.updateStatus` `await` the mailer and throw `INTERNAL_SERVER_ERROR` on
   failure *after the DB already committed* — a transient mail failure surfaces a successful status
   change as an error. Email JSX is rendered inside the router (hence `report.tsx`).
5. **Manual Decimal handling.** `Number(x.amount)` scattered across reads; list totals summed in JS
   over over-fetched expense rows instead of DB `_sum`.
6. **Inefficient queries.** `report.getDetails` does an existence check then a 2-query transaction
   (3 round-trips); `admin.getAllReports`/`getReportById` use `include: { expenses: true }` with no
   projection.
7. **Inconsistent validation, errors, naming.** Some input schemas in `@/lib/validators`, some inline;
   `platformAdmin` throws bare `Error`; `P2002` handled only in `cost-unit`; no output/DTO schemas.
8. **Cross-cutting.** Context always runs `member.findFirst` even for non-org procedures;
   `server/api/utils.ts` is an empty stub; `timingMiddleware` voids its own work in prod; audit
   `logger.info` calls are ad-hoc and inconsistently present.

---

## Migration approach

Migrate **one vertical slice at a time**, starting with the `report` domain, to prove the pattern
against the current `report.tsx` before committing to a full rewrite:

1. Introduce `shared/` primitives (scoped client, policy, pagination, money, errors, event bus).
2. Build the `report` module (repository, policy, state, dto, service, procedure factory).
3. Rewrite `reportRouter` as thin adapters over the service; delete the duplicate report endpoints in
   `admin`.
4. Move email to event subscribers; introduce the outbox.
5. Repeat per domain (`expense`, `attachment`, `cost-unit`, ...).
</content>
</invoke>
