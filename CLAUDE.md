# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Start dev server (Turbopack)
pnpm build            # Production build
pnpm check            # Biome lint + format check
pnpm check:write      # Auto-fix lint/format issues
pnpm typecheck        # TypeScript type checking

pnpm db:generate      # Run prisma migrate dev + generate client
pnpm db:push          # Push schema changes without migration
pnpm db:studio        # Open Prisma Studio

pnpm auth:generate    # Regenerate Better Auth schema from server config
pnpm email:preview    # Preview email templates (port 3030)
```

There are no automated tests in this project.

## Architecture

This is a Next.js 16 app (App Router) for expense report management within student initiatives. It uses the T3 stack pattern: tRPC + Prisma + TypeScript.

### Key stack
- **Auth**: `better-auth` with Microsoft OAuth only (email/password disabled). Multi-tenant via `organization` plugin. Session includes `activeOrganizationId`.
- **API**: tRPC v11 routers under `src/server/api/routers/`. All client-server communication goes through tRPC — never raw API routes.
- **DB**: Prisma ORM targeting PostgreSQL (Neon adapter available). Client generated to `src/generated/prisma/`.
- **Frontend**: React 19, TanStack Query v5, TanStack Table v8, nuqs for URL state, Tailwind v4, Biome for linting/formatting.

### tRPC procedure hierarchy
```
publicProcedure          — no auth required
authenticatedProcedure   — session required
protectedProcedure       — session + legal docs accepted
orgProcedure             — + active organization (adds ctx.organizationId, ctx.orgRole)
orgAdminProcedure        — + org admin/owner role
platformAdminProcedure   — + user.role === "admin" (platform-level superadmin)
```

### Source layout

```
src/
  app/                   # Next.js routes (App Router)
    (app)/               # Authenticated app shell
      admin/             # Org admin view — reviews all org reports
      reports/           # User view — own reports
    api/trpc/            # tRPC HTTP handler
    api/auth/            # Better Auth handler
  modules/               # Feature modules (UI logic)
    reports/             # User-facing report list, table, navbar
    admin/               # Admin-facing report review
    dashboard/           # Summary dashboard
    settings/            # User/org settings UI
  server/
    api/                 # tRPC routers + context (trpc.ts, root.ts)
    better-auth/         # Auth config, AC roles, invitation emails
    pdf/                 # PDF generation (pdfkit)
    storage/             # S3 file upload/presign
    resend/              # Transactional email
  components/
    ui/                  # Primitive UI components (button, dialog, etc.)
    data/                # Data table primitives (filter-menu, filter-types, display-options)
    forms/               # TanStack Form-based forms
    emails/              # React Email templates
  trpc/
    react.tsx            # Client-side TRPCReactProvider + `api` export
    server.ts            # Server-side `api` caller for RSCs + HydrateClient
  generated/prisma/      # Auto-generated Prisma client (do not edit)
```

### Page ↔ module pattern
Pages in `src/app/(app)/` are thin — they prefetch data via `api.*` (server caller) and render `<HydrateClient>` wrapping a feature component from `src/modules/`. Feature modules own the actual UI logic and use `api` from `src/trpc/react` for client queries.

### Data tables
Tables use TanStack Table. Columns are defined in `*-columns.tsx` files co-located with their table component. Filters are URL-state-backed via `nuqs`. The `src/components/data/` primitives (`FilterMenu`, `FilterList`, `DisplayOptions`) are shared across table features.

### Role model
Two role axes:
1. **Platform role** (`user.role`): `"admin"` = platform superadmin, regular users have no role field value.
2. **Org role** (`member.role`): `owner > admin > member`. Org admin/owner can read all reports in their org (`report: ["readAll"]` permission in `src/server/better-auth/ac/organization.ts`).

### Formatting
Biome is the linter and formatter (tabs, width 1). Run `pnpm check:write` before committing. Husky + lint-staged enforce this on commit. Import order is auto-organized by Biome.
