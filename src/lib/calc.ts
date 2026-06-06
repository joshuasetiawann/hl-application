/**
 * Master Calculation Reference — single source of truth for all money math.
 *
 * Business rules:
 *  - Currency: IDR only. No tax/PPN anywhere.
 *  - Decimal-safe arithmetic via decimal.js (never naive float for money).
 *  - Cascading (diskon bertingkat) discounts are applied sequentially, never summed.
 *  - Omzet excludes Ongkir. Ongkir is pass-through (affects amount owed, not omzet/profit).
 *  - Laba HL = (discounted unit price - harga modal) * qty.
 *  - Bonus lines are free: 0 omzet, 0 receivable, 0 profit.
 *  - Recognized omzet/profit only count when status = Lunas AND isBonus = false.
 */
import { Decimal } from "decimal.js";

// Use enough precision for IDR money math.
Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

export type ProductType = "LM" | "BR";
export type TransactionStatus = "PIUTANG" | "LUNAS";

/**
 * Apply an ordered list of cascading discount steps to a base price.
 *
 * discountedUnitPrice = B * (1 - d1/100) * (1 - d2/100) * ... * (1 - dn/100)
 *
 * Example: applyCascadingDiscount(100, [20, 20, 10]) === 57.6  (NOT 50).
 */
export function applyCascadingDiscount(
  basePrice: number | string | Decimal,
  discountSteps: ReadonlyArray<number>
): Decimal {
  let price = new Decimal(basePrice);
  for (const step of discountSteps) {
    const d = new Decimal(step);
    price = price.times(new Decimal(1).minus(d.dividedBy(100)));
  }
  return price;
}

/** Validate a single discount step value (0..100 inclusive, numeric). */
export function isValidDiscountStep(value: unknown): boolean {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  return value >= 0 && value <= 100;
}

/** Validate an entire discount set. */
export function isValidDiscountSet(steps: unknown): steps is number[] {
  return Array.isArray(steps) && steps.every(isValidDiscountStep);
}

export interface CalculateLineInput {
  basePrice: number;
  hargaModal: number;
  qty: number;
  discountSteps: ReadonlyArray<number>;
  isBonus?: boolean;
}

export interface CalculatedLine {
  discountedUnitPrice: Decimal;
  lineOmzet: Decimal;
  lineProfit: Decimal;
}

/**
 * Calculate a single transaction line.
 * Bonus lines are free: discounted unit price is still computed for display,
 * but omzet and profit are forced to 0.
 */
export function calculateLine(input: CalculateLineInput): CalculatedLine {
  const { basePrice, hargaModal, qty, discountSteps, isBonus = false } = input;
  const discountedUnitPrice = applyCascadingDiscount(basePrice, discountSteps);

  if (isBonus) {
    return {
      discountedUnitPrice,
      lineOmzet: new Decimal(0),
      lineProfit: new Decimal(0),
    };
  }

  const qd = new Decimal(qty);
  const lineOmzet = discountedUnitPrice.times(qd);
  const lineProfit = discountedUnitPrice.minus(new Decimal(hargaModal)).times(qd);
  return { discountedUnitPrice, lineOmzet, lineProfit };
}

export interface CalculateTransactionInput {
  lines: ReadonlyArray<CalculateLineInput>;
  ongkir: number;
  isBonus?: boolean;
}

export interface CalculatedTransaction {
  omzetTotal: Decimal; // excludes ongkir
  profitTotal: Decimal; // excludes ongkir
  ongkir: Decimal;
  amountOwed: Decimal; // omzet + ongkir (0 for bonus bon)
  lines: CalculatedLine[];
}

/**
 * Calculate a whole transaction/bon.
 * For a bonus bon: every line is free, omzet/profit are 0, ongkir is forced to 0,
 * and amount owed is 0 (bonus never increases Piutang).
 */
export function calculateTransaction(
  input: CalculateTransactionInput
): CalculatedTransaction {
  const isBonus = input.isBonus ?? false;
  const lines = input.lines.map((l) =>
    calculateLine({ ...l, isBonus })
  );

  if (isBonus) {
    return {
      omzetTotal: new Decimal(0),
      profitTotal: new Decimal(0),
      ongkir: new Decimal(0),
      amountOwed: new Decimal(0),
      lines,
    };
  }

  const omzetTotal = lines.reduce(
    (acc, l) => acc.plus(l.lineOmzet),
    new Decimal(0)
  );
  const profitTotal = lines.reduce(
    (acc, l) => acc.plus(l.lineProfit),
    new Decimal(0)
  );
  const ongkir = new Decimal(input.ongkir);
  const amountOwed = omzetTotal.plus(ongkir);

  return { omzetTotal, profitTotal, ongkir, amountOwed, lines };
}

/** Pick the right discount set for a customer given a product type. */
export function discountSetForType(
  customer: { lmDiscounts: number[]; brDiscounts: number[] },
  tipe: ProductType
): number[] {
  return tipe === "LM" ? customer.lmDiscounts : customer.brDiscounts;
}

// ---- Aggregate / recognized totals -------------------------------------------------

export interface TxnForTotals {
  status: TransactionStatus;
  isBonus: boolean;
  omzetTotal: number; // persisted snapshot (excludes ongkir)
  profitTotal: number; // persisted snapshot
  ongkir: number;
}

export interface RecognizedTotals {
  recognizedOmzet: Decimal; // Lunas, non-bonus
  recognizedProfit: Decimal; // Lunas, non-bonus
  totalPaid: Decimal; // Lunas non-bonus: omzet + ongkir
  totalOutstandingPiutang: Decimal; // Piutang non-bonus: omzet + ongkir
}

/**
 * Aggregate recognized totals from a set of transactions.
 * Bonus transactions are always excluded.
 */
export function calculateRecognizedTotals(
  txns: ReadonlyArray<TxnForTotals>
): RecognizedTotals {
  let recognizedOmzet = new Decimal(0);
  let recognizedProfit = new Decimal(0);
  let totalPaid = new Decimal(0);
  let totalOutstandingPiutang = new Decimal(0);

  for (const t of txns) {
    if (t.isBonus) continue;
    const owed = new Decimal(t.omzetTotal).plus(t.ongkir);
    if (t.status === "LUNAS") {
      recognizedOmzet = recognizedOmzet.plus(t.omzetTotal);
      recognizedProfit = recognizedProfit.plus(t.profitTotal);
      totalPaid = totalPaid.plus(owed);
    } else if (t.status === "PIUTANG") {
      totalOutstandingPiutang = totalOutstandingPiutang.plus(owed);
    }
  }

  return {
    recognizedOmzet,
    recognizedProfit,
    totalPaid,
    totalOutstandingPiutang,
  };
}

// ---- Bonus eligibility -------------------------------------------------------------

export interface BonusEligibilityInput {
  threshold: number; // Rupiah, >= 0. 0 => disabled.
  // Paid (Lunas, non-bonus) omzet accumulated for the customer.
  accumulatedPaidOmzet: number;
  // Total bonus units already granted for the customer.
  bonusesAlreadyGranted: number;
}

export interface BonusEligibility {
  enabled: boolean;
  threshold: Decimal;
  accumulatedPaidOmzet: Decimal;
  bonusesAlreadyGranted: number;
  bonusesAvailable: number;
  consumedAmount: Decimal;
  carryOver: Decimal;
}

/**
 * Compute bonus eligibility.
 *
 *   bonusesAvailable = floor(accumulatedPaidOmzet / threshold) - bonusesAlreadyGranted
 *   consumedAmount   = bonusesAlreadyGranted * threshold
 *   carryOver        = accumulatedPaidOmzet - consumedAmount
 *
 * If threshold <= 0 the bonus program is disabled for the customer.
 */
export function calculateBonusEligibility(
  input: BonusEligibilityInput
): BonusEligibility {
  const threshold = new Decimal(input.threshold);
  const accumulatedPaidOmzet = new Decimal(input.accumulatedPaidOmzet);
  const bonusesAlreadyGranted = input.bonusesAlreadyGranted;

  if (threshold.lte(0)) {
    return {
      enabled: false,
      threshold,
      accumulatedPaidOmzet,
      bonusesAlreadyGranted,
      bonusesAvailable: 0,
      consumedAmount: new Decimal(0),
      carryOver: accumulatedPaidOmzet,
    };
  }

  const totalEarned = accumulatedPaidOmzet.dividedBy(threshold).floor().toNumber();
  const bonusesAvailable = Math.max(0, totalEarned - bonusesAlreadyGranted);
  const consumedAmount = threshold.times(bonusesAlreadyGranted);
  const carryOver = accumulatedPaidOmzet.minus(consumedAmount);

  return {
    enabled: true,
    threshold,
    accumulatedPaidOmzet,
    bonusesAlreadyGranted,
    bonusesAvailable,
    consumedAmount,
    carryOver,
  };
}

/** Round a Decimal to a JS number suitable for persistence (IDR allows fractional from discounts). */
export function toMoneyNumber(d: Decimal): number {
  // Keep up to 2 decimal places for fractional discount results (e.g. 57.6).
  return d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}
