# Audit Trail

This document describes the target architecture for the zemio audit trail. It should be read
alongside [`trpc-architecture.md`](./trpc-architecture.md), which defines the overall layered
conventions. Deviations from those conventions are called out explicitly.

---

## What this is

The audit trail is an **append-only, tamper-evident log of state changes and user comments**
across the application. Its primary purpose is compliance and traceability: answering "who did
what, when, and what did it look like before?" A user-facing activity feed is one downstream
consumer of this log — not its purpose.

Currently only `report` domain events are in scope. The schema and module are designed to extend
to other entity types (`expense`, `attachment`, `member`, etc.) without structural changes.

---

## Alignment with the tRPC architecture

| Convention | Status |
|---|---|
| Module layout (service / repository / dto / policy / validators) | Followed |
| Thin router — parse input → call service → return DTO | Followed |
| Cursor pagination | Followed |
| DTO with Zod output schema | Followed |
| Centralized Prisma error mapping | Followed |
| Policy module for authorization | Followed |
| Tenant scoping stays explicit (no global `$extends`) | Same deliberate deviation as report slice |
| **Audit writes go through the event bus** | **Intentional deviation — see below** |

### Deviation: synchronous writes, not event-bus subscriber

`trpc-architecture.md` (cross-cutting conventions) states: *"Audit logging is a single
event-bus subscriber, not scattered calls with inconsistent event names."*

That target is correct **when backed by a durable transactional outbox**. The current
`EventBus` (`shared/events/bus.ts`) is explicitly documented as non-durable:

> "if the process crashes after the DB commit but before a handler runs, [the event] is lost.
> Acceptable for now (emails are best-effort notifications)."

Data loss is acceptable for email. It is **not** acceptable for an audit trail. A record that
says "report was accepted" must survive a process restart.

Until the transactional outbox is implemented, audit events are written **synchronously inside
the same `db.$transaction` as the triggering mutation**. When the outbox ships, the correct
migration is:

1. Services emit a domain event that carries the full diff.
2. The outbox commits the event payload in the same transaction.
3. A single audit subscriber (event bus handler, drained from outbox) writes to `audit_event`.

This migration will not change the `AuditRepository` interface or the `audit_event` schema.

---

## Data model

```prisma
model AuditEvent {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  actorId        String
  actor          User         @relation(fields: [actorId], references: [id], onDelete: Restrict)
  entityType     String       // "report" | "expense" | "attachment" | ...
  entityId       String       // the primary key of the affected entity
  action         String       // "<entityType>.<verb>", e.g. "report.status_changed"
  diff           Json?        // { before: {...} | null, after: {...} | null }
  payload        Json?        // action-specific context outside the before/after diff
  createdAt      DateTime     @default(now())

  @@index([organizationId, createdAt])
  @@index([entityType, entityId, createdAt])
  @@index([actorId])
  @@map("audit_event")
}
```

### Field semantics

**`entityType` + `entityId`** — polymorphic reference to the affected record. Decouples the
audit table from any specific Prisma model. New entity types require no schema change.

**`action`** — free-form string using the convention `"<entityType>.<verb>"`. A string (not a DB
enum) means new actions can be introduced without a migration. Application-layer Zod validators
enforce a known-action discriminated union at write time; unknown actions seen at read time are
mapped to a safe generic DTO.

**`diff`** — always shaped as `{ before: Record<string, unknown> | null, after: Record<string, unknown> | null }`.
`before: null` for creation events; `after: null` for deletion events; `null` entirely for
comments and any event where before/after does not apply.

**`payload`** — action-specific content that does not fit into a diff: e.g., a comment's text,
the `notify` flag on a status transition. Kept separate from `diff` so the two concerns don't
merge into an opaque blob.

> **Constraint:** Banking details (IBAN, full name) must never appear in `diff` or `payload`.
> They are encrypted in `BankingDetails` and must remain there.

---

## Action taxonomy

| `entityType` | `action` | `diff.before` | `diff.after` | `payload` |
|---|---|---|---|---|
| `report` | `report.created` | `null` | `null` | `{ title, costUnitId, bankingDetailsId }` |
| `report` | `report.updated` | `{ title?, description? }` | `{ title?, description? }` | — |
| `report` | `report.deleted` | `{ title, status }` | `null` | — |
| `report` | `report.status_changed` | `{ status }` | `{ status }` | `{ notify?: boolean }` |
| `report` | `report.comment_added` | `null` | `null` | `{ text: string }` |
| `expense` | `expense.added` | `null` | `null` | `{ expenseId, type, amount }` |
| `expense` | `expense.updated` | `{ amount?, type?, ... }` | `{ amount?, type?, ... }` | — |
| `expense` | `expense.deleted` | `{ expenseId, type, amount }` | `null` | — |
| `attachment` | `attachment.added` | `null` | `null` | `{ attachmentId, fileName, expenseId }` |
| `attachment` | `attachment.deleted` | `{ attachmentId, fileName, expenseId }` | `null` | — |

Only changed fields are included in `diff.before` / `diff.after` for update events — not the
full entity snapshot.

---

## Server module layout

```
apps/web/src/server/modules/audit/
├── audit.repository.ts    — append(), listPage()
├── audit.service.ts       — addComment(), listForReport()
├── audit.dto.ts           — AuditEventDTO, Zod output schema, toAuditEventDTO()
├── audit.validators.ts    — per-action Zod schemas (discriminated union on `action`)
├── audit.policy.ts        — who may read the trail / post a comment
└── index.ts               — barrel export
```

### Repository interface

```ts
interface AuditRepository {
  append(db: PrismaClient, entry: NewAuditEntry): Promise<void>;
  listPage(db: PrismaClient, args: {
    entityType: string;
    entityIds: string[];   // supports querying across report + its child entities
    cursor?: string;
    take: number;
  }): Promise<AuditEventRow[]>;
}
```

`append` is the only write path. No `update` or `delete` method exists. Immutability is
enforced at the repository boundary — callers have no interface surface to mutate records.

---

## Integration with existing services

`AuditRepository` is injected into `createReportService`, `createExpenseService`, and
`createAttachmentService` alongside their existing dependencies:

```ts
export function createReportService(deps: {
  repo: ReportRepository;
  events: ReportEventEmitter;
  audit: AuditRepository;   // new
}) { ... }
```

Each mutating method writes both the business record and the audit entry inside a single
`db.$transaction`:

```ts
async transition(ctx, report, input) {
  assertAdminTransition(report.status, input.status);

  await ctx.db.$transaction([
    deps.repo.setStatus(ctx.db, { id: report.id, status: input.status }),
    deps.audit.append(ctx.db, {
      organizationId: ctx.organizationId,
      actorId: ctx.userId,
      entityType: "report",
      entityId: report.id,
      action: "report.status_changed",
      diff: { before: { status: report.status }, after: { status: input.status } },
      payload: { notify: input.notify ?? false },
    }),
  ]);

  deps.events.emit("report.status_changed", { ... });
  return { id: report.id, status: input.status };
}
```

The event bus `emit` call remains — it drives email notifications. Audit and email are separate
concerns handled separately; neither depends on the other succeeding.

---

## tRPC router

```
apps/web/src/server/api/routers/audit.ts
```

```ts
export const auditRouter = createTRPCRouter({
  // Full audit trail: report + all child entity events (expenses, attachments)
  list: reportProcedure("read")
    .input(z.object({
      cursor: z.string().optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }))
    .query(({ ctx, input }) =>
      auditService.list(toAuditServiceContext(ctx), ctx.report.id, input),
    ),

  // Report-level events only: status changes, field edits, comments — no expense/attachment noise
  history: reportProcedure("read")
    .input(z.object({
      cursor: z.string().optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }))
    .query(({ ctx, input }) =>
      auditService.history(toAuditServiceContext(ctx), ctx.report.id, input),
    ),

  // Standalone comment posted by any actor with read access
  addComment: reportProcedure("read")
    .input(z.object({ text: z.string().min(1).max(2000) }))
    .mutation(({ ctx, input }) =>
      auditService.addComment(toAuditServiceContext(ctx), ctx.report.id, input.text),
    ),
});
```

`reportProcedure("read")` already enforces org membership and report ownership / admin access.
No new auth logic is required at the router level.

`list` queries events across the report and all its child entity IDs (expenses, attachments).
The repository resolves this via a list of `entityId`s — no UNION query required because all
rows live in `audit_event`.

`history` filters to `entityType: "report"` only, returning status transitions, field edits,
and comments. Suited for compact sidebar or status-history views where expense and attachment
events would be noise.

---

## Access control

| Actor | Read audit trail | Post comment |
|---|---|---|
| Report owner | Yes | Yes — at any status |
| Org admin / reviewer | Yes | Yes — at any status |
| Other org members | No | No |

Comment posting has no status gate. The owner may comment on a rejected or accepted report. The
record is immutable once written.

---

## Indexes and performance

```
@@index([organizationId, createdAt])      — org-level audit queries (future)
@@index([entityType, entityId, createdAt]) — primary read: all events for entity X, ordered
@@index([actorId])                         — actor-level queries (future)
```

The `[entityType, entityId, createdAt]` index covers the only current read pattern: fetch all
events for a given report (and its children), ordered chronologically with cursor pagination.
Reads are always scoped to a bounded set of `entityId`s; no full-table scans occur.

The table is append-only and grows indefinitely. Pagination is mandatory on the read endpoint.
Archival or partitioning by `organizationId` is premature until volume warrants it.

---

## Extensibility

To add audit coverage for a new entity (e.g., `CostUnit`):

1. Add new action strings to `audit.validators.ts` — no DB migration.
2. Inject `AuditRepository` into the relevant service.
3. Write audit entries inside the service's `db.$transaction` calls.
4. Add a tRPC query procedure scoped to the appropriate access guard.

No structural changes to the schema or the audit module are needed.

---

## Open questions

- **Outbox timeline:** When the transactional outbox ships, the audit subscriber should be
  introduced at that point to keep audit writes consistent with the rest of the side-effect
  model. The `AuditRepository.append` interface does not change.
