# Configuration Guide

The Spesen Tool uses a two-tier configuration system designed for security and flexibility.

## Configuration Tiers

### 1. Config File (`config.ts`)
Used for non-sensitive settings that vary between environments but are not secrets. This file can be version-controlled or mounted in a container.
- **Path**: Root of the project (`/config.ts`).
- **Template**: `config.example.ts`.
- **Validation**: Checked against `configSchema` in `src/lib/config/schema.ts`.

### 2. Environment Variables (`.env`)
Used for sensitive secrets and system-level overrides.
- **Path**: Root of the project (`/.env`).
- **Template**: `.env.example`.

---

## Configuration Reference

### Application Settings (`app`)

| Config Key | Env Variable | Required | Description |
|------------|--------------|----------|-------------|
| `app.name` | - | No | Name displayed in UI. Default: "Spesen Tool" |
| `app.url` | `BETTER_AUTH_URL` | **Yes** | Public URL of the app (e.g., `https://expenses.example.com`) |
| `app.superuserId` | `SUPERUSER_ID` | **Yes** | The `userId` of the primary administrator |

### Database Settings (`database`)

| Config Key | Env Variable | Required | Description |
|------------|--------------|----------|-------------|
| `database.url` | `DATABASE_URL` | **Yes** | PostgreSQL connection string |
| `database.logging` | - | No | Prisma log levels (e.g., `["query", "error"]`) |

### Authentication Settings (`auth`)

| Config Key | Env Variable | Required | Description |
|------------|--------------|----------|-------------|
| `auth.microsoft.clientId` | `MICROSOFT_CLIENT_ID` | **Yes** | Azure AD Application (client) ID |
| `auth.microsoft.tenantId` | `MICROSOFT_TENANT_ID` | **Yes** | Azure AD Tenant ID |
| - | `MICROSOFT_CLIENT_SECRET` | **Yes** | Azure AD Client Secret (Secret) |
| - | `BETTER_AUTH_SECRET` | **Yes** | JWT signing secret for Better-Auth |

### Storage Settings (`storage`)

| Config Key | Env Variable | Required | Description |
|------------|--------------|----------|-------------|
| `storage.host` | `STORAGE_HOST` | **Yes** | S3-compatible host (e.g., `s3.amazonaws.com`) |
| `storage.region` | `STORAGE_REGION` | **Yes** | S3 region (e.g., `eu-central-1`) |
| `storage.bucket` | `STORAGE_BUCKET` | **Yes** | Name of the bucket for uploads |
| - | `STORAGE_ACCESS_KEY_ID` | **Yes** | S3 Access Key ID (Secret) |
| - | `STORAGE_ACCESS_KEY` | **Yes** | S3 Secret Access Key (Secret) |

### Email Settings (`email`)

| Config Key | Env Variable | Required | Description |
|------------|--------------|----------|-------------|
| `email.from` | `EMAIL_FROM` | **Yes** | Sender email address |
| `email.replyTo` | - | No | Reply-to email address |
| - | `RESEND_API_KEY` | **Yes** | API key for Resend service (Secret) |

---

## External Service Setup

### 1. Microsoft Azure AD
1. Register a new app in [Azure Portal](https://portal.azure.com) > App Registrations.
2. Set Redirect URI: `https://YOUR_DOMAIN/api/auth/callback/microsoft`.
3. Add `User.Read` API permission (delegated).
4. Create a Client Secret and save it.

### 2. S3-compatible Storage (e.g., AWS S3, MinIO)
1. Create a bucket.
2. Ensure the bucket has appropriate CORS settings if files are accessed directly from the browser.
3. Create an IAM user/service account with `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` permissions.

### 3. Resend (Email)
1. Create an account at [Resend](https://resend.com).
2. Verify your sending domain.
3. Create an API key.

## Validation

You can validate your configuration at any time by running:
```bash
pnpm config:validate
```
This will check for missing required fields and invalid formats (URLs, emails, etc.).
