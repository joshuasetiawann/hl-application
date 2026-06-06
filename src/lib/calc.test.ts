import { describe, it, expect } from "vitest";
import {
  applyCascadingDiscount,
  isValidDiscountStep,
  isValidDiscountSet,
  calculateLine,
  calculateTransaction,
  calculateRecognizedTotals,
  calculateBonusEligibility,
} from "./calc";

describe("applyCascadingDiscount", () => {
  it("applies discounts sequentially, not summed (100 with [20,20,10] = 57.6)", () => {
    expect(applyCascadingDiscount(100, [20, 20, 10]).toNumber()).toBe(57.6);
  });

  it("effective discount is 42.4%, not 50%", () => {
    const result = applyCascadingDiscount(100, [20, 20, 10]).toNumber();
    expect(result).not.toBe(50);
    expect(100 - result).toBeCloseTo(42.4, 10);
  });

  it("returns base price for empty discount set", () => {
    expect(applyCascadingDiscount(1000, []).toNumber()).toBe(1000);
  });

  it("handles single discount", () => {
    expect(applyCascadingDiscount(200, [25]).toNumber()).toBe(150);
  });

  it("is decimal-safe (no floating point drift)", () => {
    // 0.1 + 0.2 style issues should not appear
    // 1000000 * 0.9 * 0.95 * 0.975 = 833625 exactly, no float drift.
    expect(applyCascadingDiscount(1000000, [10, 5, 2.5]).toNumber()).toBe(833625);
  });
});

describe("discount validation", () => {
  it("rejects values below 0", () => {
    expect(isValidDiscountStep(-1)).toBe(false);
  });
  it("rejects values above 100", () => {
    expect(isValidDiscountStep(101)).toBe(false);
  });
  it("rejects non-numeric", () => {
    expect(isValidDiscountStep("20" as unknown)).toBe(false);
    expect(isValidDiscountStep(NaN)).toBe(false);
    expect(isValidDiscountStep(null)).toBe(false);
  });
  it("accepts 0 and 100 inclusive", () => {
    expect(isValidDiscountStep(0)).toBe(true);
    expect(isValidDiscountStep(100)).toBe(true);
    expect(isValidDiscountStep(42.4)).toBe(true);
  });
  it("validates whole sets", () => {
    expect(isValidDiscountSet([20, 20, 10])).toBe(true);
    expect(isValidDiscountSet([20, -1])).toBe(false);
    expect(isValidDiscountSet("nope")).toBe(false);
  });
});

describe("calculateLine", () => {
  it("computes omzet and profit for a normal line", () => {
    const line = calculateLine({
      basePrice: 100,
      hargaModal: 40,
      qty: 2,
      discountSteps: [20, 20, 10],
    });
    expect(line.discountedUnitPrice.toNumber()).toBe(57.6);
    expect(line.lineOmzet.toNumber()).toBe(115.2);
    // (57.6 - 40) * 2 = 35.2
    expect(line.lineProfit.toNumber()).toBeCloseTo(35.2, 10);
  });

  it("bonus line is free: 0 omzet and 0 profit", () => {
    const line = calculateLine({
      basePrice: 100,
      hargaModal: 40,
      qty: 5,
      discountSteps: [10],
      isBonus: true,
    });
    expect(line.lineOmzet.toNumber()).toBe(0);
    expect(line.lineProfit.toNumber()).toBe(0);
  });
});

describe("calculateTransaction", () => {
  it("ongkir is included in amount owed but excluded from omzet and profit", () => {
    const txn = calculateTransaction({
      lines: [
        { basePrice: 100, hargaModal: 40, qty: 1, discountSteps: [] }, // omzet 100, profit 60
      ],
      ongkir: 25000,
    });
    expect(txn.omzetTotal.toNumber()).toBe(100);
    expect(txn.profitTotal.toNumber()).toBe(60);
    expect(txn.amountOwed.toNumber()).toBe(25100);
  });

  it("sums multiple lines for omzet excluding ongkir", () => {
    const txn = calculateTransaction({
      lines: [
        { basePrice: 1000, hargaModal: 500, qty: 2, discountSteps: [] },
        { basePrice: 2000, hargaModal: 1000, qty: 1, discountSteps: [10] },
      ],
      ongkir: 5000,
    });
    // line1 omzet 2000, line2 omzet 1800 => 3800
    expect(txn.omzetTotal.toNumber()).toBe(3800);
    expect(txn.amountOwed.toNumber()).toBe(8800);
  });

  it("bonus bon has 0 omzet, 0 amount owed, 0 profit impact", () => {
    const txn = calculateTransaction({
      lines: [{ basePrice: 100, hargaModal: 40, qty: 3, discountSteps: [10] }],
      ongkir: 10000,
      isBonus: true,
    });
    expect(txn.omzetTotal.toNumber()).toBe(0);
    expect(txn.profitTotal.toNumber()).toBe(0);
    expect(txn.amountOwed.toNumber()).toBe(0);
  });
});

describe("calculateRecognizedTotals", () => {
  const txns = [
    { status: "LUNAS" as const, isBonus: false, omzetTotal: 1000, profitTotal: 400, ongkir: 50 },
    { status: "PIUTANG" as const, isBonus: false, omzetTotal: 2000, profitTotal: 800, ongkir: 100 },
    { status: "LUNAS" as const, isBonus: true, omzetTotal: 0, profitTotal: 0, ongkir: 0 },
  ];

  it("recognized omzet and profit count only Lunas non-bonus", () => {
    const t = calculateRecognizedTotals(txns);
    expect(t.recognizedOmzet.toNumber()).toBe(1000);
    expect(t.recognizedProfit.toNumber()).toBe(400);
  });

  it("total paid includes ongkir for Lunas non-bonus", () => {
    const t = calculateRecognizedTotals(txns);
    expect(t.totalPaid.toNumber()).toBe(1050);
  });

  it("outstanding piutang includes only Piutang non-bonus and equals omzet + ongkir", () => {
    const t = calculateRecognizedTotals(txns);
    expect(t.totalOutstandingPiutang.toNumber()).toBe(2100);
  });

  it("bonus transactions are excluded from all recap totals", () => {
    const onlyBonus = calculateRecognizedTotals([
      { status: "LUNAS", isBonus: true, omzetTotal: 9999, profitTotal: 9999, ongkir: 9999 },
    ]);
    expect(onlyBonus.recognizedOmzet.toNumber()).toBe(0);
    expect(onlyBonus.totalPaid.toNumber()).toBe(0);
    expect(onlyBonus.totalOutstandingPiutang.toNumber()).toBe(0);
  });
});

describe("calculateBonusEligibility", () => {
  it("threshold 10jt with paid omzet 25jt and none granted => 2 bonuses", () => {
    const e = calculateBonusEligibility({
      threshold: 10_000_000,
      accumulatedPaidOmzet: 25_000_000,
      bonusesAlreadyGranted: 0,
    });
    expect(e.bonusesAvailable).toBe(2);
  });

  it("granting 2 bonuses consumes 20jt and leaves 5jt carryover", () => {
    const e = calculateBonusEligibility({
      threshold: 10_000_000,
      accumulatedPaidOmzet: 25_000_000,
      bonusesAlreadyGranted: 2,
    });
    expect(e.consumedAmount.toNumber()).toBe(20_000_000);
    expect(e.carryOver.toNumber()).toBe(5_000_000);
    expect(e.bonusesAvailable).toBe(0);
  });

  it("threshold 0 disables bonus program", () => {
    const e = calculateBonusEligibility({
      threshold: 0,
      accumulatedPaidOmzet: 99_000_000,
      bonusesAlreadyGranted: 0,
    });
    expect(e.enabled).toBe(false);
    expect(e.bonusesAvailable).toBe(0);
  });

  it("bonuses stack and never go negative", () => {
    const e = calculateBonusEligibility({
      threshold: 5_000_000,
      accumulatedPaidOmzet: 4_000_000,
      bonusesAlreadyGranted: 0,
    });
    expect(e.bonusesAvailable).toBe(0);
  });
});
