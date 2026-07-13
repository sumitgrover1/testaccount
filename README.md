# LMS Backend

Enterprise-grade backend for a Learning Management System, built with
Node.js, Express, and TypeScript. Security and compliance-minded by default —
see [SECURITY.md](./SECURITY.md) for the full list of controls.

## Stack

| Concern         | Choice                                   |
|------------------|-------------------------------------------|
| Language         | TypeScript (strict mode)                  |
| Framework        | Express                                   |
| Database         | MySQL via Prisma ORM                      |
| Auth             | JWT access tokens + rotating refresh tokens (httpOnly cookie) |
| Password hashing | argon2id                                  |
| Validation       | zod                                       |
| Logging          | pino (structured JSON, redacted)          |
| Rate limiting    | express-rate-limit (Redis-backed when available) |
| Testing          | Jest + Supertest                          |

## Architecture

```
src/
  app.ts               Express app wiring (middleware pipeline, routes)
  server.ts            Process entrypoint: bootstraps app, DB, Redis, graceful shutdown
  config/              env validation, logger, Prisma client, Redis client
  common/
    errors/            AppError hierarchy (typed, HTTP-status-aware errors)
    utils/             jwt, password hashing, token hashing, asyncHandler
    constants/         shared enums/constants
    types/             Express type augmentation (req.user, req.id)
  middlewares/          security headers, CORS, rate limiting, auth, RBAC,
                        request validation, CSRF, audit logging, error handling
  modules/
    auth/               register, login, refresh rotation, logout, password reset
    users/              profile management, admin user management
    courses/             course CRUD with instructor ownership
    enrollments/         student enrollment lifecycle
  routes/               route aggregation, health/readiness endpoints
prisma/
  schema.prisma         User, Course, Module, Lesson, Enrollment, Assignment,
                        Submission, RefreshToken, PasswordResetToken, AuditLog
tests/                  unit tests (validation schemas, crypto/password utils,
                        app-level smoke tests)
```

Each domain module follows the same shape: `*.validation.ts` (zod schemas) →
`*.service.ts` (business logic, the only layer that touches Prisma) →
`*.controller.ts` (thin HTTP adapters) → `*.routes.ts` (wiring + middleware).

## Getting started

### Prerequisites
- Node.js 20+
- MySQL 8+ (or use `docker-compose up mysql`)
- Redis (optional — only needed for distributed rate limiting across multiple instances)

### Setup

```bash
cp .env.example .env
# Edit .env: set DATABASE_URL and generate real secrets, e.g.
openssl rand -hex 64   # use for JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / COOKIE_SECRET

npm install
npx prisma migrate dev --name init
npm run dev
```

The API is served under `API_PREFIX` (default `/api/v1`); health checks are at
`/healthz` (liveness) and `/readyz` (readiness, checks DB connectivity).

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start with hot reload (tsx) |
| `npm run build` / `npm start` | Compile and run the production build |
| `npm run lint` / `npm run lint:fix` | ESLint (includes `eslint-plugin-security`) |
| `npm run typecheck` | TypeScript strict-mode check, no emit |
| `npm test` / `npm run test:coverage` | Jest unit tests |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run prisma:studio` | Browse the database |
| `npm run audit` | `npm audit` at moderate+ severity |

### Docker

```bash
docker compose up --build
```

Builds a multi-stage, non-root production image and starts it alongside MySQL
and Redis. Set `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `COOKIE_SECRET`
in your shell or an `.env` file read by `docker compose` before starting.

## Domain model

- **Users** have a role (`ADMIN`, `INSTRUCTOR`, `STUDENT`) that drives authorization.
- **Courses** are authored by an instructor, move through `DRAFT` → `PUBLISHED` → `ARCHIVED`, and contain ordered **Modules** → **Lessons**.
- **Enrollments** link a student to a published course (`ACTIVE` / `COMPLETED` / `DROPPED`).
- **Assignments** belong to a course; **Submissions** link a student's work to an assignment with an optional score/feedback.
- Every security-relevant mutation (auth events, role changes, course/enrollment changes) is recorded in the append-only **AuditLog**.

## Extending this scaffold

- Add a new domain module by following the existing `validation → service →
  controller → routes` pattern, then mount it in `src/routes/index.ts`.
- Add new Prisma models in `prisma/schema.prisma`, then run
  `npm run prisma:migrate`.
- Keep all authorization decisions in `service.ts` files (ownership checks) or
  `rbac.middleware.ts` (role checks) — never in controllers.
