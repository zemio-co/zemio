# Spesen Tool Documentation

Welcome to the official documentation for the **Spesen Tool**, a modern expense management platform built for student initiatives.

## Project Overview

The Spesen Tool simplifies the process of submitting, reviewing, and managing expense reports. It is designed to be efficient, type-safe, and easy to deploy.

### Key Features

- **Expense Reporting**: Create reports with multiple expenses (Receipts, Travel, Food).
- **Workflow Management**: Draft, submit, and review reports with clear status transitions.
- **Admin Dashboard**: Comprehensive tools for reviewers to manage users, cost units, and allowances.
- **Cost Unit Tracking**: Organize expenses by specific projects or accounting units.
- **Automated Notifications**: Email alerts for status changes and submissions via Resend.
- **Secure Authentication**: Microsoft Azure AD integration for organizational sign-in.
- **File Attachments**: Secure receipt uploads to S3-compatible storage.

## Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **API**: [tRPC](https://trpc.io/) for end-to-end type safety
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
- **Auth**: [Better-Auth](https://www.better-auth.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Lucide React](https://lucide.dev/)
- **Forms**: [TanStack Form](https://tanstack.com/form)
- **Emails**: [React Email](https://react.email/) & [Resend](https://resend.com/)

## Documentation Index

1. [**Getting Started**](getting-started.md) - Installation and quick start guide.
2. [**System Architecture**](architecture.md) - Overview of the design and data flow.
3. [**Configuration**](configuration.md) - Environment variables and setup guides.
4. [**API Reference**](api-reference.md) - Documentation of tRPC routers and endpoints.
5. [**Database Schema**](database-schema.md) - Models, relationships, and ER diagram.
6. [**Deployment**](deployment.md) - Production build and Docker instructions.

---

*This project is under active development. For contributions, please see [CONTRIBUTING.md](../CONTRIBUTING.md).*
