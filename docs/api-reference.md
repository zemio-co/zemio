# API Reference (tRPC)

The Spesen Tool uses [tRPC](https://trpc.io/) to provide a type-safe API for both client and server.

## Overview

The API is structured into several routers, each handling a specific domain of the application. The root router is located at `src/server/api/root.ts`.

### Base URL
All tRPC requests are handled at the `/api/trpc` endpoint.

---

## Routers

### `report`
Handles the lifecycle of expense reports.
- **`create`**: Create a new report draft.
- **`submit`**: Submit a draft report for review.
- **`getById`**: Fetch a specific report with its expenses.
- **`listOwn`**: List reports owned by the current user.
- **`delete`**: Remove a draft report.

### `expense`
Manages individual expenses within a report.
- **`add`**: Add an expense (Receipt, Travel, or Food) to a report.
- **`update`**: Modify an existing expense.
- **`delete`**: Remove an expense from a report.
- **`listByReportId`**: Fetch all expenses for a given report.

### `admin`
Privileged operations for reviewers and superusers.
- **`listPending`**: List all reports awaiting approval.
- **`review`**: Approve or reject a report.
- **`listUsers`**: Manage system users.
- **`updateSettings`**: Update global settings like kilometer rates or deductions.

### `costUnit`
Management of accounting units and groups.
- **`list`**: Fetch all available cost units.
- **`create`**: Add a new cost unit.
- **`createGroup`**: Create a category for cost units.

### `user`
User-specific settings and preferences.
- **`getMe`**: Fetch the current user's profile and roles.
- **`updatePreferences`**: Change notification settings.

---

## Usage Examples

### Client-side (React)

Using the `api` hook from `src/trpc/react.tsx`:

```tsx
import { api } from "@/trpc/react";

function CreateReportButton() {
  const createReport = api.report.create.useMutation({
    onSuccess: (report) => {
      console.log("Report created:", report.id);
    },
  });

  return (
    <button onClick={() => createReport.mutate({ title: "Business Trip" })}>
      New Report
    </button>
  );
}
```

### Server-side (Server Components)

Using the `api` caller from `src/trpc/server.ts`:

```tsx
import { api } from "@/trpc/server";

export default async function ReportsPage() {
  const reports = await api.report.listOwn.query();

  return (
    <ul>
      {reports.map(report => (
        <li key={report.id}>{report.title}</li>
      ))}
    </ul>
  );
}
```

## Error Handling

The API uses standard tRPC error codes:
- `UNAUTHORIZED`: When a user is not logged in.
- `FORBIDDEN`: When a user lacks the required role (e.g., trying to access `admin` routes).
- `NOT_FOUND`: When a requested resource does not exist.
- `BAD_REQUEST`: When input validation (Zod) fails.
