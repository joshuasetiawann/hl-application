# Deploy to Vercel (PostgreSQL)

This app uses **PostgreSQL** for both local and Vercel. SQLite cannot run on
Vercel's read-only serverless filesystem. Follow these steps once.

---

## Step 1 — Create a PostgreSQL database (free)

Pick one:

- **Vercel Postgres** — in your Vercel project: **Storage → Create Database → Postgres**.
  Vercel auto-adds `POSTGRES_*` env vars. You will use `POSTGRES_PRISMA_URL` (pooled) as
  `DATABASE_URL`, and `POSTGRES_URL_NON_POOLING` for the one-time setup in Step 3.
- **Neon** (https://neon.tech) or **Supabase** — create a project and copy the connection
  string (looks like `postgresql://user:pass@host/db?sslmode=require`).

## Step 2 — Set Vercel Environment Variables

Vercel project → **Settings → Environment Variables** (apply to Production + Preview):

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | your Postgres connection string (Vercel Postgres: use the **pooled** `POSTGRES_PRISMA_URL`) |
| `AUTH_SECRET` | a long random string — generate with `openssl rand -hex 32` |
| `ADMIN_USERNAME` | *(optional)* admin username, default `admin` |
| `ADMIN_PASSWORD` | *(optional)* initial admin password (used only by the seed in Step 3) |

> Do **not** commit real values. `AUTH_SECRET` is **required** — without it, login returns
> a 500 "Terjadi kesalahan pada server".

## Step 3 — Create the tables + admin user (one time)

Run from your computer, pointed at the **same** Postgres database:

```bash
# 1. Put the Postgres URL in your local .env (for Vercel Postgres use the
#    NON-POOLING url here, e.g. POSTGRES_URL_NON_POOLING):
#    DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
#    AUTH_SECRET="...same long random string..."
#    ADMIN_USERNAME="admin"
#    ADMIN_PASSWORD="your-strong-password"

npm install
npx prisma db push      # creates all tables in Postgres
npm run db:seed         # creates the admin user (+ demo data if DB is empty)
```

> Or run `npm run setup` (does generate + db push + seed in one go).
> Change the password later with `npm run set-password` (or `ops/.../edit-password`).

## Step 4 — Redeploy & log in

Trigger a redeploy on Vercel (push a commit or "Redeploy"). Then open your
`*.vercel.app` URL and log in with `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

---

## Login password — quick reference

The admin password is whatever `ADMIN_PASSWORD` was when `db:seed` ran:
- with `.env.example` value → `change-me-strong-password`
- if seeded with no `ADMIN_PASSWORD` set → `admin123`

Set/replace it anytime: point `DATABASE_URL` at your Postgres and run
`npm run set-password` (hidden input, bcrypt-hashed, no restart needed).

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| **500 "Terjadi kesalahan pada server"** on login | `AUTH_SECRET` not set, OR DB not reachable/seeded. Check **Vercel → Deployment → Functions/Logs** for the exact error. |
| "Username atau password salah" (401) | DB works, but wrong password — re-seed or `set-password`. |
| Build OK but every DB page errors | `DATABASE_URL` missing/invalid in Vercel env vars. |
| "Can't reach database server" / connection limit | Use the **pooled** connection string for `DATABASE_URL`. |

## Local development (now uses Postgres too)

Put your Postgres `DATABASE_URL` + `AUTH_SECRET` in `.env`, then:

```bash
npm run setup     # generate + db push + seed
npm run dev       # http://localhost:3000
```

Tip: Neon supports free **branches**, so you can use a separate branch as your local dev DB.
