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
   - `JWT_SECRET` — long random string

4. **Migrate and seed the app database**

   ```bash
   cd apps/api
   npx prisma migrate deploy
   npx prisma db seed
   cd ../..
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

7. **Sign in** at `/login` with the seeded user, then use **Ask query** (`/ask`) for the minimal E2E path: connect → refresh schema → ask (placeholder SQL) → run → save query → save dashboard card.

## API modules (backend)

- **Auth** — `POST /auth/register`, `POST /auth/login` (JWT bearer for all other routes)
- **Connections** — CRUD-style listing and `POST /connections` to store a Postgres connection string (encrypt at rest: **TODO**)
- **Schema** — `POST /schema/connections/:id/refresh`, `GET .../latest` (cached `DatabaseSchema` rows)
- **Query** — `POST /query/ask` (placeholder until LLM), `POST /query/execute` (read-only, org-scoped), `GET /query/runs`
- **Saved queries** — `POST/GET /saved-queries`, `GET /saved-queries/:id`
- **Dashboards** — `GET/POST /dashboards`, `GET /dashboards/:id`, `POST /dashboards/:id/cards`
- **Audit** — `AuditLog` writes from services (login, connection, schema refresh, execute, save query, dashboard card)

## Security notes (MVP)

- Query execution wraps user SQL as `SELECT * FROM (<user sql>) AS _q LIMIT 501` and rejects non–`SELECT`/`WITH` statements via `assertReadOnlySql` in `@analytics-copilot/shared`. **This is not a substitute for a full SQL parser** — see TODO in shared package.
- Connection strings are stored in plaintext in the app DB for the MVP (**TODO**: KMS / vault).
- JWT is stored in `localStorage` on the web app (**TODO**: httpOnly cookies + CSRF strategy).

## Redis

Redis is started by Compose for future caching, rate limits, or BullMQ-style jobs. The API does not require it yet; `REDIS_URL` is optional.

## Scripts (root)

| Script | Description |
|--------|-------------|
| `npm run dev` | API + web via `concurrently` |
| `npm run dev:api` / `npm run dev:web` | Single app |
| `npm run build` | Build shared, API, web |
| `npm run db:migrate` | `prisma migrate dev` in `apps/api` |
| `npm run db:seed` | Prisma seed |

## Extension points

- **LLM**: Replace the body of `QueryService.askQuestion` in `apps/api` and keep validation + read-only execution.
- **Stricter SQL**: Swap `assertReadOnlySql` for `pg-query-parser` or a managed “semantic layer” API.
