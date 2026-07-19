# Deploying to MilesWeb (cPanel shared hosting)

This guide is for deploying the three apps in this repo — the backend API,
the admin panel, and the public website — to a **cPanel-based shared
hosting plan** (e.g. MilesWeb Business), using cPanel's **Node.js Selector**
(CloudLinux/Passenger). It assumes no Docker and no dedicated Redis — shared
hosting doesn't support either, and this app is built to work fine without
them (see "Redis" below).

If the "Setup Node.js App" icon isn't visible in your cPanel, contact
MilesWeb support and ask them to enable the CloudLinux Node.js Selector for
your account — it's included with Business-tier shared plans but sometimes
needs enabling.

## 0. Plan your (sub)domains

You're deploying three separate long-running Node processes, each bound to
its own domain/subdomain:

| App | Suggested domain | Node entry file |
|---|---|---|
| Public website | `yourdomain.com` | `server.js` (standalone build) |
| Admin panel | `admin.yourdomain.com` | `server.js` (standalone build) |
| Backend API | `api.yourdomain.com` | `dist/server.js` |

Create the two subdomains first under cPanel → **Domains** (or
**Subdomains** on older cPanel themes). Their document root doesn't matter
much — the Node.js Selector serves the app itself, not static files from
`public_html`.

## 1. Create the MySQL database

cPanel → **MySQL® Databases**:

1. Create a database (cPanel will prefix it, e.g. `youruser_clinic`).
2. Create a database user with a strong password (prefixed too, e.g.
   `youruser_clinicapp`).
3. Add that user to that database with **ALL PRIVILEGES**.

Your `DATABASE_URL` will be:

```
mysql://youruser_clinicapp:YOUR_PASSWORD@localhost:3306/youruser_clinic
```

## 2. Deploy the backend (`api.yourdomain.com`)

**Build locally first** (don't try to run `npm install`/TypeScript builds on
shared hosting — resources are too limited and it can time out):

```bash
npm ci
npm run build        # produces dist/
```

**Upload** these to a folder outside `public_html` (e.g. `~/nodeapps/backend`):
`dist/`, `package.json`, `package-lock.json`, `prisma/` (schema, migrations,
seed scripts). Do **not** upload `node_modules` or a local `.env`.

**cPanel → Setup Node.js App → Create Application:**
- Node.js version: highest available ≥ 20 (this app requires Node ≥ 20)
- Application mode: Production
- Application root: `nodeapps/backend`
- Application URL: `api.yourdomain.com`
- Application startup file: `dist/server.js`

Add every variable from `.env.example` as an **Environment Variable** in
this same cPanel page (not a committed `.env` file). Key production values:

- `DATABASE_URL` — from step 1
- `CORS_ORIGIN` — `https://yourdomain.com,https://admin.yourdomain.com`
  (the real HTTPS domains from step 0 — no `localhost`, no wildcard)
- `TRUST_PROXY` — `true` (Passenger/Apache sits in front of your app)
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET` — generate with
  `openssl rand -hex 64` each, never reuse the `.env.example` placeholders
- `REDIS_URL` — leave **blank** (see "Redis" below)
- `NODE_ENV` — `production`
- Everything else (Google Places, Instagram, marketing webhooks) — optional,
  fill in later when you have those credentials

Click **Run NPM Install** on the app page — it installs only what
`package.json` declares (no dev dependencies) inside cPanel's isolated
Node virtualenv.

**Run the database migration and seed.** Open cPanel → **Terminal** (under
Advanced), then:

```bash
source /home/YOURUSER/nodevenv/nodeapps/backend/20/bin/activate   # cPanel shows you the exact path on the app's page
cd ~/nodeapps/backend
npx prisma migrate deploy
npm run prisma:seed                # first Super Admin — set SEED_ADMIN_EMAIL/PASSWORD first
npm run prisma:seed:catalog        # optional: starter treatment/package catalog
npm run prisma:seed:blog           # optional: 42 starter blog articles
deactivate
```

Restart the app from the Node.js Selector page, then confirm
`https://api.yourdomain.com/healthz` returns `200`.

## 3. Build the website and admin panel

Both are Next.js apps built with `output: 'standalone'` (already configured
in `next.config.mjs`), which bundles just enough of `node_modules` to run —
**no `npm install` needed on the server for these two**, which matters a
lot on a resource-limited shared plan.

`NEXT_PUBLIC_API_BASE_URL` is a **build-time** value — it gets baked into
the client bundle, so it must already be the real, final backend URL when
you build (changing it later means rebuilding and re-uploading):

```bash
# Website
cd website
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api/v1 npm run build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static

# Admin panel
cd ../frontend
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api/v1 npm run build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
```

Upload the **contents** of each `.next/standalone/` folder (it now contains
its own `server.js`, trimmed `node_modules`, `public/`, and `.next/static/`)
to its own folder on the server, e.g. `~/nodeapps/website` and
`~/nodeapps/frontend`.

**cPanel → Setup Node.js App**, once per app:

| | Website | Admin panel |
|---|---|---|
| Application root | `nodeapps/website` | `nodeapps/frontend` |
| Application URL | `yourdomain.com` | `admin.yourdomain.com` |
| Startup file | `server.js` | `server.js` |

Neither needs environment variables at runtime (the API URL is already
baked into the build). Start both apps.

## 4. Enable SSL

cPanel → **SSL/TLS Status** → run AutoSSL for all three (sub)domains
(MilesWeb includes free Let's Encrypt certificates via AutoSSL on shared
plans). Confirm all three load over `https://` with no browser warning
before telling anyone the site is live — and double-check `CORS_ORIGIN` on
the backend uses the `https://` versions, or the website/admin panel will
get CORS errors calling the API.

## Redis

This app treats Redis as optional — without `REDIS_URL` set, rate limiting
falls back to a safe in-memory counter per process
(`src/middlewares/rateLimiter.middleware.ts`). That's the right tradeoff
for a single shared-hosting process running one clinic's traffic; leave
`REDIS_URL` blank and move on. (It only matters once you're running
multiple horizontally-scaled backend instances, which shared hosting
doesn't do anyway.)

## Post-deploy checklist

- [ ] `https://api.yourdomain.com/healthz` → `200`
- [ ] Log into the admin panel with the seeded Super Admin, **change the
      password immediately** if you used the `.env.example` default
- [ ] Website home page, Blog, Testimonials, Gallery show real data (not
      the "not configured" / empty-state fallbacks)
- [ ] All three (sub)domains load over HTTPS with a valid certificate
- [ ] `.env`/environment variables are not committed to git and not
      reachable over HTTP (they live in cPanel's Node app config, not a
      web-served folder)
