# Deployment Guide

This guide covers the steps to deploy the Spesen Tool in a production environment.

## Production Strategy

The Spesen Tool is designed to be deployed as a Docker container. Next.js is configured for [standalone output](https://nextjs.org/docs/app/api-reference/next-config-js/output#standalone), which minimizes the final image size.

## Prerequisites

- **Docker & Docker Compose**: The recommended way to run the application and its database.
- **PostgreSQL**: A production-ready instance (can be run via Docker).
- **S3 Storage**: AWS S3, MinIO, or similar for file uploads.
- **SMTP/Email**: An account with [Resend](https://resend.com).
- **Microsoft Azure AD**: For user authentication.

---

## Deployment Steps

### 1. Build the Application
If you are building the image yourself:
```bash
docker build -t spesen-tool .
```
*Note: Ensure `SKIP_ENV_VALIDATION=1` is set during the build process if secrets are not available.*

### 2. Configure Production Secrets
Ensure all required environment variables are set in your deployment environment. See the [Configuration Guide](configuration.md) for a full list.

### 3. Database Migrations
Before starting the application, run the migrations against your production database:
```bash
pnpm db:migrate
```

### 4. Running with Docker Compose
A typical production `docker-compose.yml` might look like this:

```yaml
services:
  app:
    image: spesen-tool
    ports:
      - "3000:3000"
    env_file: .env.prod
    volumes:
      - ./config.ts:/app/config.ts:ro
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: spesen_tool
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d spesen_tool"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

---

## Post-Deployment Checklist

1. **Verify Connectivity**: Ensure the app can reach PostgreSQL, S3, and Resend.
2. **Initial Admin**: Log in and verify that your `SUPERUSER_ID` has access to the `/admin` routes.
3. **CORS & Redirects**: Check that your Azure AD Redirect URI matches your production domain.
4. **SSL/TLS**: Ensure the application is served over HTTPS. If using a reverse proxy (like Nginx), pass the `X-Forwarded-Proto` header.
5. **Backups**: Schedule regular backups for your PostgreSQL database and S3 bucket.

## Troubleshooting

### Build Fails with "Invalid Environment Variables"
If your build fails because secrets are missing, ensure `SKIP_ENV_VALIDATION=1` is set in your Dockerfile or build environment.

### Emails Not Sending
1. Check that your `RESEND_API_KEY` is valid.
2. Ensure the `EMAIL_FROM` address is verified in your Resend dashboard.

### File Uploads Failing
1. Verify S3 credentials and bucket name.
2. Check that the `STORAGE_REGION` and `STORAGE_HOST` are correct.
3. If using MinIO, set `storage.forcePathStyle: true` in `config.ts`.
