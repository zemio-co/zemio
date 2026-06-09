# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Project: Zemio

Expense-report application for student initiatives.

### Stack

- **Framework:** Next.js 16 App Router, React 19, TypeScript
- **API:** tRPC v11 — all app logic goes through `src/server/api/routers/` (exceptions: Better Auth handler, file upload/download routes)
- **ORM:** Prisma 7 with generated client at `packages/db/src/generated/prisma`
- **Auth:** Better Auth with Microsoft OAuth only (no email/password)
- **Frontend state:** TanStack Query, TanStack Table, nuqs (URL state), TanStack Form
- **Styling:** Tailwind v4
- **Linting/formatting:** Biome
- **Validation:** `bun run typecheck` and `bun run check` (no automated test suite)

### Architecture conventions

- `src/app` pages are thin server components: prefetch via `src/trpc/server`, wrap clients in `HydrateClient`
- Feature modules under `src/modules/` own UI behavior; they access the API via `src/trpc/react`
- tRPC procedure hierarchy: `publicProcedure` → `authenticatedProcedure` → `protectedProcedure` (legal gate) → `orgProcedure` → `orgAdminProcedure` → `platformAdminProcedure`

### Data model

- Core: `Report → Expense → Attachment`
- `Report` statuses: `DRAFT` → `PENDING_APPROVAL` → `NEEDS_REVISION` / `ACCEPTED` / `REJECTED`
- Multi-tenancy: `Organization`, `Member`, `Invitation`; roles: `owner` / `admin` / `member`
- `BankingDetails` are encrypted field-by-field (AES-256-GCM) in `src/lib/banking/cryptic.ts`
- `Settings` are org-scoped and upserted on read
- `CostUnit` unique by `organizationId + tag`; may belong to `CostUnitGroup`

### Auth & tenancy

- Microsoft OAuth only; tenant id (`microsoftTenantId`) auto-maps users to matching orgs on login
- Active org is `session.activeOrganizationId`; tRPC context resolves `activeMember` from it
- Legal acceptance (`CURRENT_LEGAL_RELEASE = 2026-04-14.1`) is a hard gate for `protectedProcedure`

### Report lifecycle

- Only the owner may edit/delete reports and expenses while status is `DRAFT` or `NEEDS_REVISION`
- `submit` (owner-only): moves to `PENDING_APPROVAL`, emails org reviewer
- `updateStatus` (org admin): advances status, optionally notifies owner
- `exportToPdf`: decrypts banking details, renders via `src/server/pdf/summary.ts`

### Storage

- S3-compatible presigned uploads; keys: `attachment/{organizationId}/{uuid.ext}`
- Max 5 files, 5 MB each per upload
- Settings PDFs uploaded separately to `public/uploads/settings` (max 10 MB)

### Frontend module patterns

- Reports UI: `src/modules/reports/` — TanStack Table, nuqs-backed pagination/sorting/filters, server-validated by `src/server/api/routers/report-list-query.ts`
- Forms: TanStack Form + local Zod schemas from `src/lib/validators/`
- Admin review UI: `src/modules/review/` (newer); older duplicates exist under `src/app/(app)/admin/review` and `src/app/(app)/reports/[id]`