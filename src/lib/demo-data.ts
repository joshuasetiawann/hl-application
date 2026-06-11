/**
 * Demo dataset: customers with LM/BR cascading discounts, products, and a
 * realistic mix of transactions (Piutang, Lunas, and a bonus bon) spread over
 * last month + this month, so every screen has something to show.
 *
 * Shared by prisma/seed.ts and POST /api/admin/seed-demo (the "Isi Data Contoh"
 * button) and the runtime bootstrap.
 *
 * Idempotent & self-healing: every record uses a stable id / unique nomorBon
 * and is upserted, so a re-run completes a partial seed instead of duplicating
 * or getting stuck. It only ever writes the demo records below, and refuses to
 * run when REAL business data exists (any transaction whose nomorBon isn't one
 * of ours) — so a live database is never touched.
 */
import type { PrismaClient } from "@prisma/client";
// Relative import (not "@/lib/calc") so prisma/seed.ts can load this through
// tsx, which doesn't resolve tsconfig path aliases.
import {
  applyCascadingDiscount,
  calculateTransaction,
  toMoneyNumber,
  type ProductType,
} from "./calc";

export interface DemoSeedResult {
  seeded: boolean;
  customers: number;
  products: number;
  transactions: number;
}

/** Stable nomorBon values for the demo bons — used both to create and to detect them. */
const DEMO_BON_NUMBERS = [
  "HL-1001",
  "HL-1002",
  "HL-1003",
  "HL-BONUS-1",
  "HL-2001",
  "HL-2002",
] as const;

function iso(year: number, month1: number, day: number): Date {
  return new Date(year, month1 - 1, day, 9, 0, 0, 0);
}

type DemoCustomer = {
  id: string;
  lmDiscounts: string;
  brDiscounts: string;
};
type DemoProduct = {
  id: string;
  nama: string;
  tipe: ProductType;
  hargaBase: number;
  hargaModal: number;
};

export async function seedDemoData(prisma: PrismaClient): Promise<DemoSeedResult> {
  // Protect real data: if any non-demo bon exists, the app is in real use —
  // never seed. (Guarding on transactions, not customers, is what lets us
  // finish a half-finished demo seed where customers exist but bons don't.)
  const realTxns = await prisma.transaction.count({
    where: { nomorBon: { notIn: [...DEMO_BON_NUMBERS] } },
  });
  if (realTxns > 0) {
    return { seeded: false, customers: 0, products: 0, transactions: 0 };
  }
  // Already fully seeded → nothing to do.
  const existingDemoBons = await prisma.transaction.count({
    where: { nomorBon: { in: [...DEMO_BON_NUMBERS] } },
  });
  if (existingDemoBons >= DEMO_BON_NUMBERS.length) {
    return { seeded: false, customers: 0, products: 0, transactions: 0 };
  }

  // Clean up leftovers from an earlier interrupted seed: records with our demo
  // names but a non-demo id and NO transactions/lines. The `none` guards mean we
  // never remove anything with real history; it just prevents duplicate-named
  // clutter when re-seeding. (Only reached when there are zero real bons.)
  await prisma.transaction.deleteMany({
    where: { nomorBon: { in: [...DEMO_BON_NUMBERS] } },
  });
  await prisma.customer.deleteMany({
    where: {
      nama: { in: ["Toko Maju Jaya", "CV Sumber Rejeki"] },
      id: { notIn: ["demo-cust-a", "demo-cust-b"] },
      transactions: { none: {} },
    },
  });
  await prisma.product.deleteMany({
    where: {
      nama: { in: ["Panel LM Standar", "Panel LM Premium", "Bracket BR Kecil", "Bracket BR Besar"] },
      id: { notIn: ["demo-prod-lm-a", "demo-prod-lm-b", "demo-prod-br-a", "demo-prod-br-b"] },
      lines: { none: {} },
    },
  });

  // --- Customers (stable ids → upsert is idempotent) ---
  const custA = {
    id: "demo-cust-a",
    nama: "Toko Maju Jaya",
    lmDiscounts: JSON.stringify([20, 20, 10]),
    brDiscounts: JSON.stringify([15, 10]),
    bonusThreshold: 10_000_000,
  };
  const custB = {
    id: "demo-cust-b",
    nama: "CV Sumber Rejeki",
    lmDiscounts: JSON.stringify([10]),
    brDiscounts: JSON.stringify([5, 5]),
    bonusThreshold: 5_000_000,
  };
  for (const c of [custA, custB]) {
    await prisma.customer.upsert({ where: { id: c.id }, update: {}, create: c });
  }

  // --- Products (stable ids) ---
  const lmA: DemoProduct = { id: "demo-prod-lm-a", nama: "Panel LM Standar", tipe: "LM", hargaBase: 1_000_000, hargaModal: 600_000 };
  const lmB: DemoProduct = { id: "demo-prod-lm-b", nama: "Panel LM Premium", tipe: "LM", hargaBase: 2_500_000, hargaModal: 1_500_000 };
  const brA: DemoProduct = { id: "demo-prod-br-a", nama: "Bracket BR Kecil", tipe: "BR", hargaBase: 800_000, hargaModal: 500_000 };
  const brB: DemoProduct = { id: "demo-prod-br-b", nama: "Bracket BR Besar", tipe: "BR", hargaBase: 1_200_000, hargaModal: 700_000 };
  for (const p of [lmA, lmB, brA, brB]) {
    await prisma.product.upsert({ where: { id: p.id }, update: {}, create: p });
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const discountsByType = (c: DemoCustomer, t: ProductType) =>
    JSON.parse(t === "LM" ? c.lmDiscounts : c.brDiscounts) as number[];

  type LineDef = { product: DemoProduct; qty: number };

  async function createBon(opts: {
    nomorBon: string;
    customer: DemoCustomer;
    tanggal: Date;
    ongkir: number;
    lines: LineDef[];
    isBonus?: boolean;
    bonusUnitsGranted?: number;
    status?: "PIUTANG" | "LUNAS";
    paymentDate?: Date | null;
    deskripsi?: string;
  }) {
    const isBonus = opts.isBonus ?? false;
    const calcLines = opts.lines.map((l) => ({
      basePrice: l.product.hargaBase,
      hargaModal: l.product.hargaModal,
      qty: l.qty,
      discountSteps: discountsByType(opts.customer, l.product.tipe),
    }));
    const result = calculateTransaction({ lines: calcLines, ongkir: opts.ongkir, isBonus });

    // Upsert by unique nomorBon so re-running completes a partial seed without
    // duplicating; existing demo bons are left untouched.
    return prisma.transaction.upsert({
      where: { nomorBon: opts.nomorBon },
      update: {},
      create: {
        tanggal: opts.tanggal,
        nomorBon: opts.nomorBon,
        customerId: opts.customer.id,
        ongkir: isBonus ? 0 : opts.ongkir,
        deskripsi: opts.deskripsi ?? "",
        isBonus,
        bonusUnitsGranted: isBonus ? opts.bonusUnitsGranted ?? 0 : 0,
        status: isBonus ? "LUNAS" : opts.status ?? "PIUTANG",
        paymentDate: isBonus ? opts.tanggal : opts.paymentDate ?? null,
        omzetTotal: toMoneyNumber(result.omzetTotal),
        profitTotal: toMoneyNumber(result.profitTotal),
        amountOwed: toMoneyNumber(result.amountOwed),
        lines: {
          create: opts.lines.map((l, i) => {
            const steps = discountsByType(opts.customer, l.product.tipe);
            const dup = applyCascadingDiscount(l.product.hargaBase, steps);
            return {
              productId: l.product.id,
              quantity: l.qty,
              productNameSnapshot: l.product.nama,
              productTypeSnapshot: l.product.tipe,
              hargaBaseSnapshot: l.product.hargaBase,
              hargaModalSnapshot: l.product.hargaModal,
              discountStepsSnapshot: JSON.stringify(steps),
              discountedUnitPriceSnapshot: toMoneyNumber(dup),
              lineOmzetSnapshot: toMoneyNumber(result.lines[i].lineOmzet),
              lineProfitSnapshot: toMoneyNumber(result.lines[i].lineProfit),
            };
          }),
        },
      },
    });
  }

  // Customer A — last month: a settled (Lunas) bon.
  await createBon({
    nomorBon: "HL-1001",
    customer: custA,
    tanggal: iso(prevYear, prevMonth, 12),
    ongkir: 50_000,
    lines: [{ product: lmB, qty: 5 }],
    status: "LUNAS",
    paymentDate: iso(prevYear, prevMonth, 25),
    deskripsi: "Pesanan reguler",
  });
  // Customer A — this month: one settled, one outstanding.
  await createBon({
    nomorBon: "HL-1002",
    customer: custA,
    tanggal: iso(year, month, 3),
    ongkir: 75_000,
    lines: [{ product: lmA, qty: 10 }],
    status: "LUNAS",
    paymentDate: iso(year, month, 8),
  });
  await createBon({
    nomorBon: "HL-1003",
    customer: custA,
    tanggal: iso(year, month, 10),
    ongkir: 40_000,
    lines: [
      { product: brA, qty: 3 },
      { product: brB, qty: 2 },
    ],
    status: "PIUTANG",
    deskripsi: "Belum dibayar",
  });
  // Customer A is bonus-eligible → grant 1 bonus.
  await createBon({
    nomorBon: "HL-BONUS-1",
    customer: custA,
    tanggal: iso(year, month, 12),
    ongkir: 0,
    isBonus: true,
    bonusUnitsGranted: 1,
    lines: [{ product: brA, qty: 1 }],
    deskripsi: "Bonus loyalitas",
  });
  // Customer B — this month: outstanding + settled.
  await createBon({
    nomorBon: "HL-2001",
    customer: custB,
    tanggal: iso(year, month, 5),
    ongkir: 30_000,
    lines: [{ product: lmA, qty: 4 }],
    status: "PIUTANG",
  });
  await createBon({
    nomorBon: "HL-2002",
    customer: custB,
    tanggal: iso(year, month, 6),
    ongkir: 25_000,
    lines: [{ product: brB, qty: 6 }],
    status: "LUNAS",
    paymentDate: iso(year, month, 9),
  });

  return { seeded: true, customers: 2, products: 4, transactions: DEMO_BON_NUMBERS.length };
}
