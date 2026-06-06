# HL Sales & Receivables Management App

Internal single-user web app for **HL** to manage Pelanggan (Customers), Produk (Products),
Bon/Transaksi (Transactions), Piutang (Receivables), Bonus, Pelunasan (Settlements), and
reports with PDF export.

- **Currency:** IDR / Rupiah only. **No tax/PPN anywhere.** Accounting is **cash basis**.
- Omzet, Laba HL, and bonus eligibility are recognized **only when status = Lunas**.
- New transactions default to **Piutang**. **Ongkir** is pass-through (billed, excluded from omzet/profit).
- Bonus items are free: 0 omzet, 0 receivable, 0 profit impact.

## Tech Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Prisma** ORM + **SQLite** (swap `DATABASE_URL` for Postgres in production if desired)
- **Tailwind CSS** for UI
- **decimal.js** for decimal-safe money math (single source of truth in `src/lib/calc.ts`)
- **jose** (JWT) + **bcryptjs** for single-user auth
- **pdfkit** for PDF exports
- **Vitest** for unit tests

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#   Edit .env and set a strong AUTH_SECRET, plus ADMIN_USERNAME / ADMIN_PASSWORD.

# 3. Create the database, generate the client, and seed the admin user
npm run setup
#   (= prisma migrate deploy + prisma generate + seed)

# 4. Run
npm run dev          # development at http://localhost:3000
# or
npm run build && npm run start   # production
```

## Environment variables (`.env`)

| Variable         | Description                                              |
| ---------------- | ------------------------------------------------------- |
| `DATABASE_URL`   | DB connection. Default `file:./dev.db` (SQLite).        |
| `AUTH_SECRET`    | Long random string used to sign session JWTs.           |
| `ADMIN_USERNAME` | The single admin login username.                        |
| `ADMIN_PASSWORD` | The single admin login password (hashed on seed).       |

## Login / Admin account

The app is **single-user with no public registration**. The one account is created/updated
by the seed script from `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

Default dev credentials (change for production): **`admin` / `admin123`**.

To change the password later, update `.env` and re-run `npm run db:seed` (idempotent — it
upserts the admin and removes any other users).

## Scripts

| Command            | Purpose                                       |
| ------------------ | --------------------------------------------- |
| `npm run dev`      | Start dev server                              |
| `npm run build`    | Generate Prisma client + production build     |
| `npm run start`    | Start production server                       |
| `npm run lint`     | ESLint                                        |
| `npm run test`     | Vitest unit tests (calculation reference)     |
| `npm run setup`    | migrate deploy + generate + seed              |
| `npm run db:seed`  | (Re)seed admin user                           |

## Domain glossary

- **Bon** — one transaction/invoice, identified by a unique **Nomor Bon**.
- **LM / BR** — product types. Each customer has independent cascading discount sets per type.
- **Harga Modal** — cost price (internal, used only for Laba HL; never shown in customer PDFs).
- **Harga Base / Harga Jual** — list price before discount.
- **Diskon bertingkat** — cascading discounts applied sequentially (never summed):
  `B × (1−d1/100) × (1−d2/100) × …`. Example: base 100, `[20,20,10]` → **57.6** (effective 42.4%).
- **Ongkir** — shipping; added to amount owed, excluded from omzet & profit.
- **Omzet** — discounted unit price × qty (excludes ongkir).
- **Laba HL** — `(discounted unit price − harga modal) × qty`.
- **Piutang** — unpaid receivable. **Lunas** — paid/settled.

## Calculation reference

All money math lives in [`src/lib/calc.ts`](src/lib/calc.ts) and is covered by unit tests in
`src/lib/calc.test.ts`:

- `applyCascadingDiscount(basePrice, steps)`
- `calculateLine({ basePrice, hargaModal, qty, discountSteps, isBonus })`
- `calculateTransaction({ lines, ongkir, isBonus })`
- `calculateRecognizedTotals(txns)`
- `calculateBonusEligibility({ threshold, accumulatedPaidOmzet, bonusesAlreadyGranted })`

Bonus rule: `bonusesAvailable = floor(accumulatedPaidOmzet / threshold) − bonusesAlreadyGranted`.
Worked example: threshold 10jt, paid omzet 25jt, none granted → 2 available; granting 2 consumes
20jt, carries over 5jt.

## Features / Modules

- **Auth** — login/logout, JWT cookie session, middleware-protected pages & API.
- **Pelanggan** — CRUD, two ordered cascading discount sets (LM/BR) with add/edit/delete/reorder,
  bonus threshold, soft-delete.
- **Produk** — CRUD, LM/BR type, harga base & modal, soft-delete.
- **Bon/Transaksi** — multi-line, auto discount per customer×type, ongkir, live totals,
  per-line snapshots (history-safe), view/edit/soft-delete, unique Nomor Bon.
- **Bonus** — eligibility tracking, bonus bons (free items), grant cap enforcement, bonus log.
- **Pelunasan** — settle a single bon or a whole month (modal asks Tanggal Pelunasan).
- **Customer detail** — monthly activity grouping with totals (Piutang, sudah dibayar, Omzet,
  Laba HL, Omzet LM/BR, combined).
- **Rekap/Laporan** — overall, per-customer, per product type (LM/BR), with month/year filters.
- **PDF export** — Piutang list, transaction list, recaps (IDR formatting, filters, generated
  date, totals; no PPN; no Harga Modal in customer-facing docs).

## Data integrity

- Unique index on `nomorBon`; indexes on `customerId`, `tanggal`, `status`, `isBonus`, `deletedAt`.
- Settlement and bonus-grant operations run in DB transactions.
- Transaction line **snapshots** (type, base/modal price, discount steps, discounted price,
  line omzet, line profit) preserve historical bon values even if master data later changes.
- Master data uses **soft-delete** (never hard-deleted when history exists).
- LM/BR and Piutang/Lunas are constrained values (SQLite has no native enums, so they are
  validated with Zod at the application layer).

## Assumptions / deferred items

- **SQLite enums:** stored as strings constrained via Zod (SQLite lacks native enums). Switching
  `provider` to `postgresql` is straightforward and would allow native enums if preferred.
- **Bonus bon status:** stored as `LUNAS` with 0 amount owed so it never appears as outstanding
  Piutang; it is fully excluded from all financial totals and shown only in the bonus log/markers.
- **Editing a bon** intentionally recomputes snapshots from current customer/product master data
  (the documented "edit recalculates" behavior); unedited bons keep their original snapshots.
- Single-user only by design; there is no user-management UI.
