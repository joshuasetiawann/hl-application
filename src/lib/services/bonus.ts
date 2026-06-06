/** Bonus eligibility service — accumulates paid omzet and computes available bonuses. */
import { prisma } from "@/lib/db";
import { calculateBonusEligibility, type BonusEligibility } from "@/lib/calc";

/**
 * Compute bonus eligibility for a single customer.
 *
 *  - accumulatedPaidOmzet = sum of omzetTotal for Lunas, non-bonus, non-deleted transactions
 *  - bonusesAlreadyGranted = sum of bonusUnitsGranted across that customer's bonus bons (non-deleted)
 */
export async function getCustomerBonusEligibility(
  customerId: string
): Promise<BonusEligibility & { customerId: string }> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { bonusThreshold: true },
  });
  const threshold = customer?.bonusThreshold ?? 0;

  const paidAgg = await prisma.transaction.aggregate({
    where: {
      customerId,
      status: "LUNAS",
      isBonus: false,
      deletedAt: null,
    },
    _sum: { omzetTotal: true },
  });

  const grantedAgg = await prisma.transaction.aggregate({
    where: {
      customerId,
      isBonus: true,
      deletedAt: null,
    },
    _sum: { bonusUnitsGranted: true },
  });

  const eligibility = calculateBonusEligibility({
    threshold,
    accumulatedPaidOmzet: paidAgg._sum.omzetTotal ?? 0,
    bonusesAlreadyGranted: grantedAgg._sum.bonusUnitsGranted ?? 0,
  });

  return { ...eligibility, customerId };
}

/** Count customers (active) that currently have at least one available bonus. */
export async function getEligibleCustomers(): Promise<
  { id: string; nama: string; bonusesAvailable: number }[]
> {
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null, bonusThreshold: { gt: 0 } },
    select: { id: true, nama: true },
  });

  const results: { id: string; nama: string; bonusesAvailable: number }[] = [];
  for (const c of customers) {
    const e = await getCustomerBonusEligibility(c.id);
    if (e.bonusesAvailable > 0) {
      results.push({ id: c.id, nama: c.nama, bonusesAvailable: e.bonusesAvailable });
    }
  }
  return results;
}
