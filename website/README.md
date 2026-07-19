# Lumine Aesthetics — Public Website

Public marketing site for the clinic, built with Next.js (App Router) +
TypeScript + Tailwind CSS. It's a separate project from the admin panel
(`../frontend`) — patients browsing this site are never authenticated;
they only ever hit two **public** backend endpoints:

- `GET /api/v1/treatments/public-list` — powers the Services page (name,
  category, description, duration, sessions — no pricing, since pricing is
  personalized per patient after a consultation).
- `POST /api/v1/leads/public-capture` — the Contact/Book Appointment form.
  Every submission creates a `Lead` (source `WEBSITE_FORM`) directly in the
  clinic's CRM, where the counselor team follows up from the admin panel.

## Setup

```bash
cd website
cp .env.example .env.local
# .env.local: NEXT_PUBLIC_API_BASE_URL should point at the backend, e.g.
# http://localhost:3000/api/v1 for local dev.

npm install
npm run dev
```

Runs at `http://localhost:3002` by default (the backend typically runs on
`3000`, the admin panel on `3001`).

**Important**: add this site's origin to the backend's `CORS_ORIGIN` env var
(see the root `.env.example`), otherwise the browser will block the Services
fetch and the Contact form submission.

## Branding

All clinic-specific content — name, tagline, address, phone, email, hours,
Instagram link — lives in one file: `src/config/site.ts`. Update the
`TODO`-marked fields there (phone, email, hours) with real values before
launch; everything else on the site reads from this config, so it only needs
to change in one place.

Gallery (`src/app/gallery/page.tsx`) and Testimonials
(`src/app/testimonials/page.tsx`) currently render clearly-labeled
placeholder content — swap in real photos/reviews before launch.

## Structure

```
src/
  app/
    layout.tsx        shared Navbar/Footer shell, page metadata
    page.tsx           Home
    about/              About
    services/            Services (live data from the backend)
    gallery/              Gallery (placeholder)
    testimonials/         Testimonials (placeholder)
    contact/              Contact/Book Appointment (writes to the CRM)
  components/           Navbar, Footer, EnquiryForm (client component)
  config/site.ts        branding/contact single source of truth
  lib/api.ts             fetchPublicTreatments(), submitEnquiry()
```

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server on port 3002 |
| `npm run build` / `npm start` | Production build/run |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript strict-mode check |

## Deploying

This is a plain Next.js app — deploy it anywhere Next.js runs (Vercel, a
Node server, Docker). Set `NEXT_PUBLIC_API_BASE_URL` to the production
backend's public URL, and add the site's production domain to the backend's
`CORS_ORIGIN`.
