# Deploying to a VPS with Docker (recommended, simplest path)

This is the easiest way to get all three apps (backend API, admin panel,
website) plus MySQL live — you don't need to learn Docker, just copy-paste
the commands below one at a time into your VPS's terminal (SSH).

Everything runs from one command: `docker compose up --build -d`. Behind
the scenes, Docker builds and starts five containers — the backend, the two
Next.js apps, MySQL, Redis — plus **Caddy**, a reverse proxy that
automatically gets free HTTPS certificates for your three domains with zero
manual certificate setup.

## 0. What you need before starting

- A VPS with **Ubuntu 22.04 or 24.04** (a Hostinger KVM VPS works well —
  pick a plan with at least 2GB RAM). Note down its **IP address** and the
  **root password** (or SSH key) you were given at signup.
- A domain name, with access to its DNS settings (wherever you bought it —
  GoDaddy, Hostinger, etc.).
- This repository pushed to GitHub (already done).

## 1. Point your domains at the VPS

In your domain's DNS settings, add three **A records**, all pointing to
your VPS's IP address:

| Type | Host | Value |
|---|---|---|
| A | `@` (or blank, for `yourdomain.com`) | your VPS IP |
| A | `admin` (for `admin.yourdomain.com`) | your VPS IP |
| A | `api` (for `api.yourdomain.com`) | your VPS IP |

DNS changes can take anywhere from a few minutes to a few hours to work
everywhere — you can start the next steps while you wait, but HTTPS won't
work until it's propagated.

## 2. Connect to your VPS

- **Windows**: download [PuTTY](https://www.putty.org/), open it, type
  your VPS's IP in "Host Name", click Open, log in as `root` with the
  password from your hosting provider.
- **Mac/Linux**: open Terminal and run `ssh root@YOUR_VPS_IP`.

Everything from here on is typed/pasted into that terminal.

## 3. Install Docker

Copy-paste this whole block and press Enter — it installs Docker and
Docker Compose in one go:

```bash
curl -fsSL https://get.docker.com | sh
```

Wait for it to finish (a minute or two), then confirm it worked:

```bash
docker --version
docker compose version
```

Both should print a version number.

## 4. Get the code onto the VPS

You'll need a **GitHub Personal Access Token** to clone a private repo:
GitHub → your profile picture → **Settings** → **Developer settings** →
**Personal access tokens** → **Tokens (classic)** → **Generate new token**
→ tick the `repo` scope → Generate → copy the token (starts with `ghp_`).

```bash
git clone https://YOUR_TOKEN@github.com/sumitgrover1/testaccount.git app
cd app
```

(Replace `YOUR_TOKEN` with the token you copied. You won't need it again
after this — `git pull` inside `~/app` later will ask for it again if you
update the code, or you can set up an SSH key instead if you'll do this
often.)

## 5. Create the `.env` file

```bash
nano .env
```

This opens a text editor inside the terminal. Paste in the block below,
**replacing every value in `< >` with your real ones**, then save and exit
(`Ctrl+O`, Enter, `Ctrl+X`):

```bash
NODE_ENV=production
WEBSITE_DOMAIN=<yourdomain.com>
ADMIN_DOMAIN=admin.<yourdomain.com>
API_DOMAIN=api.<yourdomain.com>

JWT_ACCESS_SECRET=<run: openssl rand -hex 64>
JWT_REFRESH_SECRET=<run: openssl rand -hex 64 — a DIFFERENT one>
COOKIE_SECRET=<run: openssl rand -hex 64 — a DIFFERENT one again>

MYSQL_ROOT_PASSWORD=<make up a strong password>
MYSQL_APP_PASSWORD=<make up a different strong password>

SEED_ADMIN_EMAIL=<your real email — this becomes your admin login>
SEED_ADMIN_PASSWORD=<a strong password you'll remember>
```

To generate each secret, run this three times and paste one result into
each `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`/`COOKIE_SECRET` line:

```bash
openssl rand -hex 64
```

## 6. Start everything

```bash
docker compose up --build -d
```

This takes several minutes the first time (building all five containers).
Check that everything is healthy:

```bash
docker compose ps
```

You should see `app`, `mysql`, `redis`, `frontend`, `website`, `caddy` all
listed as `running` (or `healthy`).

## 7. Set up the database

```bash
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run prisma:seed
docker compose exec app npm run prisma:seed:catalog   # optional: starter treatment/package catalog
docker compose exec app npm run prisma:seed:blog      # optional: 42 starter blog articles
```

## 8. Check it's live

Open in your browser:

- `https://yourdomain.com` — the website
- `https://admin.yourdomain.com` — the admin panel; log in with the
  `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` you set in step 5
- `https://api.yourdomain.com/healthz` — should show `{"status":"ok"}`

If a page doesn't load, DNS may still be propagating (wait a bit and
retry) or something in step 6 failed — check logs with:

```bash
docker compose logs app       # or: frontend / website / caddy / mysql
```

Paste any error you see here and I'll help you fix it.

## Updating the app later

```bash
cd ~/app
git pull
docker compose up --build -d
```

## Everyday commands

| What | Command |
|---|---|
| See what's running | `docker compose ps` |
| View logs (live) | `docker compose logs -f app` |
| Restart everything | `docker compose restart` |
| Stop everything | `docker compose down` |
| Start again | `docker compose up -d` |
