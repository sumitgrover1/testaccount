# Clinic Management Platform — Backend

Enterprise-grade backend for a multi-specialty clinic (patients, leads,
treatments/packages, pricing, scheduling, inventory, billing, marketing
attribution, and reporting). Built with Node.js, Express, and TypeScript.
Security- and compliance-minded by default — see [SECURITY.md](./SECURITY.md)
for the full list of controls.

## Stack

| Concern         | Choice                                   |
|------------------|-------------------------------------------|
| Language         | TypeScript (strict mode)                  |
| Framework        | Express                                   |
| Database         | MySQL via Prisma ORM                      |
| Auth             | JWT access tokens + rotating refresh tokens (httpOnly cookie) — staff only, patients are not authenticated users |
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
    utils/             jwt, password hashing, token/webhook signature hashing, sequence codes
    providers/         pluggable OCR + notification interfaces (see below)
    validation/        shared zod primitives (email, mobile, pagination, uuid params)
    constants/         role groups used across route authorization
    types/              Express type augmentation (req.user, req.id, req.rawBody)
  middlewares/          security headers, CORS, rate limiting, auth, RBAC,
                        request validation, CSRF, audit logging, error handling
  modules/
    auth/               staff login, refresh rotation, logout, password reset
    users/               admin-provisioned staff accounts (no public self-registration)
    patients/            patient master, medical info, documents
    leads/                lead pipeline, status history, lead -> patient conversion
    treatments/           treatment catalog + price history
    packages/             treatment bundles
    pricing/              patient-specific overrides, doctor-approval workflow, price history
    treatment-enrollments/ enrollment into treatment(s)/package, session tracking
    appointments/         scheduling lifecycle
    inventory/            products, batches, suppliers, stock ledger, OCR purchase entry
    billing/              invoices, payments, coupons
    marketing/            campaigns, ad-platform lead webhooks
    followups/            follow-up tasks/reminders
    communications/       unified patient/lead communication timeline
    dashboard/            reporting/analytics endpoints
  routes/               route aggregation, health/readiness endpoints
prisma/
  schema.prisma         full domain model (see "Domain model" below)
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

Since there's no public registration, create the first Super Admin directly:

```bash
npx prisma studio
# In the users table, insert a row with role=SUPER_ADMIN and a passwordHash
# generated via argon2 (or temporarily call hashPassword() from a REPL).
```

From there, that admin can create every other staff account via
`POST /api/v1/users`.

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

- **Users** are clinic staff (`SUPER_ADMIN`, `CLINIC_OWNER`, `DOCTOR`,
  `RECEPTIONIST`, `COUNSELOR`, `INVENTORY_MANAGER`, `ACCOUNTANT`,
  `MARKETING_TEAM`) — the only authenticated actors in the system.
- **Patients** have a centralized profile (demographics, medical history,
  documents) with an auto-generated, human-readable patient code (`PT-000123`).
- **Leads** flow through a pipeline (`NEW` → ... → `CONVERTED`, or a terminal
  `COLD`/`LOST`/`DUPLICATE`/`INVALID`/`NO_RESPONSE`) and carry source/campaign
  attribution; converting a lead creates a **Patient** and preserves that
  attribution and communication history.
- **Treatments** and **Packages** (bundles of treatments) form the service
  catalog; **Pricing** resolves a patient's effective price for a treatment —
  global default → patient-specific override — with a doctor-approval
  workflow for large discounts and an append-only price-change history.
- **TreatmentEnrollment** tracks a patient's enrollment into a treatment,
  multiple treatments, or a package, with per-treatment session progress
  (`TreatmentEnrollmentItem` → `TreatmentSession`).
- **Appointments** move through `BOOKED` → `CHECKED_IN` → `COMPLETED` (or
  `CANCELLED`/`NO_SHOW`/`RESCHEDULED`).
- **Inventory**: `Product` → `ProductBatch` (batch/expiry-tracked stock) →
  `StockMovement` (full audit ledger). `PurchaseInvoice` supports OCR-assisted
  supplier-invoice entry with mandatory manual correction/confirmation before
  stock is created. `ProductConsumptionRule` auto-deducts stock (FEFO) when a
  treatment session is recorded.
- **Billing**: `Invoice` → `InvoiceItem` (treatment/package/product lines,
  with per-line discount/GST) → `Payment` (cash/UPI/card/split), with coupon
  support.
- **Marketing**: `Campaign` carries UTM/ad-platform attribution; ad-platform
  webhooks ingest leads directly into the pipeline.
- **FollowUp** and **CommunicationLog** back the follow-up engine and the
  unified per-patient/per-lead communication timeline.
- Every security- and business-relevant mutation is recorded in the
  append-only **AuditLog**.

## Integration points not wired to a live provider

These are built as clean, swappable interfaces rather than fake
integrations, since they need real third-party credentials this environment
doesn't have:

- **OCR** (`src/common/providers/ocr.provider.ts`) — supplier-invoice field
  extraction. `MockOcrProvider` always defers to manual entry; plug in Google
  Document AI / AWS Textract / Azure Form Recognizer by implementing
  `OcrProvider` and swapping the export.
- **Notifications** (`src/common/providers/notification.provider.ts`) — call/
  WhatsApp/SMS/email reminders. `ConsoleNotificationProvider` logs instead of
  sending; plug in Twilio/Gupshup/SendGrid the same way.
- **Ad-platform webhooks** (`src/modules/marketing/webhook.controller.ts`) —
  signature verification and lead ingestion are real; the vendor-specific
  payload shape (e.g. Facebook's leadgen_id → Graph API fetch) needs each
  platform's live app credentials to complete.
- **Follow-up scheduling** — `followup.service.ts` exposes `sendReminder` and
  `markOverdueAsMissed` for an external scheduler (cron/queue) to call; no
  in-process scheduler is bundled.

None of this blocks everyday clinic operations (patients, leads, treatments,
pricing, enrollments, appointments, inventory, billing all work end-to-end
today) — see [SECURITY.md](./SECURITY.md) for the full gap list.

## Extending this scaffold

- Add a new domain module by following the existing `validation → service →
  controller → routes` pattern, then mount it in `src/routes/index.ts`.
- Add new Prisma models in `prisma/schema.prisma`, then run
  `npm run prisma:migrate`.
- Keep all authorization decisions in `service.ts` files (ownership checks) or
  `rbac.middleware.ts` (role checks) — never in controllers.
