# Self-Hosting Guide

This guide explains how to deploy and configure Zemio for self-hosted environments.

## Table of Contents

- [Quick Start](#quick-start)
- [Configuration Overview](#configuration-overview)
- [Configuration File Reference](#configuration-file-reference)
- [Environment Variables (Secrets)](#environment-variables-secrets)
- [Database Setup](#database-setup)
- [Microsoft Azure AD Setup](#microsoft-azure-ad-setup)
- [Storage Setup](#storage-setup)
- [Email Setup](#email-setup)
- [Docker Deployment](#docker-deployment)
- [Migration from Environment Variables](#migration-from-environment-variables)
- [Validation](#validation)
- [Troubleshooting](#troubleshooting)

## Quick Start

1. **Copy the example configuration:**
   ```bash
   cp config.example.ts config.ts
   ```

2. **Edit `config.ts` with your settings** (see [Configuration File Reference](#configuration-file-reference))

3. **Set up required environment variables** (see [Environment Variables](#environment-variables-secrets)):
   ```bash
   export BETTER_AUTH_SECRET="your-secret-key"
   export MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
   export STORAGE_ACCESS_KEY_ID="your-storage-key-id"
   export STORAGE_ACCESS_KEY="your-storage-secret-key"
   export RESEND_API_KEY="your-resend-api-key"
   ```

4. **Validate your configuration:**
   ```bash
   pnpm config:validate
   ```

5. **Build and start the application:**
   ```bash
   pnpm build && pnpm start
   ```

## Configuration Overview

Zemio uses a two-tier configuration system:

### Config File (`config.ts`)
Non-sensitive settings like URLs, IDs, and behavior configuration. This file is:
- Easy to edit and version
- Human-readable with TypeScript autocomplete
- Safe to share (no secrets)

### Environment Variables
Sensitive values like API keys and passwords. These should be:
- Stored securely (secrets manager, encrypted env files)
- Never committed to version control
- Set differently per environment (dev/staging/prod)

### Priority Order

When both are set, the priority is:
1. **Environment variable** (highest priority) - for CI/CD overrides
2. **Config file** - primary configuration source

## Configuration File Reference

### Application Settings

```typescript
app: {
  // Application name displayed in UI and emails
  name: "Zemio",
  
  // Public URL where the application is accessible
  // Used for OAuth callbacks and email links
  url: "https://expenses.example.com",
  
  // User ID of the superuser with full admin privileges
  // Get this ID from the database after first admin sign-in
  superuserId: "clxyz123...",
}
```

### Database Settings

```typescript
database: {
  // PostgreSQL connection URL
  // Format: postgresql://user:password@host:port/database
  url: "postgresql://postgres:password@localhost:5432/zemio",
  
  // Optional: Logging levels for debugging
  // Default: ["error"] in production, ["query", "error", "warn"] in development
  logging: ["error"],
}
```

### Authentication Settings

```typescript
auth: {
  // Base URL for authentication callbacks
  // Usually same as app.url
  url: "https://expenses.example.com",
  
  microsoft: {
    // Azure AD tenant ID
    tenantId: "your-tenant-id",
    
    // Application (client) ID from Azure AD
    clientId: "your-client-id",
    
    // Client secret is set via MICROSOFT_CLIENT_SECRET env var
  },
}
```

### Storage Settings (S3-compatible)

```typescript
storage: {
  // S3-compatible storage host
  // Examples: "s3.amazonaws.com", "minio.example.com"
  host: "s3.amazonaws.com",
  
  // Storage region
  // Example: "eu-central-1"
  region: "eu-central-1",
  
  // Bucket name for file attachments
  bucket: "my-expenses-bucket",
  
  // Use HTTPS (default: true)
  secure: true,
  
  // Force path-style URLs (needed for MinIO, default: false)
  forcePathStyle: false,
}
```

### Upload Settings

```typescript
upload: {
  // Maximum file size in bytes (default: 5MB)
  maxFileSize: 5 * 1024 * 1024,
  
  // Maximum files per upload (default: 5)
  maxFiles: 5,
}
```

### Email Settings

```typescript
email: {
  // Sender email address (must be verified in Resend)
  from: "expenses@example.com",
  
  // Optional reply-to address
  replyTo: "support@example.com",
}
```

## Environment Variables (Secrets)

These must be set as environment variables (never in the config file):

| Variable | Required | Description |
|----------|----------|-------------|
| `BETTER_AUTH_SECRET` | Yes (prod) | JWT signing secret. Generate with: `openssl rand -base64 32` |
| `MICROSOFT_CLIENT_SECRET` | Yes | Microsoft OAuth client secret from Azure AD |
| `STORAGE_ACCESS_KEY_ID` | Yes | S3-compatible storage access key ID |
| `STORAGE_ACCESS_KEY` | Yes | S3-compatible storage secret key |
| `RESEND_API_KEY` | Yes | Resend email service API key |

### Optional Override Variables

These can override config file values (useful for CI/CD):

| Variable | Overrides |
|----------|-----------|
| `DATABASE_URL` | `database.url` |
| `BETTER_AUTH_URL` | `auth.url` |
| `SUPERUSER_ID` | `app.superuserId` |
| `MICROSOFT_TENANT_ID` | `auth.microsoft.tenantId` |
| `MICROSOFT_CLIENT_ID` | `auth.microsoft.clientId` |
| `STORAGE_HOST` | `storage.host` |
| `STORAGE_REGION` | `storage.region` |
| `STORAGE_BUCKET` | `storage.bucket` |
| `EMAIL_FROM` | `email.from` |

## Database Setup

### PostgreSQL

1. **Create the database:**
   ```sql
   CREATE DATABASE zemio;
   ```

2. **Configure the connection URL in `config.ts`:**
   ```typescript
   database: {
     url: "postgresql://user:password@localhost:5432/zemio",
   }
   ```

3. **Run database migrations:**
   ```bash
   pnpm db:migrate
   ```

### Using Docker Compose (Development)

```bash
docker-compose up -d postgres
```

This starts PostgreSQL on port 5435 with:
- User: `postgres`
- Password: `postgres`
- Database: `zemio`

## Microsoft Azure AD Setup

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**:
   - Name: "Zemio" (or your preferred name)
   - Supported account types: Single tenant (your organization)
   - Redirect URI: `https://your-domain.com/api/auth/callback/microsoft`

4. After creation, note:
   - **Application (client) ID** → `auth.microsoft.clientId`
   - **Directory (tenant) ID** → `auth.microsoft.tenantId`

5. Go to **Certificates & secrets**:
   - Create a new client secret
   - Copy the secret value → `MICROSOFT_CLIENT_SECRET` env var

6. Go to **API permissions**:
   - Add: `Microsoft Graph` > `User.Read` (delegated)
   - Grant admin consent

## Storage Setup

### AWS S3

1. Create an S3 bucket
2. Create an IAM user with S3 access
3. Configure:
   ```typescript
   storage: {
     host: "s3.amazonaws.com",
     region: "eu-central-1", // Your bucket region
     bucket: "my-expenses-bucket",
   }
   ```
4. Set env vars:
   ```bash
   export STORAGE_ACCESS_KEY_ID="AKIA..."
   export STORAGE_ACCESS_KEY="your-secret-key"
   ```

### MinIO (Self-hosted)

1. Deploy MinIO
2. Create a bucket
3. Configure:
   ```typescript
   storage: {
     host: "minio.example.com",
     region: "us-east-1", // MinIO default
     bucket: "expenses",
     secure: true,
     forcePathStyle: true, // Required for MinIO
   }
   ```

## Email Setup

1. Create account at [Resend](https://resend.com)
2. Add and verify your domain
3. Create an API key
4. Configure:
   ```typescript
   email: {
     from: "expenses@yourdomain.com",
     replyTo: "support@yourdomain.com",
   }
   ```
5. Set env var:
   ```bash
   export RESEND_API_KEY="re_..."
   ```

## Docker Deployment

### Dockerfile Example

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
ENV SKIP_ENV_VALIDATION=1
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy config file (or mount as volume)
COPY config.ts ./

EXPOSE 3000
CMD ["node", "server.js"]
```

### Docker Compose Example

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - MICROSOFT_CLIENT_SECRET=${MICROSOFT_CLIENT_SECRET}
      - STORAGE_ACCESS_KEY_ID=${STORAGE_ACCESS_KEY_ID}
      - STORAGE_ACCESS_KEY=${STORAGE_ACCESS_KEY}
      - RESEND_API_KEY=${RESEND_API_KEY}
    volumes:
      - ./config.ts:/app/config.ts:ro
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: zemio
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Migration from Environment Variables

If you're currently using only environment variables, you can migrate to the config file approach:

1. **Create config.ts from your env vars:**
   ```typescript
   const config = {
     app: {
       url: process.env.BETTER_AUTH_URL,
       superuserId: process.env.SUPERUSER_ID,
     },
     database: {
       url: process.env.DATABASE_URL,
     },
     // ... map other settings
   };
   ```

2. **Keep secrets as env vars** (no change needed)

3. **Remove non-secret env vars** from your `.env` file (optional)

4. **Validate the new setup:**
   ```bash
   pnpm config:validate --verbose
   ```

### Backward Compatibility

The old environment-variable-only approach still works! If no `config.ts` file exists, the application will read all configuration from environment variables.

## Validation

### Validate Before Deployment

```bash
# Basic validation
pnpm config:validate

# Verbose output (shows all values)
pnpm config:validate --verbose

# Custom config file
pnpm config:validate --config ./configs/production.ts

# Or using environment variable
CONFIG_PATH=./my-config.ts pnpm config:validate
```

### What Gets Validated

- All required fields are present
- URLs are valid format
- Email addresses are valid format
- Numbers are positive where required
- Environment variables for secrets are set

## Troubleshooting

### "Configuration file not found"

```
❌ Configuration file not found!
   Searched: /app/config.ts
```

**Solution:** Copy `config.example.ts` to `config.ts` and edit it.

### "Invalid configuration"

```
❌ Configuration validation failed!
  ✗ app.url: Invalid url
  ✗ email.from: Invalid email address
```

**Solution:** Check the listed fields in your `config.ts` file.

### "Database URL not configured"

**Solution:** Either:
- Add `database.url` to your `config.ts`
- Set the `DATABASE_URL` environment variable

### "Microsoft client secret not set"

**Solution:** Set the `MICROSOFT_CLIENT_SECRET` environment variable.

### Build Fails with "Invalid env vars"

For Docker builds, set `SKIP_ENV_VALIDATION=1`:
```dockerfile
ENV SKIP_ENV_VALIDATION=1
RUN pnpm build
```

This skips validation at build time (secrets aren't available during build).

### Configuration Changes Not Taking Effect

The configuration is cached at startup. Restart the application after making changes to `config.ts`.

---

## Getting Help

- Check the [GitHub Issues](https://github.com/zemio-co/zemio/issues)
- Review the example configuration in `config.example.ts`
- Run `pnpm config:validate --verbose` for diagnostic output
