# Clinic Management Platform — Backend

Enterprise-grade backend for a multi-specialty clinic (patients, leads,
treatments/packages, pricing, scheduling, inventory, billing, marketing
attribution, and reporting). Built with Node.js, Express, and TypeScript.
Security- and compliance-minded by default — see [SECURITY.md](./SECURITY.md)
for the full list of controls.

A companion admin panel that consumes this API lives in [`frontend/`](./frontend/README.md) (Next.js + React + TypeScript). A public marketing website (services, contact/booking form) lives in [`website/`](./website/README.md).

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

**Windows one-shot option**: run `powershell -ExecutionPolicy Bypass -File .\setup.ps1`
from the repo root. It generates real secrets, writes `.env` /
`frontend/.env.local` / `website/.env.local`, installs dependencies for all
three projects, runs migrations, seeds the first admin account, and opens
each dev server in its own window — no manual editing needed unless your
MySQL isn't `root`/`root` on `localhost:3306` (pass `-DbUser`/`-DbPassword`/
etc. if so). Safe to re-run; it never overwrites an existing `.env` file.

Manual/cross-platform setup:

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

Since there's no public registration, create the first Super Admin with the
seed script:

```bash
SEED_ADMIN_EMAIL=admin@yourclinic.com SEED_ADMIN_PASSWORD='a-strong-passphrase' npm run prisma:seed
```

(Omit the env vars to get `admin@clinic.local` / `ChangeMe123!Now` —
change that password immediately after first login if you rely on the
default.) From there, that admin can create every other staff account from
the admin panel's Staff page, or directly via `POST /api/v1/users`.

Optionally, seed a starter treatment/package catalog (39 treatments across
Skin/Hair/Laser/Body/Men's Grooming/Bridal/Weight Loss + 12 bundled
packages, at market-typical pricing) so Packages/Invoices/Enrollments have
real data instead of empty dropdowns:

```bash
npm run prisma:seed:catalog
```

Safe to re-run — skips any treatment/package whose name already exists.

Optionally, seed 42 starter blog articles (Skin/Hair/Weight Management) for
the website's Blog section, published and attributed to the first Super
Admin found:

```bash
npm run prisma:seed:blog
```

Safe to re-run — skips any post whose slug already exists.

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

## Public (unauthenticated) endpoints

Four endpoints intentionally sit outside the auth wall, for the public
marketing website (`website/`) — everything else requires a staff login:

- `GET /api/v1/treatments/public-list` — active treatments only, limited to
  name/category/description/duration/sessions (no pricing — this clinic's
  pricing is patient-specific, resolved after a consultation).
- `POST /api/v1/leads/public-capture` — the website's contact/booking form.
  Creates a `Lead` (source `WEBSITE_FORM`), rate-limited like other
  public-facing endpoints. Add the website's origin to `CORS_ORIGIN` (see
  `.env.example`) or the browser will block both calls.
- `GET /api/v1/reviews/google` — real reviews from the clinic's Google
  Business Profile, for the website's Testimonials page. Proxied through
  the backend (rather than called from the browser) so the Google API key
  stays server-side, and cached for an hour to limit API cost. Optional —
  returns `{ configured: false }` until you set `GOOGLE_PLACES_API_KEY`
  (Google Cloud Console → enable "Places API") and `GOOGLE_PLACE_ID` (find
  yours at
  https://developers.google.com/maps/documentation/places/web-service/place-id)
  in `.env`.
- `GET /api/v1/gallery/instagram` — the clinic's real recent Instagram posts
  (photos and videos), for the website's Gallery page. Proxied server-side
  so the access token never reaches the browser, cached for an hour.
  Optional — returns `{ configured: false }` until `INSTAGRAM_ACCESS_TOKEN`
  is set in `.env` (a long-lived token from a Meta Developer App connected
  to the clinic's Instagram professional account). Long-lived tokens last
  60 days; this service auto-refreshes and persists the refreshed token to
  `.instagram-token-cache.json` (gitignored) so the `.env` value only needs
  to be the *initial* token, not kept current forever — though it must
  still be manually replaced if the server has been down long enough for
  the cached refresh to lapse past 60 days.
- `GET /api/v1/blog/public-list` and `GET /api/v1/blog/public/:slug` — the
  website's Blog section, backed by the `BlogPost` table rather than static
  files. Authenticated CRUD (`POST/GET/PATCH/DELETE /api/v1/blog[/:id]`,
  restricted to `SUPER_ADMIN`/`CLINIC_OWNER`/`MARKETING_TEAM`) is managed
  from the admin panel's Blog page — draft articles never appear on either
  public endpoint until published.

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
