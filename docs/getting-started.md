# Getting Started

Follow this guide to set up the Spesen Tool for local development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version specified in `.nvmrc` (LTS recommended). We suggest using [nvm](https://github.com/nvm-sh/nvm).
- **pnpm**: Version specified in `package.json` (managed via Corepack).
- **Docker**: For running the local PostgreSQL database.
- **Git**: For version control.

## Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/move-ev/spesen-tool.git
   cd spesen-tool
   ```

2. **Set Node.js Version**
   ```bash
   nvm install
   nvm use
   ```

3. **Install Dependencies**
   ```bash
   pnpm install
   ```

## Development Environment Setup

1. **Configure Environment Variables**
   Copy the example environment file and fill in your values:
   ```bash
   cp .env.example .env
   ```
   *Note: For a quick start, you only need the `DATABASE_URL` if you just want to run the database. See [Configuration](configuration.md) for a full list of variables.*

2. **Start the Database**
   The project includes a `docker-compose.yml` for a local PostgreSQL instance:
   ```bash
   docker compose up -d
   ```

3. **Initialize the Database**
   Run the migrations and generate the Prisma client:
   ```bash
   pnpm db:generate
   ```

4. **Start the Development Server**
   ```bash
   pnpm dev
   ```
   The application will be available at [http://localhost:3000](http://localhost:3000).

## Initial Admin Setup

Once the app is running, you'll need to create an admin user:

1. Sign in via Microsoft (ensure your Azure AD is configured in `.env`).
2. After your first sign-in, find your `userId` in the `User` table (use `pnpm db:studio` to browse the database).
3. Update your `config.ts` (or `SUPERUSER_ID` env var) with this ID:
   ```typescript
   // config.ts
   app: {
     superuserId: "your-user-id-here",
     // ...
   }
   ```
4. Restart the app. You should now have access to the Admin dashboard.

## Common Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm db:studio` | Open Prisma Studio to view data |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm check` | Run linting and formatting checks (Biome) |
| `pnpm typecheck` | Run TypeScript compiler checks |
