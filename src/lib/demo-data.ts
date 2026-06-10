/**
 * Demo dataset: customers with LM/BR cascading discounts, products, and a
 * realistic mix of transactions (Piutang, Lunas, and a bonus bon) spread over
 * last month + this month, so every screen has something to show.
 *
 * Shared by prisma/seed.ts (SEED_DEMO=true) and POST /api/admin/seed-demo
 * (the "Isi Data Contoh" button on the empty dashboard). Only ever inserts
 * into an empty database — it refuses to touch existing business data.
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

function iso(year: number, month1: number, day: number): Date {
  return new Date(year, month1 - 1, day, 9, 0, 0, 0);
}

export async function seedDemoData(prisma: PrismaClient): Promise<DemoSeedResult> {
  if ((await prisma.customer.count()) > 0) {
    return { seeded: false, customers: 0, products: 0, transactions: 0 };
  }

  // --- Customers ---
  const custA = await prisma.customer.create({
    data: {
      nama: "Toko Maju Jaya",
      lmDiscounts: JSON.stringify([20, 20, 10]),
      brDiscounts: JSON.stringify([15, 10]),
      bonusThreshold: 10_000_000,
    },
  });
  const custB = await prisma.customer.create({
    data: {
      nama: "CV Sumber Rejeki",
      lmDiscounts: JSON.stringify([10]),
      brDiscounts: JSON.stringify([5, 5]),
      bonusThreshold: 5_000_000,
    },
  });

  // --- Products ---
  const lmA = await prisma.product.create({
    data: { nama: "Panel LM Standar", tipe: "LM", hargaBase: 1_000_000, hargaModal: 600_000 },
  });
  const lmB = await prisma.product.create({
    data: { nama: "Panel LM Premium", tipe: "LM", hargaBase: 2_500_000, hargaModal: 1_500_000 },
  });
  const brA = await prisma.product.create({
    data: { nama: "Bracket BR Kecil", tipe: "BR", hargaBase: 800_000, hargaModal: 500_000 },
  });
  const brB = await prisma.product.create({
    data: { nama: "Bracket BR Besar", tipe: "BR", hargaBase: 1_200_000, hargaModal: 700_000 },
  });

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const discountsByType = (c: { lmDiscounts: string; brDiscounts: string }, t: ProductType) =>
    JSON.parse(t === "LM" ? c.lmDiscounts : c.brDiscounts) as number[];

  type LineDef = {
    product: { id: string; nama: string; tipe: string; hargaBase: number; hargaModal: number };
    qty: number;
  };

  let transactions = 0;

  async function createBon(opts: {
    nomorBon: string;
    customer: { id: string; lmDiscounts: string; brDiscounts: string };
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
      discountSteps: discountsByType(opts.customer, l.product.tipe as ProductType),
    }));
    const result = calculateTransaction({ lines: calcLines, ongkir: opts.ongkir, isBonus });

    transactions++;
    return prisma.transaction.create({
      data: {
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
            const steps = discountsByType(opts.customer, l.product.tipe as ProductType);
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
    lines: [{ product: lmB, qty: 5 }], // omzet 7,200,000
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
    lines: [{ product: lmA, qty: 10 }], // omzet 5,760,000
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

  // Customer A is now bonus-eligible (>= 10,000,000 paid omzet). Grant 1 bonus.
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

  return { seeded: true, customers: 2, products: 4, transactions };
}
