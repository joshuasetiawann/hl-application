/** Transaction/Bon service — snapshot building, total computation, create/edit. */
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  calculateTransaction,
  discountSetForType,
  toMoneyNumber,
  type ProductType,
} from "@/lib/calc";
import { parseDiscountArray } from "@/lib/serialize";
import { getCustomerBonusEligibility } from "@/lib/services/bonus";
import type { TransactionInput } from "@/lib/validation";

export class BusinessError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

interface BuiltLine {
  productId: string;
  quantity: number;
  productNameSnapshot: string;
  productTypeSnapshot: ProductType;
  hargaBaseSnapshot: number;
  hargaModalSnapshot: number;
  discountStepsSnapshot: string;
  discountedUnitPriceSnapshot: number;
  lineOmzetSnapshot: number;
  lineProfitSnapshot: number;
}

interface BuiltTransaction {
  lines: BuiltLine[];
  omzetTotal: number;
  profitTotal: number;
  amountOwed: number;
  ongkir: number;
}

/**
 * Build line snapshots + transaction totals from raw input.
 * Validates that the customer & all products are active (not soft-deleted) for new selections.
 */
async function buildTransaction(
  input: TransactionInput,
  tx: Prisma.TransactionClient
): Promise<BuiltTransaction> {
  const customer = await tx.customer.findUnique({
    where: { id: input.customerId },
  });
  if (!customer) throw new BusinessError("Pelanggan tidak ditemukan");
  if (customer.deletedAt)
    throw new BusinessError("Pelanggan sudah dihapus dan tidak bisa dipilih");

  const lmDiscounts = parseDiscountArray(customer.lmDiscounts);
  const brDiscounts = parseDiscountArray(customer.brDiscounts);

  const builtLines: BuiltLine[] = [];
  const calcLines = [];

  for (const line of input.lines) {
    const product = await tx.product.findUnique({ where: { id: line.productId } });
    if (!product)
      throw new BusinessError(`Produk tidak ditemukan (${line.productId})`);
    if (product.deletedAt)
      throw new BusinessError(
        `Produk "${product.nama}" sudah dihapus dan tidak bisa dipilih`
      );

    const tipe = product.tipe as ProductType;
    const discountSteps = discountSetForType({ lmDiscounts, brDiscounts }, tipe);

    calcLines.push({
      basePrice: product.hargaBase,
      hargaModal: product.hargaModal,
      qty: line.quantity,
      discountSteps,
    });

    builtLines.push({
      productId: product.id,
      quantity: line.quantity,
      productNameSnapshot: product.nama,
      productTypeSnapshot: tipe,
      hargaBaseSnapshot: product.hargaBase,
      hargaModalSnapshot: product.hargaModal,
      discountStepsSnapshot: JSON.stringify(discountSteps),
      // filled below from calc result
      discountedUnitPriceSnapshot: 0,
      lineOmzetSnapshot: 0,
      lineProfitSnapshot: 0,
    });
  }

  const result = calculateTransaction({
    lines: calcLines,
    ongkir: input.ongkir,
    isBonus: input.isBonus,
  });

  result.lines.forEach((cl, i) => {
    builtLines[i].discountedUnitPriceSnapshot = toMoneyNumber(cl.discountedUnitPrice);
    builtLines[i].lineOmzetSnapshot = toMoneyNumber(cl.lineOmzet);
    builtLines[i].lineProfitSnapshot = toMoneyNumber(cl.lineProfit);
  });

  return {
    lines: builtLines,
    omzetTotal: toMoneyNumber(result.omzetTotal),
    profitTotal: toMoneyNumber(result.profitTotal),
    amountOwed: toMoneyNumber(result.amountOwed),
    ongkir: input.isBonus ? 0 : input.ongkir,
  };
}

/** Ensure a bonus bon does not grant more bonuses than currently available. */
async function assertBonusGrantAllowed(
  customerId: string,
  unitsToGrant: number,
  excludeTransactionId: string | null,
  tx: Prisma.TransactionClient
) {
  if (unitsToGrant <= 0) {
    throw new BusinessError("Bonus bon harus memberikan minimal 1 bonus");
  }
  // Recompute eligibility excluding the transaction being edited (so editing in place works).
  const customer = await tx.customer.findUnique({
    where: { id: customerId },
    select: { bonusThreshold: true },
  });
  const threshold = customer?.bonusThreshold ?? 0;
  if (threshold <= 0) {
    throw new BusinessError(
      "Pelanggan ini tidak memiliki program bonus (threshold 0)"
    );
  }

  const paidAgg = await tx.transaction.aggregate({
    where: { customerId, status: "LUNAS", isBonus: false, deletedAt: null },
    _sum: { omzetTotal: true },
  });
  const grantedAgg = await tx.transaction.aggregate({
    where: {
      customerId,
      isBonus: true,
      deletedAt: null,
      ...(excludeTransactionId ? { id: { not: excludeTransactionId } } : {}),
    },
    _sum: { bonusUnitsGranted: true },
  });

  const accumulated = paidAgg._sum.omzetTotal ?? 0;
  const alreadyGranted = grantedAgg._sum.bonusUnitsGranted ?? 0;
  const totalEarned = Math.floor(accumulated / threshold);
  const available = Math.max(0, totalEarned - alreadyGranted);

  if (unitsToGrant > available) {
    throw new BusinessError(
      `Tidak bisa memberikan ${unitsToGrant} bonus. Bonus tersedia hanya ${available}.`
    );
  }
}

export async function createTransaction(input: TransactionInput) {
  return prisma.$transaction(async (tx) => {
    // Unique Nomor Bon
    const existing = await tx.transaction.findUnique({
      where: { nomorBon: input.nomorBon },
    });
    if (existing) {
      throw new BusinessError(
        `Nomor Bon "${input.nomorBon}" sudah digunakan`,
        409
      );
    }

    if (input.isBonus) {
      await assertBonusGrantAllowed(
        input.customerId,
        input.bonusUnitsGranted,
        null,
        tx
      );
    }

    const built = await buildTransaction(input, tx);

    const created = await tx.transaction.create({
      data: {
        tanggal: new Date(input.tanggal),
        nomorBon: input.nomorBon,
        customerId: input.customerId,
        ongkir: built.ongkir,
        deskripsi: input.deskripsi,
        isBonus: input.isBonus,
        bonusUnitsGranted: input.isBonus ? input.bonusUnitsGranted : 0,
        // New normal transactions default to PIUTANG; bonus bons are recorded LUNAS-like
        // but excluded from all financials. We keep status PIUTANG semantics off for bonus
        // by storing them as LUNAS with 0 owed so they never appear as outstanding.
        status: input.isBonus ? "LUNAS" : "PIUTANG",
        paymentDate: input.isBonus ? new Date(input.tanggal) : null,
        omzetTotal: built.omzetTotal,
        profitTotal: built.profitTotal,
        amountOwed: built.amountOwed,
        lines: {
          create: built.lines,
        },
      },
      include: { lines: true, customer: true },
    });

    return created;
  });
}

export async function updateTransaction(id: string, input: TransactionInput) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.transaction.findUnique({ where: { id } });
    if (!current || current.deletedAt) {
      throw new BusinessError("Transaksi tidak ditemukan", 404);
    }

    // Unique Nomor Bon (excluding self)
    const dup = await tx.transaction.findFirst({
      where: { nomorBon: input.nomorBon, id: { not: id } },
    });
    if (dup) {
      throw new BusinessError(
        `Nomor Bon "${input.nomorBon}" sudah digunakan`,
        409
      );
    }

    if (input.isBonus) {
      await assertBonusGrantAllowed(
        input.customerId,
        input.bonusUnitsGranted,
        id,
        tx
      );
    }

    const built = await buildTransaction(input, tx);

    // Replace lines.
    await tx.transactionLine.deleteMany({ where: { transactionId: id } });

    // Preserve existing settlement status for normal transactions on edit.
    const keepStatus = input.isBonus ? "LUNAS" : current.status;
    const keepPaymentDate = input.isBonus
      ? new Date(input.tanggal)
      : current.status === "LUNAS"
        ? current.paymentDate
        : null;

    const updated = await tx.transaction.update({
      where: { id },
      data: {
        tanggal: new Date(input.tanggal),
        nomorBon: input.nomorBon,
        customerId: input.customerId,
        ongkir: built.ongkir,
        deskripsi: input.deskripsi,
        isBonus: input.isBonus,
        bonusUnitsGranted: input.isBonus ? input.bonusUnitsGranted : 0,
        status: keepStatus,
        paymentDate: keepPaymentDate,
        omzetTotal: built.omzetTotal,
        profitTotal: built.profitTotal,
        amountOwed: built.amountOwed,
        lines: { create: built.lines },
      },
      include: { lines: true, customer: true },
    });

    return updated;
  });
}

export async function softDeleteTransaction(id: string) {
  const current = await prisma.transaction.findUnique({ where: { id } });
  if (!current || current.deletedAt) {
    throw new BusinessError("Transaksi tidak ditemukan", 404);
  }
  return prisma.transaction.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

/** Settle a single bon. */
export async function settleTransaction(id: string, paymentDate: string) {
  return prisma.$transaction(async (tx) => {
    const t = await tx.transaction.findUnique({ where: { id } });
    if (!t || t.deletedAt)
      throw new BusinessError("Transaksi tidak ditemukan", 404);
    if (t.isBonus)
      throw new BusinessError("Bonus bon tidak perlu pelunasan");
    if (t.status === "LUNAS")
      throw new BusinessError("Transaksi sudah Lunas");

    return tx.transaction.update({
      where: { id },
      data: { status: "LUNAS", paymentDate: new Date(paymentDate) },
    });
  });
}

/** Settle all outstanding Piutang for a customer in a given month/year. */
export async function settleMonth(
  customerId: string,
  year: number,
  month: number,
  paymentDate: string
) {
  return prisma.$transaction(async (tx) => {
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 1, 0, 0, 0, 0);

    const toSettle = await tx.transaction.findMany({
      where: {
        customerId,
        status: "PIUTANG",
        isBonus: false,
        deletedAt: null,
        tanggal: { gte: start, lt: end },
      },
      select: { id: true },
    });

    if (toSettle.length === 0) {
      return { count: 0 };
    }

    const result = await tx.transaction.updateMany({
      where: { id: { in: toSettle.map((t) => t.id) } },
      data: { status: "LUNAS", paymentDate: new Date(paymentDate) },
    });

    return { count: result.count };
  });
}
