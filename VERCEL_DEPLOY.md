# Deploy to Vercel — Turnkey Guide

This app is built to deploy on Vercel with **as close to zero configuration as
physically possible**. On every deploy the build step (`npm run vercel-build`,
pinned in `vercel.json`) automatically runs:

```
bake session secret → prisma generate → prisma db push → seed admin → next build
```

So the signing secret, database tables, and the admin account are all created
for you. The build is resilient: if no database is connected yet it logs a
warning and still deploys (DB features switch on once you add one).

## The only step you must do: add a database

Vercel's filesystem is ephemeral, so the app needs a hosted Postgres. This is
the one thing I can't do for you (it's a credential tied to your account).

**Option A — Vercel Postgres (≈1 click, recommended):**
Project → **Storage → Create Database → Postgres**, connect it to the project.
Vercel injects `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, … and **the app
auto-detects them — you do NOT need to set `DATABASE_URL` manually.**

**Option B — Neon / Supabase / other:**
Add one env var `DATABASE_URL` = their `postgresql://…` string (use the
direct/non-pooled URL).

Then **Redeploy** (Deployments → ⋯ → Redeploy, or push any commit). Open your
`*.vercel.app` URL and log in:

- **Username:** `admin` (or your `ADMIN_USERNAME`)
- **Password:** `admin123` (or your `ADMIN_PASSWORD`)

That's it.

## Optional environment variables

Set these in **Settings → Environment Variables** (Production + Preview). None
are required to get a working deploy.

| Variable | Default | Why set it |
| --- | --- | --- |
| `AUTH_SECRET` | auto-generated per build | Set a long random value (`openssl rand -hex 32`) so login sessions stay valid **across deploys**. Without it, each new deploy bakes a fresh secret and everyone simply logs in again — fine for a single-admin app, but a fixed value is nicer. |
| `ADMIN_PASSWORD` | `admin123` | Initial admin password (only used the first time the admin is seeded). |
| `ADMIN_USERNAME` | `admin` | Initial admin username. |

> **`AUTH_SECRET` is no longer required.** Earlier versions returned a 500 on
> login when it was missing; the app now bakes a strong per-build fallback so
> login works out of the box. Setting it is just an upgrade for session stability.

To change the admin password later, run `npm run set-password` locally pointed at
the same database. Redeploys never reset a changed password.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Login says **"Username atau password salah"** (401) | DB works; wrong password. Use your `ADMIN_PASSWORD` (default `admin123`) or run `npm run set-password`. |
| Pages 500 / "Terjadi kesalahan pada server" | Database not reachable. Confirm a Postgres is connected (Step above) and redeploy. Check **Vercel → Deployment → Functions/Logs**. |
| You were logged out after a deploy | Expected if `AUTH_SECRET` isn't set (a new fallback was baked). Set `AUTH_SECRET` to keep sessions across deploys. |
| Build log: "No database env var found … Skipping db push & seed" | No Postgres connected yet. The site still deploys; add a DB and redeploy. |
| Build log: "prisma db push failed" | DB unreachable/invalid at build time. Verify the database is created and connected; redeploy. |

## Local development

```bash
# .env:  DATABASE_URL="postgresql://…"   (AUTH_SECRET optional)
npm install
npm run setup                 # prisma generate + db push + seed admin
SEED_DEMO=true npm run db:seed  # optional: add demo customers/products/bons
npm run dev                   # http://localhost:3000
```
