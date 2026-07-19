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

## SEO

- **Metadata**: every page sets its own `title`/`description`/canonical URL
  (via `metadata.alternates.canonical`); the root layout provides a title
  template (`"Page — Lumine Aesthetics"`), Open Graph/Twitter card defaults,
  and `keywords`.
- **Structured data (JSON-LD)**: `MedicalBusiness`/`LocalBusiness` schema
  (name, address, geo, phone, hours) is injected site-wide from
  `src/lib/structuredData.ts` — this is what lets Google show address/hours
  directly in search results. The FAQ page adds `FAQPage` schema on top,
  which can make individual questions expandable directly in Google's
  search results.
- **`sitemap.xml` / `robots.txt`**: auto-generated from `src/app/sitemap.ts`
  / `src/app/robots.ts` — add new pages to the `routes` array in
  `sitemap.ts` when you add one.
- **Social share image**: `src/app/opengraph-image.tsx` generates the
  Facebook/WhatsApp/Twitter link-preview card on the fly (branded
  gradient + clinic name) — no photography needed. `src/app/icon.tsx` does
  the same for the browser-tab favicon. Swap either for a real
  photo/logo file later by replacing these with a static `icon.png` /
  `opengraph-image.png` in `src/app/`.

**Before launch**: set `siteConfig.url` in `src/config/site.ts` to the real
production domain — canonical URLs, the sitemap, and OG image resolution
all depend on it.

## Conversion features

- **WhatsApp click-to-chat**: a floating button on every page
  (`src/components/WhatsAppButton.tsx`) opens a pre-filled WhatsApp chat —
  the highest-converting contact method for a local clinic in India.
- **Sticky mobile CTA bar**: `src/components/MobileStickyCta.tsx` keeps
  "Call Now" / "Book Appointment" one tap away at the bottom of the screen
  on mobile, where most local-search traffic lands.
- **FAQ page** (`/faq`): answers common objections (cost, pain, downtime,
  safety) up front — reduces drop-off and doubles as FAQ-rich-result SEO.
- **Prefilled enquiries**: clicking "Enquire about this" on a treatment
  (Home or Services) carries the treatment name into the Contact form's
  notes field via `?treatment=...`, so visitors don't have to retype it.
- **Google Maps embed** on the Contact page, next to click-to-call and
  WhatsApp buttons, so visitors can act without leaving the page.

## Branding

All clinic-specific content — name, tagline, address, phone, email,
WhatsApp number, hours, Instagram link, production URL — lives in one
file: `src/config/site.ts`. Update the `TODO`-marked fields there (phone,
WhatsApp number, email, hours, coordinates, production URL) with real
values before launch; everything else on the site reads from this config.

Gallery (`src/app/gallery/page.tsx`) and Testimonials
(`src/app/testimonials/page.tsx`) currently render clearly-labeled
placeholder content — swap in real photos/reviews before launch.

## Structure

```
src/
  app/
    layout.tsx           shared Navbar/Footer/WhatsApp/sticky-CTA shell, site-wide metadata + JSON-LD
    page.tsx              Home
    about/                  About
    services/                Services (live data from the backend)
    gallery/                  Gallery (placeholder)
    testimonials/              Testimonials (placeholder)
    faq/                        FAQ (with FAQPage schema)
    contact/                     Contact/Book Appointment (writes to the CRM)
    sitemap.ts             sitemap.xml
    robots.ts              robots.txt
    opengraph-image.tsx    social share card (generated)
    icon.tsx               favicon (generated)
  components/            Navbar, Footer, EnquiryForm, WhatsAppButton, MobileStickyCta, JsonLd
  config/site.ts          branding/contact single source of truth
  lib/
    api.ts                 fetchPublicTreatments(), submitEnquiry()
    structuredData.ts       JSON-LD builders (LocalBusiness, FAQPage)
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
backend's public URL, `siteConfig.url` to the production domain, and add
the site's production domain to the backend's `CORS_ORIGIN`.
