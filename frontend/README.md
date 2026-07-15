# Clinic Management Platform — Admin Panel

A Next.js (App Router) admin panel that consumes the backend API in
`../src` (see the repo root `README.md` for the backend). Covers every
backend module: patients, leads, treatments, packages, pricing, treatment
enrollments, appointments, inventory, billing, marketing, follow-ups,
communications, dashboard reporting, and staff (user) management.

## Stack

- **Next.js 16** (App Router) + React 18 + TypeScript (strict)
- **Tailwind CSS** for styling
- **TanStack React Query** for server state (caching, refetching, mutations)
- **react-hook-form + zod** for forms
- **axios** for the API client, with automatic access-token refresh

## Architecture

```
src/
  app/
    layout.tsx, providers.tsx      Root layout, React Query + Auth + Toast providers
    page.tsx                       Redirects to /dashboard or /login
    login/page.tsx                 Staff login
    (dashboard)/                   Route group behind ProtectedShell (sidebar + topbar)
      layout.tsx
      dashboard/                   Analytics/reporting home page
      patients/                    List, create, detail (profile/documents/timeline tabs)
      leads/                       List, create, detail (status pipeline + convert)
      treatments/, packages/       Service catalog
      pricing/                    Effective price lookup, overrides, approval queue
      enrollments/                 Treatment enrollment + session recording
      appointments/                Scheduling + status actions
      inventory/                   Products/batches, suppliers, purchase invoices (OCR review)
      billing/                     Invoices, payments, coupons
      marketing/                   Campaigns + performance
      followups/                   Follow-up tasks
      communications/              Unified patient/lead timeline + manual logging
      users/                       Staff account management (admin only)
  components/
    ui/                            Reusable primitives (Button, Input, Table, Modal, Badge, Tabs, ...)
    layout/                        Sidebar, Topbar, ProtectedShell
  lib/
    api/                           One file per backend module — typed request functions + the axios client
    auth/                          AuthContext + in-memory access-token store
    utils/                         Formatters, role-based nav config
  types/                          Shared TS types mirroring the backend's Prisma schema
```

## Auth flow

The backend issues a short-lived JWT access token in the response body plus
an httpOnly refresh-token cookie and a readable CSRF cookie (see the
backend's `SECURITY.md`). This frontend:

- Keeps the access token **in memory only** (`lib/auth/tokenStore.ts`) —
  never localStorage, so an XSS payload can't read it directly.
- Attempts a silent `/auth/refresh` on app load to restore a session after a
  page reload (the refresh cookie survives; the in-memory token doesn't).
- Automatically retries a request once after a 401 by refreshing the access
  token, via an axios response interceptor.
- Sends the CSRF cookie's value back as `X-CSRF-Token` on refresh/logout, as
  the backend's double-submit CSRF check requires.

## Getting started

```bash
cp .env.example .env.local
# Edit .env.local: point NEXT_PUBLIC_API_BASE_URL at your running backend

npm install
npm run dev
```

Requires the backend (`../`) running and reachable at the configured API
base URL, with `CORS_ORIGIN` on the backend including this app's origin
(e.g. `http://localhost:3001` if you run the frontend on a different port
than the backend).

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and start |
| `npm run lint` | ESLint (flat config: typescript-eslint + react-hooks) |
| `npm run typecheck` | TypeScript strict-mode check, no emit |

## Notes on scope

- Core modules (Patients, Leads, Appointments, Inventory, Billing,
  Enrollments) have full list/create/detail/action screens.
- A few auxiliary modules (Pricing approvals, Marketing, Follow-ups,
  Communications) are functional single-page list + action screens rather
  than deep multi-view sections — they cover every backend endpoint but with
  a lighter UI, since they're used less frequently than the core clinical
  workflow.
- Patient document uploads and purchase-invoice files are referenced by URL
  (a presigned-upload pattern) — this app does not itself handle raw file
  uploads; wire up your object storage provider's upload widget and pass the
  resulting URL into the existing "file URL" fields.
- Role-based navigation hides sidebar items a role can't use, but the
  backend is the actual authority — every action is re-checked server-side
  regardless of what the UI shows.
