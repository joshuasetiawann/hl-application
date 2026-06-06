# Local Verification — HL Sales & Receivables Management App

Verified on the development container before pushing.

## Local URL
- App: **http://localhost:3000**
- Login page: http://localhost:3000/login

## Admin / demo login
- Username: **admin**
- Password: **admin123**
- Credentials come from `ADMIN_USERNAME` / `ADMIN_PASSWORD` (see `.env.example`) and are
  seeded (bcrypt-hashed) by `prisma/seed.ts`. Change them for any real use.

## How to run locally
```bash
npm install
cp .env.example .env          # then set AUTH_SECRET (and admin creds if desired)
npm run setup                 # prisma migrate deploy + generate + seed (SQLite dev.db)
npm run dev                   # http://localhost:3000
```

## Commands run & results
| Command | Purpose | Result |
| --- | --- | --- |
| `npm install` | Install deps (npm) | ✅ pass |
| `npx prisma migrate deploy` | Apply migrations to local SQLite | ✅ pass |
| `npx tsx prisma/seed.ts` | Seed admin + demo data | ✅ pass |
| `npm run lint` | ESLint | ✅ pass (no warnings/errors) |
| `npx vitest run` | Unit + integration tests | ✅ pass (38/38) |
| `npm run build` | Production build (typecheck + compile) | ✅ pass (compiled successfully) |
| `npm start` | Production server boot | ✅ serves (login/dashboard/pdf = 200) |
| `npx prisma validate --schema=prisma/schema.postgres.prisma` | Validate prod Postgres schema | ✅ valid |

Tests cover the critical business rules: cascading discount `[20,20,10]`→`57.6`, discount/type
validation, Bon defaults to Piutang, duplicate Nomor Bon rejected, ongkir excluded from
omzet/profit, cash-basis recognition (Lunas only), bonus eligibility (10jt threshold + 25jt
paid = 2; grant 2 → 5jt carryover), bonus Bon = 0 omzet/owed/profit & excluded from recaps,
soft-delete hiding with preserved history, single + whole-month settlement, edit recalculation.

## Manual verification checklist (run end-to-end against the live server)
- [x] Unauthenticated API blocked (401) and pages redirect to /login
- [x] Invalid credentials rejected; valid login works; logout works
- [x] Beranda/Dashboard loads (Total Piutang, paid bulan ini, Omzet/Laba HL, Bonus Tersedia, Bon terbaru)
- [x] Pelanggan list/detail/create (LM/BR cascading discounts, threshold, soft-delete, Bonus Tersedia)
- [x] Produk list/create (LM/BR, Harga Modal marked Internal, invalid type rejected)
- [x] Create Bon (wizard): defaults Piutang; omzet `57.6×2 = 115.2`; ongkir in tagihan only
      (`115.2 + 25.000`); Laba HL `(57.6−40)×2 = 35.2`; duplicate Nomor Bon → 409
- [x] Settle single Bon → Lunas with payment date
- [x] Bonus eligibility: 25jt paid / 10jt threshold = **2** available
- [x] Bonus Bon grants 2 → 0 omzet / 0 owed / 0 profit; carryover 5jt; over-grant rejected
- [x] Settle whole month settles only that customer's Piutang for that month
- [x] Reports/Recap (overall, per-customer, LM/BR) render with filters
- [x] PDF export: piutang, transactions, recap (overall + per-customer), single Bon — all return valid `application/pdf`

Automated end-to-end run result: **33/34 checks passed**. The single non-pass is expected
behaviour: requesting `/login` while already authenticated returns a 307 redirect to the
dashboard (verified separately that `/login` returns 200 with the login form when logged out).

## Screenshots
- Browser automation (Playwright/Chromium) **could not be installed** in this sandbox: the
  Playwright browser CDN and `apt` are blocked by the environment's outbound network policy,
  so no PNG screenshots could be captured.
- As evidence instead, the fully-rendered DOM of each page was saved to
  `./screenshots/hl-app/*.html` (login, beranda, pelanggan, produk, bon, bon-detail, piutang,
  bonus, rekap). These are local artifacts (not committed) and reference the dev server's CSS.

## Known issues
- No PNG screenshots (browser download blocked by sandbox network policy — see above).
- Local dev uses SQLite (`dev.db`); production must use PostgreSQL (see `DEPLOYMENT_RESULT.md`).
