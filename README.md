# AI Analytics Copilot (MVP skeleton)

Monorepo for a manager-facing analytics copilot: **Next.js 15** (App Router) + **NestJS** + **Prisma** (PostgreSQL) + **Docker Compose** (PostgreSQL + Redis). The stack is ready for a future LLM integration on the backend (no Python in this repo).

## Repository layout

| Path | Purpose |
|------|---------|
| `apps/web` | Next.js 15 frontend (Tailwind, shadcn-style UI primitives, Recharts) |
| `apps/api` | NestJS API (modular: auth, connections, schema, query, saved-queries, dashboards, audit) |
| `packages/shared` | Shared DTO-style types and `assertReadOnlySql` guard |
| `docker-compose.yml` | Local PostgreSQL + Redis |

## Prerequisites

- Node.js **20+**
- Docker Desktop (or compatible engine) for local databases

## Quick start

1. **Start databases**

   ```bash
   docker compose up -d
   ```

2. **Install dependencies** (from repo root)

   ```bash
   npm install
   ```

   The `@analytics-copilot/shared` package runs `prepare` to build its `dist/` output.

3. **Configure the API**

   Copy `apps/api/.env.example` to `apps/api/.env` and set at least:

   - `DATABASE_URL` — default in example matches Docker Compose (`copilot` / `copilot` / `copilot_app`)
   - `JWT_SECRET` — at least 32 characters
   - `CREDENTIAL_ENCRYPTION_KEY` — at least 32 characters (encrypts external DB credentials at rest)
   - `CORS_ORIGIN` — web origin(s), comma-separated (required in production)

4. **Migrate and seed the app database**

   ```bash
   npm run db:migrate:deploy
   npm run db:encrypt-credentials   # if upgrading existing plaintext credentials
   npm run db:seed
   ```

   Seed creates:

   - User: `demo@example.com` / `demo123`
   - Organization, a **database connection** pointing at the same local Postgres (app DB), and a **Main** dashboard

5. **Configure the web app**

   Copy `apps/web/.env.example` to `apps/web/.env.local` if you need a non-default API URL:

   - `NEXT_PUBLIC_API_URL=http://localhost:4000`

6. **Run dev servers** (from repo root)

   ```bash
   npm run dev
   ```

   - Web: [http://localhost:3000](http://localhost:3000)
   - API: [http://localhost:4000](http://localhost:4000)

7. **Sign in** at `/login` with the seeded user, open **Connect PostgreSQL** at `/onboarding/connect-database`, then continue from **Home** (`/app/home`) — e.g. **Ask query** (`/ask`): schema → ask (placeholder SQL) → run → save query → save dashboard card.

## API modules (backend)

- **Auth** — `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh` (15m access JWT + 7d refresh token)
- **Database connections** — `GET/POST /database-connections`, `GET /database-connections/:id`, `POST /database-connections/:id/test`. `POST` body includes `type`: `postgres` \| `mysql` plus host/port/database/username/password/ssl; set `dryRun: true` to test only (no save). Runtime access uses **`DatabaseAdapterFactory`** + per-dialect adapters (`PostgresAdapter`, `MysqlAdapter`) — add engines by extending `ExternalDbProvider` in Prisma and registering a new adapter class.
- **Connections (legacy)** — `GET/POST /connections` with a single `connectionString` (still supported for seeds / older clients)
- **Schema** — `POST /schema/connections/:id/refresh`, `GET .../latest` (cached `DatabaseSchema` rows)
- **Query** — `POST /query/ask` (placeholder until LLM), `POST /query/execute` (read-only, org-scoped), `GET /query/runs`
- **Saved queries** — `POST/GET /saved-queries`, `GET /saved-queries/:id`
- **Dashboards** — `GET/POST /dashboards`, `GET /dashboards/:id`, `POST /dashboards/:id/cards`
- **Audit** — `AuditLog` writes from services (login, connection, schema refresh, execute, save query, dashboard card)

## Security notes

- Query execution validates SQL with a dialect-aware parser (`node-sql-parser`) and enforces row caps via AST-level `LIMIT` injection — not string wrapping.
- External DB credentials are encrypted at rest (AES-256-GCM) using `CREDENTIAL_ENCRYPTION_KEY`.
- JWT access tokens expire in 15 minutes; refresh via `POST /auth/refresh`. Tokens are stored in `localStorage` on the web app (**TODO**: httpOnly cookies + CSRF strategy).

## Production deployment

- `GET /health` — API health check
- Docker: `docker compose build` then `docker compose up -d` (Postgres + API + web)
- CI: `.github/workflows/ci.yml` runs build, migrate deploy, and lint

## Redis

Redis is not required by the API. Compose no longer starts Redis by default in the production-oriented stack.

## Scripts (root)

| Script | Description |
|--------|-------------|
| `npm run dev` | API + web via `concurrently` |
| `npm run dev:api` / `npm run dev:web` | Single app |
| `npm run build` | Build shared, API, web |
| `npm run db:migrate` | `prisma migrate dev` in `apps/api` |
| `npm run db:migrate:deploy` | `prisma migrate deploy` in `apps/api` |
| `npm run db:encrypt-credentials` | Encrypt legacy plaintext connection credentials |
| `npm run start:prod` | Run API + web in production mode locally |
| `npm run db:seed` | Prisma seed |

## Extension points

- **LLM**: Replace the body of `QueryService.askQuestion` in `apps/api` and keep validation + read-only execution.
- **Stricter SQL**: Extend parser rules in `packages/shared/src/utils/sql-readonly.ts` or add dialect-specific allowlists.
