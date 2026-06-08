# Deploy to Vercel — Turnkey Guide

This app auto-provisions itself on Vercel. On each deploy, the build step
(`vercel-build`) automatically runs **prisma generate → db push → seed admin**,
so tables and the admin account are created for you. **No manual db push/seed.**

There are only **two things only you can do** (I can't access your Vercel/GitHub):
**(1) create a database** and **(2) set `AUTH_SECRET`**. That's it.

---

## Step 1 — Add a PostgreSQL database (≈1 click)

In your Vercel project: **Storage → Create Database → Postgres**, and connect it to
the project. Vercel automatically injects the connection env vars
(`POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, …) — **the app auto-detects these,
so you do NOT need to set `DATABASE_URL` manually.**

> Using **Neon/Supabase** instead? Just add one env var `DATABASE_URL` =
> their `postgresql://…` connection string (use the direct/non-pooled one).

## Step 2 — Add `AUTH_SECRET` (required)

Project → **Settings → Environment Variables** → add (for Production + Preview):

| Variable | Value |
| --- | --- |
| `AUTH_SECRET` | a long random string — generate with `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | *(optional)* initial admin password (defaults to `admin123`) |
| `ADMIN_USERNAME` | *(optional)* admin username (defaults to `admin`) |

> Without `AUTH_SECRET`, login returns **500 "Terjadi kesalahan pada server"**.

## Step 3 — Redeploy

Push any commit (or hit **Redeploy** in Vercel). The build will:
`prisma generate` → `prisma db push` (create tables) → seed admin → `next build`.

Then open your `*.vercel.app` URL and log in:
- **Username:** `admin` (or your `ADMIN_USERNAME`)
- **Password:** your `ADMIN_PASSWORD` (or `admin123` if you didn't set one)

To change the admin password, run `npm run set-password` locally (pointed at the same
database). Redeploys will **not** reset it.

---

## Why these 2 steps can't be automated
A database and a signing secret are credentials. I have no access to your Vercel
account or GitHub settings, and secrets must never be committed to the repo. Every
database-backed app on Vercel requires these two — but everything else (schema,
tables, admin user, client generation) is now automatic.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| 500 "Terjadi kesalahan pada server" on login | `AUTH_SECRET` not set, or DB not reachable. Check **Vercel → Deployment → Functions/Logs**. |
| Login says "Username atau password salah" (401) | DB works; wrong password. Use `ADMIN_PASSWORD` value, or `npm run set-password`. |
| Build log: "No database env var found … Skipping db push & seed" | You haven't added a Postgres DB yet (Step 1). The site still deploys; add the DB and redeploy. |
| Build log: "prisma db push failed" | DB unreachable/invalid at build. Verify the database is created and connected; redeploy. |

## Local development (also PostgreSQL)

```bash
# .env:  DATABASE_URL="postgresql://…"   AUTH_SECRET="…"
npm run setup                 # generate + db push + seed admin
SEED_DEMO=true npm run db:seed  # optional: add demo customers/products/bons
npm run dev                   # http://localhost:3000
```
