# Multi-Tenancy Migration Guide

This guide covers the complete migration of zemio from a single-tenant to a multi-tenant architecture using Better Auth's organization plugin. Since there is no existing data to migrate, all steps are purely additive.

---

## Overview

**What changes:**
- Better Auth gains the `organization` plugin — it manages orgs, memberships, invitations, and active-org session state
- Four new database tables: `organization`, `member`, `invitation`, and two new fields on `session`
- Domain models (`Report`, `CostUnit`, `CostUnitGroup`, `Settings`) get an `organizationId` column
- tRPC context gains the active organization; all procedures filter by it
- The concept of "admin" shifts from a global role to an **org-level role** (`owner`/`admin`)
- A new onboarding flow handles org creation and invitation acceptance

**Role mapping:**

| Old | New |
|---|---|
| `user` (global) | `member` (org-level) |
| `admin` (global) | `admin` or `owner` (org-level) |

---

## Step 1 — Add the Organization Plugin to Better Auth

**File:** `src/server/better-auth/server.ts`

```ts
import { betterAuth } from "better-auth";
import { adminPlugin, organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/server/db";
import { env } from "@/env";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  trustedOrigins: [env.BETTER_AUTH_URL, "http://localhost:3000"],
  emailAndPassword: { enabled: false },
  socialProviders: {
    microsoft: {
      clientId: env.MICROSOFT_CLIENT_ID,
      clientSecret: env.MICROSOFT_CLIENT_SECRET,
      tenantId: env.MICROSOFT_TENANT_ID,
      authority: "https://login.microsoftonline.com",
      prompt: "select_account",
    },
  },
  plugins: [
    adminPlugin(),
    nextCookies(),
    organization({
      allowUserToCreateOrganization: true,

      // Auto-send invitation email via Resend
      sendInvitationEmail: async (data) => {
        // See Step 10 for the implementation
        await sendOrgInvitationEmail(data);
      },

      organizationHooks: {},
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await db.preferences.create({
            data: { userId: user.id, notifications: "ALL" },
          });
        },
      },
    },
    session: {
      create: {
        // Auto-select the user's first org when they sign in
        before: async (session) => {
          const member = await db.member.findFirst({
            where: { userId: session.userId },
            orderBy: { createdAt: "asc" },
          });
          return {
            data: {
              ...session,
              activeOrganizationId: member?.organizationId ?? null,
            },
          };
        },
      },
    },
  },
});
```

> **Note:** `db.member` will exist after Step 3 when you run the Prisma migration.

---

## Step 2 — Update the Prisma Schema

**File:** `prisma/schema.prisma`

### 2a — Add Better Auth organization tables

These four blocks are the tables the organization plugin needs. Add them alongside your existing Better Auth tables.

```prisma
// ── Better Auth: Organization Plugin ────────────────────────────

model Organization {
  id          String   @id
  name        String
  slug        String   @unique
  logo        String?
  metadata    String?
  createdAt   DateTime

  members     Member[]
  invitations Invitation[]

  // App domain
  reports        Report[]
  costUnits      CostUnit[]
  costUnitGroups CostUnitGroup[]
  settings       Settings?

  @@map("organization")
}

model Member {
  id             String       @id
  userId         String
  organizationId String
  role           String       // "owner" | "admin" | "member"
  createdAt      DateTime

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@map("member")
}

model Invitation {
  id             String       @id
  email          String
  inviterId      String
  organizationId String
  role           String?
  status         String       // "pending" | "accepted" | "rejected" | "canceled"
  expiresAt      DateTime
  createdAt      DateTime

  inviter      User         @relation(fields: [inviterId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@map("invitation")
}
```

### 2b — Add `activeOrganizationId` to the Session table

```prisma
model Session {
  id                   String    @id
  expiresAt            DateTime
  token                String    @unique
  userId               String
  ipAddress            String?
  userAgent            String?
  impersonatedBy       String?
  activeOrganizationId String?   // ← NEW

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("session")
}
```

### 2c — Add relations to the User model

```prisma
model User {
  // ... existing fields ...
  invitationsSent Invitation[] // ← NEW
  members         Member[]     // ← NEW
}
```

### 2d — Add `organizationId` to domain models

**Report:**
```prisma
model Report {
  // ... existing fields ...
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

**CostUnit:**
```prisma
model CostUnit {
  // ... existing fields ...
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

**CostUnitGroup:**
```prisma
model CostUnitGroup {
  // ... existing fields ...
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

**Settings** — replace the global singleton with a per-org record:

```prisma
model Settings {
  id                   String       @id @default(cuid())
  organizationId       String       @unique   // ← replaces the hardcoded "singleton" id
  organization         Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  kilometerRate        Decimal      @default(0.30)
  reviewerEmail        String?
  costUnitInfoUrl      String?
  dailyFoodAllowance   Decimal      @default(0.00)
  breakfastDeduction   Decimal      @default(0.00)
  lunchDeduction       Decimal      @default(0.00)
  dinnerDeduction      Decimal      @default(0.00)
}
```

> `BankingDetails` and `Preferences` remain user-scoped — they do not need `organizationId`.

---

## Step 3 — Run the Migration

```bash
npx prisma migrate dev --name add-multi-tenancy
```

This creates the four new tables and adds the `organizationId` and `activeOrganizationId` columns.

---

## Step 4 — Update the Auth Client

**File:** `src/server/better-auth/client.ts`

```ts
import { createAuthClient } from "better-auth/client";
import { adminClient, organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    adminClient(),
    organizationClient(), // ← NEW
  ],
});
```

---

## Step 5 — Update the tRPC Context

**File:** `src/server/api/trpc.ts`

The context now resolves the active organization from the session and verifies the user is actually a member of it.

```ts
import { auth } from "@/server/better-auth/server";
import { db } from "@/server/db";
import { initTRPC, TRPCError } from "@trpc/server";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth.api.getSession({ headers: opts.headers });

  // Resolve active org membership from session
  let activeMember: { id: string; role: string; organizationId: string } | null = null;
  if (session?.session.activeOrganizationId && session.user) {
    activeMember = await db.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId: session.session.activeOrganizationId,
      },
      select: { id: true, role: true, organizationId: true },
    });
  }

  return {
    db,
    session,
    activeMember, // null if not in an org
    headers: opts.headers,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create();

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

// Requires a valid session
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

// Requires active org membership
export const orgProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.activeMember) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No active organization. Select or create one.",
    });
  }
  return next({
    ctx: {
      ...ctx,
      organizationId: ctx.activeMember.organizationId,
      orgRole: ctx.activeMember.role,
    },
  });
});

// Requires org-level admin or owner role
export const orgAdminProcedure = orgProcedure.use(({ ctx, next }) => {
  if (ctx.orgRole !== "admin" && ctx.orgRole !== "owner") {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});
```

> The old `adminProcedure` (which checked the global `role` field) is replaced by `orgAdminProcedure`. Remove `adminProcedure` once all routers are updated.

---

## Step 6 — Update All tRPC Routers

Every router that reads or writes domain data must be scoped to `ctx.organizationId`. Below are concrete changes for each router.

### `report` router

Replace `protectedProcedure` / `adminProcedure` with `orgProcedure` / `orgAdminProcedure` and add `organizationId` to every query.

```ts
// getAll — user sees only their own reports within the active org
getAll: orgProcedure.query(({ ctx }) =>
  ctx.db.report.findMany({
    where: {
      organizationId: ctx.organizationId,
      ownerId: ctx.session.user.id,
    },
  })
),

// getById — org admins can see all reports in the org
getById: orgProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ ctx, input }) => {
    const report = await ctx.db.report.findUnique({ where: { id: input.id } });
    if (!report || report.organizationId !== ctx.organizationId) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    const isOrgAdmin = ctx.orgRole === "admin" || ctx.orgRole === "owner";
    if (!isOrgAdmin && report.ownerId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return report;
  }),

// create — always scoped to current org
create: orgProcedure
  .input(createReportSchema)
  .mutation(({ ctx, input }) =>
    ctx.db.report.create({
      data: {
        ...input,
        ownerId: ctx.session.user.id,
        organizationId: ctx.organizationId, // ← NEW
      },
    })
  ),
```

Apply the same `where: { organizationId: ctx.organizationId }` pattern to every `findMany`, `findUnique`, `create`, `update`, and `delete` in the report router.

### `admin` router

```ts
listAllPaginated: orgAdminProcedure
  .input(paginationSchema)
  .query(({ ctx, input }) =>
    ctx.db.report.findMany({
      where: { organizationId: ctx.organizationId, ...buildFilters(input) },
    })
  ),
```

### `costUnit` router

```ts
list: orgProcedure.query(({ ctx }) =>
  ctx.db.costUnit.findMany({ where: { organizationId: ctx.organizationId } })
),

create: orgAdminProcedure
  .input(createCostUnitSchema)
  .mutation(({ ctx, input }) =>
    ctx.db.costUnit.create({
      data: { ...input, organizationId: ctx.organizationId },
    })
  ),
```

### `settings` router

The global singleton `id: "singleton"` is replaced with a per-org lookup.

```ts
get: orgProcedure.query(async ({ ctx }) => {
  return ctx.db.settings.upsert({
    where: { organizationId: ctx.organizationId },
    create: { organizationId: ctx.organizationId },
    update: {},
  });
}),

update: orgAdminProcedure
  .input(updateSettingsSchema)
  .mutation(({ ctx, input }) =>
    ctx.db.settings.upsert({
      where: { organizationId: ctx.organizationId },
      create: { organizationId: ctx.organizationId, ...input },
      update: input,
    })
  ),
```

### `user` router

Member promotion/demotion becomes org-scoped via the Better Auth API:

```ts
setMemberRole: orgAdminProcedure
  .input(z.object({ memberId: z.string(), role: z.enum(["admin", "member"]) }))
  .mutation(async ({ ctx, input }) => {
    await auth.api.updateMemberRole({
      body: {
        memberId: input.memberId,
        role: input.role,
        organizationId: ctx.organizationId,
      },
      headers: ctx.headers,
    });
  }),
```

### `bankingDetails` and `preferences` routers

These remain user-scoped. No changes needed — keep them on `protectedProcedure`.

---

## Step 7 — Update Server-Side Auth Guards

### App layout

**File:** `src/app/(app)/layout.tsx`

```tsx
export default async function AppLayout({ children }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect(ROUTES.AUTH);

  // If the user has no org membership at all, send them to onboarding
  const memberCount = await db.member.count({
    where: { userId: session.user.id },
  });

  if (memberCount === 0) redirect(ROUTES.ONBOARDING);

  return (
    <SidebarProvider>
      <AppSidebar />
      <div>
        <SiteHeader />
        {children}
      </div>
    </SidebarProvider>
  );
}
```

### Admin layout

**File:** `src/app/(app)/admin/layout.tsx`

```tsx
export default async function AdminLayout({ children }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(ROUTES.AUTH);

  const member = await db.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId: session.session.activeOrganizationId ?? "",
    },
  });

  if (!member || (member.role !== "admin" && member.role !== "owner")) {
    redirect(ROUTES.USER_DASHBOARD);
  }

  return <>{children}</>;
}
```

---

## Step 8 — Add an Org Switcher to the Sidebar

**File:** `src/components/org-switcher.tsx`

```tsx
"use client";

import { authClient } from "@/server/better-auth/client";

export function OrgSwitcher() {
  const { data: orgs } = authClient.useListOrganizations();
  const { data: activeOrg } = authClient.useActiveOrganization();

  const switchOrg = async (orgId: string) => {
    await authClient.organization.setActive({ organizationId: orgId });
    window.location.reload(); // reload to refresh server-side session state
  };

  return (
    <select
      value={activeOrg?.id ?? ""}
      onChange={(e) => switchOrg(e.target.value)}
    >
      {orgs?.map((org) => (
        <option key={org.id} value={org.id}>
          {org.name}
        </option>
      ))}
    </select>
  );
}
```

Add `<OrgSwitcher />` to `AppSidebar` near the user menu.

---

## Step 9 — Build the Onboarding Flow

Users who have no organization membership land here after sign-in.

**File:** `src/app/onboarding/page.tsx`

```tsx
"use client";

import { authClient } from "@/server/better-auth/client";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export default function OnboardingPage() {
  const router = useRouter();

  const createOrg = async (name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    const { error } = await authClient.organization.create({ name, slug });
    if (!error) router.push(ROUTES.USER_DASHBOARD);
  };

  return (
    <div>
      <h1>Create your organization</h1>
      <OrganizationCreateForm onSubmit={createOrg} />
    </div>
  );
}
```

Add `ROUTES.ONBOARDING = "/onboarding"` to your routes constants. This page must be outside the `(app)` layout group so it is accessible without an active org.

---

## Step 10 — Wire Up Invitation Emails

**File:** `src/server/better-auth/invitations.ts`

```ts
import { resend } from "@/server/resend";

export async function sendOrgInvitationEmail(data: {
  email: string;
  inviter: { name: string };
  organization: { name: string };
  invitation: { id: string };
}) {
  const acceptUrl = `${process.env.BETTER_AUTH_URL}/accept-invitation/${data.invitation.id}`;

  await resend.emails.send({
    from: "noreply@yourdomain.com",
    to: data.email,
    subject: `You've been invited to ${data.organization.name}`,
    html: `
      <p>${data.inviter.name} has invited you to join <strong>${data.organization.name}</strong>.</p>
      <p><a href="${acceptUrl}">Accept Invitation</a></p>
      <p>This link expires in 48 hours.</p>
    `,
  });
}
```

Import and use this in the `sendInvitationEmail` option in Step 1.

### Invitation acceptance page

**File:** `src/app/accept-invitation/[id]/page.tsx`

```tsx
"use client";

import { authClient } from "@/server/better-auth/client";
import { useParams, useRouter } from "next/navigation";

export default function AcceptInvitationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const accept = async () => {
    const { error } = await authClient.organization.acceptInvitation({
      invitationId: id,
    });
    if (!error) router.push("/");
  };

  return (
    <div>
      <h1>Accept Invitation</h1>
      <button onClick={accept}>Accept & Join</button>
    </div>
  );
}
```

Because users authenticate via Microsoft OAuth, the flow is: user receives email → clicks link → signs in with Microsoft → accepts invitation → `activeOrganizationId` is set automatically.

---

## Step 11 — Add Organization Management UI

Better Auth exposes a full org API via `authClient.organization`. Build these admin screens:

### Member management

```tsx
"use client";
import { authClient } from "@/server/better-auth/client";

export function MemberList() {
  const { data: org } = authClient.useActiveOrganization();
  const members = org?.members ?? [];

  const invite = (email: string) =>
    authClient.organization.inviteMember({
      email,
      role: "member",
      organizationId: org!.id,
    });

  const remove = (memberId: string) =>
    authClient.organization.removeMember({ memberIdOrEmail: memberId });

  const promote = (memberId: string) =>
    authClient.organization.updateMemberRole({ memberId, role: "admin" });

  // Render member list with actions...
}
```

### Update org name / logo

```ts
authClient.organization.update({
  organizationId: activeOrg.id,
  data: { name: newName },
});
```

---

## Step 12 — Update the Admin Sidebar Check

**File:** `src/components/app-sidebar-admin.tsx`

```tsx
"use client";
import { authClient } from "@/server/better-auth/client";

export function AppSidebarAdmin() {
  const { data: activeOrg } = authClient.useActiveOrganization();
  const { data: session } = authClient.useSession();

  const myMember = activeOrg?.members?.find(
    (m) => m.userId === session?.user.id
  );
  const isOrgAdmin = myMember?.role === "admin" || myMember?.role === "owner";

  if (!isOrgAdmin) return null;

  return <AdminNavigation />;
}
```

---

## Step 13 — Remove the Old Global Admin Checks

Search for every usage of the global `role` field used for application-level authorization and replace them:

```bash
grep -r "user\.role" src/
grep -r "role.*admin" src/server/api/
```

- `user.role === "admin"` → check `orgRole === "admin" || orgRole === "owner"` from tRPC context
- `adminProcedure` → replace with `orgAdminProcedure`

The global `role` field on `User` can remain for a potential platform superuser concept (tied to `SUPERUSER_ID`), but it must not gate access to any org-level features.

---

## Summary of All Changed Files

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `Organization`, `Member`, `Invitation`; add `activeOrganizationId` to `Session`; add `organizationId` to `Report`, `CostUnit`, `CostUnitGroup`, `Settings` |
| `src/server/better-auth/server.ts` | Add `organization()` plugin, session hook for auto-org |
| `src/server/better-auth/client.ts` | Add `organizationClient()` plugin |
| `src/server/better-auth/invitations.ts` | New file — invitation email sender |
| `src/server/api/trpc.ts` | Add `activeMember` to context, new `orgProcedure` and `orgAdminProcedure` |
| `src/server/api/routers/report.ts` | Filter all queries by `organizationId`, use `orgProcedure` |
| `src/server/api/routers/admin.ts` | Filter by `organizationId`, use `orgAdminProcedure` |
| `src/server/api/routers/cost-unit.ts` | Filter by `organizationId` |
| `src/server/api/routers/settings.ts` | Per-org upsert instead of singleton |
| `src/server/api/routers/user.ts` | Replace global role with org member role via `auth.api` |
| `src/app/(app)/layout.tsx` | Redirect to `/onboarding` if no org membership |
| `src/app/(app)/admin/layout.tsx` | Check org-level role instead of `user.role` |
| `src/app/onboarding/page.tsx` | New — org creation page |
| `src/app/accept-invitation/[id]/page.tsx` | New — invitation acceptance page |
| `src/components/org-switcher.tsx` | New — org switcher dropdown |
| `src/components/app-sidebar-admin.tsx` | Check `orgRole` instead of `user.role` |
