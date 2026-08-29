# AutoMarket

A vehicle marketplace for the Indian market — new **cars, bikes, buses and tractors** — built around
one idea: the customer gets the exact price they will actually pay, and the business gets a
qualified lead in return.

Four verticals sit on one catalogue:

| Vertical | What the customer gets | What the business gets |
| --- | --- | --- |
| **Discovery** | Brands, models, variants, spec sheets, comparison | Traffic and intent signals |
| **On-road price** | Itemised city-wise breakup — road tax, registration, insurance, FASTag, TCS | A lead naming the exact variant and city |
| **Finance** | EMI calculator, eligibility across lenders, one-click apply | A loan application with income and credit profile |
| **Insurance** | IDV-based premium comparison across insurers, add-ons, NCB | A policy enquiry with vehicle and expiry details |

Every action in the last three verticals writes to a single `Lead` table, so the sales desk works
one queue regardless of which vertical produced it.

## Stack

- **Backend** — Node.js 20, Express, TypeScript, Prisma, PostgreSQL
- **Frontend** — Next.js 14 (App Router), React 18, Tailwind CSS
- **Auth** — JWT access/refresh tokens, Argon2id password hashing, role-based access control

## Running it

### With Docker

```bash
export JWT_ACCESS_SECRET=$(openssl rand -base64 48)
export JWT_REFRESH_SECRET=$(openssl rand -base64 48)
docker compose up --build
docker compose exec api npx prisma db seed
```

### Locally

```bash
# 1. Database
createdb automarket

# 2. API
cd backend
cp .env.example .env          # set DATABASE_URL and both JWT secrets
npm install
npx prisma migrate deploy
npm run prisma:seed
npm run dev                   # http://localhost:4000

# 3. Website
cd ../web
cp .env.example .env.local
npm install
npm run dev                   # http://localhost:3000
```

The seed loads 22 brands, 25 models and 53 variants across all four vehicle types, 12 cities with
their RTO rules, IRDAI third-party premium slabs, 6 lenders and 5 insurers.

Admin sign-in for the sales console at `/admin`: `admin@automarket.in`, password from
`SEED_ADMIN_PASSWORD` (default `ChangeMe@12345` — change it before any deployment).

## How the pricing works

### On-road price

The breakup is computed from `RtoRule` rows, one per (city, vehicle type, fuel type, price band).
A rule with a null `fuelType` acts as the band's fallback, so a state that taxes diesel differently
only needs the one extra row.

```
on-road = ex-showroom
        + road tax (% of ex-showroom, by state and price band)
        + registration + hypothecation + green cess
        + first-year insurance (own damage % + IRDAI third-party slab + GST)
        + FASTag + dealer handling (capped)
        + TCS (1% above ₹10 lakh ex-showroom, cars only)
```

Before the customer identifies themselves the site shows a ±2% estimate band; the itemised breakup
is released by `POST /pricing/on-road`, which creates the lead and persists the quote in the same
call. Quotes are stored rather than recomputed, so a lead can be reopened months later against the
numbers the customer was actually shown.

### Loan eligibility

The sanctioned amount is the smallest of four caps: what the buyer asked for, what their income
supports (50% FOIR less existing EMIs, reverse-solved through the EMI formula), the lender's LTV
ceiling, and the product's maximum. The offered rate moves within each lender's advertised band by
credit score.

### Insurance premium

IDV is derived from the showroom price using the IRDAI depreciation grid for the vehicle's age.
Own-damage premium is a percentage of IDV that varies by insurer and plan; add-ons load onto it;
NCB discounts it (and resets to zero on a claimed year); the third-party slab and the compulsory
owner-driver cover are added, then GST.

## API

Base path `/api/v1`. Public endpoints need no auth; `/leads`, `/dashboard` and the two
`/applications` routes require a bearer token.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/catalog/home-feed` | Home page rails |
| `GET` | `/catalog/models` | Listing with filters, sorting, pagination |
| `GET` | `/catalog/models/:brand/:model` | Model detail with variants and grouped specs |
| `GET` | `/catalog/compare?variantIds=` | Side-by-side spec table for 2-4 variants |
| `GET` | `/catalog/filters/:vehicleType` | Facet counts for the listing sidebar |
| `GET` | `/pricing/on-road/teaser` | Estimate band, no lead required |
| `POST` | `/pricing/on-road` | **Lead exchange** — creates the lead, returns the breakup |
| `POST` | `/leads/capture` | Test drive, callback and dealer-contact forms |
| `POST` | `/finance/emi` | EMI, total interest, optional amortisation schedule |
| `POST` | `/finance/eligibility` | Per-lender sanction, rate and EMI |
| `POST` | `/finance/apply` | Loan application + lead |
| `POST` | `/insurance/quotes` | Premium comparison across insurers |
| `POST` | `/insurance/apply` | Policy enquiry + lead |
| `GET` | `/leads` | Sales queue (auth) |
| `GET` | `/dashboard/overview` | Lead, loan and premium metrics (auth) |

## Security notes

- Public forms and login sit behind a separate, much tighter rate limiter than the general API.
- `POST /leads/capture` returns only an acknowledgement id — never the stored record, so a lead id
  cannot be used to read back another customer's details.
- Login verifies against a dummy hash when the account does not exist, so response timing does not
  enumerate valid accounts.
- Validated request bodies replace the originals, dropping any field not in the schema.
- Customer phone numbers and emails are redacted from logs.
- Prices are stored as `BIGINT` whole rupees and serialised explicitly, so no float rounding reaches
  a customer-facing number.

## Roadmap

Deliberately out of scope for this first cut, in rough priority order:

1. Used-car listings and seller onboarding (the second half of a CarDekho-style marketplace)
2. Vehicle images and a media pipeline — the catalogue models the fields, the seed ships no assets
3. Dealer portal: lead acceptance, quotations and payout reconciliation
4. Payment gateway for insurance premiums, and insurer/lender API integrations to replace the
   rule-based quote engine
5. SMS/WhatsApp notification on lead capture, and CRM export
6. Editorial content — reviews, news and comparisons — for organic search
