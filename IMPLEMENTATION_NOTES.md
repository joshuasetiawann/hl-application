# Implementation Notes & Assumptions

This document records the engineering and product decisions made while building the
**HL Sales & Receivables Management App**, plus any assumptions taken where the spec
left room for judgment.

## Architecture

- **Next.js 14 (App Router) + TypeScript** — server components for data-heavy pages,
  client components for interactive forms.
- **Prisma + PostgreSQL** — the same database engine locally, in tests, on Vercel, and in
  Docker (no SQLite/Postgres provider switching to manage).
- **Tailwind CSS** for styling; small shared component library in `src/components/ui.tsx`.
- **decimal.js** for all money math; **jose** (JWT cookie) + **bcryptjs** for auth;
  **pdfkit** for PDF; **Vitest** for tests.

## Money & rounding policy

- All monetary arithmetic goes through `src/lib/calc.ts` using `decimal.js`
  (precision 30, `ROUND_HALF_UP`).
- Cascading discounts can produce fractional Rupiah (e.g. base 100, `[20,20,10]` → `57.6`).
  We **preserve up to 2 decimal places** on persisted/derived values via `toMoneyNumber()`
  (round half-up). This keeps the documented `57.6` example exact while avoiding float drift.
- Persisted snapshot/total columns use Postgres `Float` (double precision), but values are
  always computed with decimal.js first and rounded to 2 dp before storage, so no naive float
  math touches money.
- IDR display uses `Intl.NumberFormat("id-ID", { currency: "IDR" })`. **No tax/PPN** anywhere.

## Cash-basis recognition

- Omzet, Laba HL, "total paid", and the bonus accumulator are recognized **only** for
  transactions with `status = LUNAS` and `isBonus = false`.
- Outstanding Piutang counts only `status = PIUTANG`, non-bonus transactions, and equals
  `omzet + ongkir`.
- This is centralized in `calculateRecognizedTotals()` and `computeRecap()`.

## Single source of truth for calculations

`src/lib/calc.ts` exports every formula and is used by the API/services, the transaction
form (live preview), reports, PDF, and tests:
`applyCascadingDiscount`, `calculateLine`, `calculateTransaction`,
`calculateRecognizedTotals`, `calculateBonusEligibility`.

## Assumptions / decisions

1. **Discount steps stored as JSON arrays**, not a separate `CustomerDiscountStep` table.
   The spec suggested a child entity, but the discount set is always read/written as an
   ordered whole, is small, and is snapshotted onto each transaction line anyway. JSON keeps
   reads/writes atomic and ordering trivial. (Switching to a child table later is mechanical.)
   Order is preserved by array index; the UI supports add/edit/delete/reorder.

2. **SQLite enums.** SQLite has no native enums, so `ProductType` (LM/BR) and
   `TransactionStatus` (PIUTANG/LUNAS) are stored as strings and constrained with Zod at the
   application boundary. With Postgres these can become real Prisma enums.

3. **Bonus bon status.** A bonus bon is stored with `status = LUNAS`, `ongkir = 0`,
   `omzetTotal/profitTotal/amountOwed = 0`, and `bonusUnitsGranted >= 1`. Storing it as LUNAS
   ensures it never appears as outstanding Piutang. It is excluded from every financial total
   and surfaced only via bonus markers and the bonus log. `bonusUnitsGranted` records how many
   bonuses were consumed.

4. **Bonus eligibility formula.**
   `bonusesAvailable = floor(accumulatedPaidOmzet / threshold) − bonusesAlreadyGranted`,
   where `accumulatedPaidOmzet` = Σ omzet of Lunas non-bonus transactions, and
   `bonusesAlreadyGranted` = Σ `bonusUnitsGranted`. `consumedAmount = granted × threshold`,
   `carryOver = accumulated − consumed`. **Threshold ≤ 0 disables** the program for that
   customer (treated as "no bonus"). Granting more bonuses than available is rejected
   server-side (and the UI caps the input).

5. **Transaction soft-delete.** Transactions use `deletedAt` soft-delete for auditability;
   all reports, lists, and aggregates filter on `deletedAt: null`. Master data (customers,
   products) is soft-deleted and hidden from new selections, while historical line snapshots
   keep old bons fully intact and correct.

6. **Editing a bon recalculates** omzet/profit/owed and rebuilds line snapshots from the
   currently selected customer/product master data (the documented "edit recalculates"
   behavior). Settlement status and payment date for normal transactions are preserved across
   edits; unedited bons keep their original snapshots forever.

7. **Ongkir** is pass-through: included in amount owed / total paid, excluded from omzet and
   Laba HL. Bonus bons force ongkir to 0.

8. **Harga Modal** is internal only — used solely for Laba HL. It is never shown in
   customer-facing PDFs (Piutang list, transaction list, customer-scoped recaps). Internal
   recaps may show Laba HL but not raw modal prices.

9. **Auth/session.** One admin account, seeded from `ADMIN_USERNAME`/`ADMIN_PASSWORD`
   (bcrypt-hashed). Session is an 8-hour signed JWT in an httpOnly cookie. Middleware
   protects all pages and API routes except `/login` and the login API. No self-registration;
   re-seeding upserts the admin and removes any other users.

## Testing

- **Unit tests** (`src/lib/calc.test.ts`, 23 cases): cascading discount (57.6 not 50),
  discount validation, line/transaction math, ongkir handling, recognized totals, bonus math.
- **Integration tests** (`src/lib/services/services.test.ts`, 15 cases) run against a real
  Postgres test DB (set `TEST_DATABASE_URL`; `vitest.global-setup.ts` runs `prisma db push
  --force-reset`, and the suite skips cleanly when no DB is provided): transaction
  creation/calculation, duplicate Nomor Bon, soft-delete hiding
  with preserved history, edit recalculation, cash-basis recognition, single + whole-month
  settlement (with already-Lunas skip and other-month isolation), the full bonus worked
  scenario (10jt/25jt → 2, grant 2 → consume 20jt / carry 5jt), over-grant prevention, bonus
  exclusion from recaps, LM-vs-BR breakdown, per-customer recap, transaction soft-delete
  exclusion, and the eligible-customers helper.
- PDF generation was validated end-to-end (valid `%PDF` output for piutang/transactions/recap
  endpoints) during development.

## Known limitations / deferred

- Reports expose month/year + customer filters in the UI; LM/BR is shown as a built-in
  breakdown rather than a separate toggle (every recap already splits LM vs BR).
- No CSV export (PDF only, per spec). No multi-user/roles (single-user by design).
- PostgreSQL is used everywhere (local, tests, Vercel, Docker); there is no SQLite path to
  migrate away from.
