/** Reporting / recap service. All money via decimal-safe aggregation in calc.ts. */
import { prisma } from "@/lib/db";
import { Decimal } from "decimal.js";
import { calculateRecognizedTotals } from "@/lib/calc";

export interface ReportFilters {
  year?: number;
  month?: number; // 1..12
  customerId?: string;
}

function dateRange(year?: number, month?: number) {
  if (!year) return undefined;
  if (month) {
    return {
      gte: new Date(year, month - 1, 1, 0, 0, 0, 0),
      lt: new Date(year, month, 1, 0, 0, 0, 0),
    };
  }
  return {
    gte: new Date(year, 0, 1, 0, 0, 0, 0),
    lt: new Date(year + 1, 0, 1, 0, 0, 0, 0),
  };
}

export async function getFilteredTransactions(filters: ReportFilters) {
  const range = dateRange(filters.year, filters.month);
  return prisma.transaction.findMany({
    where: {
      deletedAt: null,
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(range ? { tanggal: range } : {}),
    },
    include: { customer: true, lines: true },
    orderBy: { tanggal: "asc" },
  });
}

export interface RecapTotals {
  recognizedOmzet: number;
  recognizedProfit: number;
  totalPaid: number;
  totalOutstandingPiutang: number;
  omzetLM: number;
  omzetBR: number;
  profitLM: number;
  profitBR: number;
  countLunas: number;
  countPiutang: number;
  countBonus: number;
}

type TxnWithLines = Awaited<ReturnType<typeof getFilteredTransactions>>[number];

/** Compute recap totals for a list of transactions (bonus excluded from financials). */
export function computeRecap(txns: TxnWithLines[]): RecapTotals {
  const base = calculateRecognizedTotals(
    txns.map((t) => ({
      status: t.status as "PIUTANG" | "LUNAS",
      isBonus: t.isBonus,
      omzetTotal: t.omzetTotal,
      profitTotal: t.profitTotal,
      ongkir: t.ongkir,
    }))
  );

  let omzetLM = new Decimal(0);
  let omzetBR = new Decimal(0);
  let profitLM = new Decimal(0);
  let profitBR = new Decimal(0);
  let countLunas = 0;
  let countPiutang = 0;
  let countBonus = 0;

  for (const t of txns) {
    if (t.isBonus) {
      countBonus++;
      continue;
    }
    if (t.status === "LUNAS") {
      countLunas++;
      for (const l of t.lines) {
        if (l.productTypeSnapshot === "LM") {
          omzetLM = omzetLM.plus(l.lineOmzetSnapshot);
          profitLM = profitLM.plus(l.lineProfitSnapshot);
        } else {
          omzetBR = omzetBR.plus(l.lineOmzetSnapshot);
          profitBR = profitBR.plus(l.lineProfitSnapshot);
        }
      }
    } else if (t.status === "PIUTANG") {
      countPiutang++;
    }
  }

  return {
    recognizedOmzet: base.recognizedOmzet.toNumber(),
    recognizedProfit: base.recognizedProfit.toNumber(),
    totalPaid: base.totalPaid.toNumber(),
    totalOutstandingPiutang: base.totalOutstandingPiutang.toNumber(),
    omzetLM: omzetLM.toNumber(),
    omzetBR: omzetBR.toNumber(),
    profitLM: profitLM.toNumber(),
    profitBR: profitBR.toNumber(),
    countLunas,
    countPiutang,
    countBonus,
  };
}

/** Recap grouped per customer. */
export async function recapPerCustomer(filters: ReportFilters) {
  const txns = await getFilteredTransactions(filters);
  const byCustomer = new Map<string, TxnWithLines[]>();
  for (const t of txns) {
    const arr = byCustomer.get(t.customerId) ?? [];
    arr.push(t);
    byCustomer.set(t.customerId, arr);
  }
  const rows = Array.from(byCustomer.entries()).map(([customerId, list]) => ({
    customerId,
    customerName: list[0].customer.nama,
    ...computeRecap(list),
  }));
  rows.sort((a, b) => b.recognizedOmzet - a.recognizedOmzet);
  return rows;
}

/** Overall recap across all customers. */
export async function recapOverall(filters: ReportFilters) {
  const txns = await getFilteredTransactions(filters);
  return computeRecap(txns);
}

/** Bonus log: all bonus bons within filters. */
export async function bonusLog(filters: ReportFilters) {
  const range = dateRange(filters.year, filters.month);
  return prisma.transaction.findMany({
    where: {
      deletedAt: null,
      isBonus: true,
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(range ? { tanggal: range } : {}),
    },
    include: { customer: true, lines: true },
    orderBy: { tanggal: "desc" },
  });
}
