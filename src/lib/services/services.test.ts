/**
 * Integration tests for the service layer against a real Postgres test DB.
 * The schema is created by vitest.global-setup.ts; each test starts from a clean slate.
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  createTransaction,
  updateTransaction,
  softDeleteTransaction,
  settleTransaction,
  settleMonth,
  BusinessError,
} from "@/lib/services/transaction";
import { getCustomerBonusEligibility, getEligibleCustomers } from "@/lib/services/bonus";
import { recapOverall, recapPerCustomer, getFilteredTransactions } from "@/lib/services/report";
import { stringifyDiscountArray } from "@/lib/serialize";

// These tests need a real Postgres (set TEST_DATABASE_URL). Without one they
// skip — the schema setup in vitest.global-setup.ts is skipped too — so the
// suite never fails just because no database is available locally.
const RUN_DB = !!process.env.TEST_DATABASE_URL;
const d = RUN_DB ? describe : describe.skip;

async function resetDb() {
  // Order matters due to FKs.
  await prisma.transactionLine.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
}

async function makeCustomer(opts?: {
  nama?: string;
  lm?: number[];
  br?: number[];
  threshold?: number;
}) {
  return prisma.customer.create({
    data: {
      nama: opts?.nama ?? "Cust",
      lmDiscounts: stringifyDiscountArray(opts?.lm ?? []),
      brDiscounts: stringifyDiscountArray(opts?.br ?? []),
      bonusThreshold: opts?.threshold ?? 0,
    },
  });
}

async function makeProduct(opts?: {
  nama?: string;
  tipe?: "LM" | "BR";
  base?: number;
  modal?: number;
}) {
  return prisma.product.create({
    data: {
      nama: opts?.nama ?? "Prod",
      tipe: opts?.tipe ?? "LM",
      hargaBase: opts?.base ?? 100,
      hargaModal: opts?.modal ?? 40,
    },
  });
}

if (RUN_DB) {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
}

d("transaction creation & calculation", () => {
  it("computes line omzet, total omzet (excl ongkir), amount owed (incl ongkir), laba (excl ongkir)", async () => {
    const c = await makeCustomer({ lm: [20, 20, 10] });
    const p = await makeProduct({ base: 100, modal: 40, tipe: "LM" });
    const t = await createTransaction({
      tanggal: "2026-06-01",
      nomorBon: "A-1",
      customerId: c.id,
      ongkir: 25000,
      deskripsi: "",
      isBonus: false,
      bonusUnitsGranted: 0,
      lines: [{ productId: p.id, quantity: 2 }],
    });
    expect(t.lines[0].discountedUnitPriceSnapshot).toBe(57.6);
    expect(t.lines[0].lineOmzetSnapshot).toBe(115.2); // 57.6 * 2
    expect(t.omzetTotal).toBe(115.2); // excludes ongkir
    expect(t.amountOwed).toBe(115.2 + 25000); // includes ongkir
    expect(t.profitTotal).toBe((57.6 - 40) * 2); // 35.2, ongkir excluded
    expect(t.status).toBe("PIUTANG"); // defaults to Piutang
  });

  it("rejects duplicate Nomor Bon", async () => {
    const c = await makeCustomer();
    const p = await makeProduct();
    const base = {
      tanggal: "2026-06-01",
      nomorBon: "DUP-1",
      customerId: c.id,
      ongkir: 0,
      deskripsi: "",
      isBonus: false,
      bonusUnitsGranted: 0,
      lines: [{ productId: p.id, quantity: 1 }],
    };
    await createTransaction(base);
    await expect(createTransaction(base)).rejects.toThrow(BusinessError);
  });

  it("rejects soft-deleted customer/product in new transactions but keeps history", async () => {
    const c = await makeCustomer();
    const p = await makeProduct({ nama: "Histori LM" });
    const t = await createTransaction({
      tanggal: "2026-06-01",
      nomorBon: "H-1",
      customerId: c.id,
      ongkir: 0,
      deskripsi: "",
      isBonus: false,
      bonusUnitsGranted: 0,
      lines: [{ productId: p.id, quantity: 1 }],
    });

    // Soft-delete both.
    await prisma.customer.update({ where: { id: c.id }, data: { deletedAt: new Date() } });
    await prisma.product.update({ where: { id: p.id }, data: { deletedAt: new Date() } });

    // New transaction referencing deleted product is rejected.
    await expect(
      createTransaction({
        tanggal: "2026-06-02",
        nomorBon: "H-2",
        customerId: c.id,
        ongkir: 0,
        deskripsi: "",
        isBonus: false,
        bonusUnitsGranted: 0,
        lines: [{ productId: p.id, quantity: 1 }],
      })
    ).rejects.toThrow(/dihapus/);

    // History snapshot preserved.
    const hist = await prisma.transaction.findUnique({
      where: { id: t.id },
      include: { lines: true },
    });
    expect(hist?.lines[0].productNameSnapshot).toBe("Histori LM");
  });

  it("editing a transaction recalculates totals", async () => {
    const c = await makeCustomer({ lm: [20, 20, 10] });
    const p = await makeProduct({ base: 100, modal: 40, tipe: "LM" });
    const t = await createTransaction({
      tanggal: "2026-06-01",
      nomorBon: "E-1",
      customerId: c.id,
      ongkir: 10000,
      deskripsi: "",
      isBonus: false,
      bonusUnitsGranted: 0,
      lines: [{ productId: p.id, quantity: 1 }],
    });
    expect(t.omzetTotal).toBe(57.6);

    const updated = await updateTransaction(t.id, {
      tanggal: "2026-06-01",
      nomorBon: "E-1",
      customerId: c.id,
      ongkir: 0,
      deskripsi: "",
      isBonus: false,
      bonusUnitsGranted: 0,
      lines: [{ productId: p.id, quantity: 3 }],
    });
    expect(updated.omzetTotal).toBe(57.6 * 3);
    expect(updated.amountOwed).toBe(57.6 * 3); // ongkir removed
  });
});

d("cash basis recognition", () => {
  it("Piutang is not recognized; Lunas is recognized", async () => {
    const c = await makeCustomer();
    const p = await makeProduct({ base: 1000, modal: 400, tipe: "LM" });
    const t = await createTransaction({
      tanggal: "2026-06-01",
      nomorBon: "CB-1",
      customerId: c.id,
      ongkir: 50,
      deskripsi: "",
      isBonus: false,
      bonusUnitsGranted: 0,
      lines: [{ productId: p.id, quantity: 1 }],
    });

    let recap = await recapOverall({ year: 2026, month: 6 });
    expect(recap.recognizedOmzet).toBe(0); // still Piutang
    expect(recap.totalOutstandingPiutang).toBe(1050);

    await settleTransaction(t.id, "2026-06-10");
    recap = await recapOverall({ year: 2026, month: 6 });
    expect(recap.recognizedOmzet).toBe(1000);
    expect(recap.recognizedProfit).toBe(600);
    expect(recap.totalPaid).toBe(1050);
    expect(recap.totalOutstandingPiutang).toBe(0);
  });
});

d("settlement flows", () => {
  it("settles a single bon only", async () => {
    const c = await makeCustomer();
    const p = await makeProduct({ base: 100, modal: 0 });
    const t1 = await createTransaction({
      tanggal: "2026-06-01", nomorBon: "S-1", customerId: c.id, ongkir: 0,
      deskripsi: "", isBonus: false, bonusUnitsGranted: 0, lines: [{ productId: p.id, quantity: 1 }],
    });
    const t2 = await createTransaction({
      tanggal: "2026-06-02", nomorBon: "S-2", customerId: c.id, ongkir: 0,
      deskripsi: "", isBonus: false, bonusUnitsGranted: 0, lines: [{ productId: p.id, quantity: 1 }],
    });
    await settleTransaction(t1.id, "2026-06-15");
    const a = await prisma.transaction.findUnique({ where: { id: t1.id } });
    const b = await prisma.transaction.findUnique({ where: { id: t2.id } });
    expect(a?.status).toBe("LUNAS");
    expect(a?.paymentDate).toBeTruthy();
    expect(b?.status).toBe("PIUTANG");
  });

  it("rejects re-settling an already-Lunas bon", async () => {
    const c = await makeCustomer();
    const p = await makeProduct({ base: 100, modal: 0 });
    const t = await createTransaction({
      tanggal: "2026-06-01", nomorBon: "S-3", customerId: c.id, ongkir: 0,
      deskripsi: "", isBonus: false, bonusUnitsGranted: 0, lines: [{ productId: p.id, quantity: 1 }],
    });
    await settleTransaction(t.id, "2026-06-15");
    await expect(settleTransaction(t.id, "2026-06-16")).rejects.toThrow(/sudah Lunas/);
  });

  it("settles a whole month, skipping already-Lunas and other months", async () => {
    const c = await makeCustomer();
    const p = await makeProduct({ base: 100, modal: 0 });
    const inJune1 = await createTransaction({
      tanggal: "2026-06-05", nomorBon: "M-1", customerId: c.id, ongkir: 0,
      deskripsi: "", isBonus: false, bonusUnitsGranted: 0, lines: [{ productId: p.id, quantity: 1 }],
    });
    const inJune2 = await createTransaction({
      tanggal: "2026-06-20", nomorBon: "M-2", customerId: c.id, ongkir: 0,
      deskripsi: "", isBonus: false, bonusUnitsGranted: 0, lines: [{ productId: p.id, quantity: 1 }],
    });
    const inJuly = await createTransaction({
      tanggal: "2026-07-01", nomorBon: "M-3", customerId: c.id, ongkir: 0,
      deskripsi: "", isBonus: false, bonusUnitsGranted: 0, lines: [{ productId: p.id, quantity: 1 }],
    });
    // Pre-settle one June bon — should be skipped, not re-settled.
    await settleTransaction(inJune1.id, "2026-06-10");

    const res = await settleMonth(c.id, 2026, 6, "2026-06-30");
    expect(res.count).toBe(1); // only M-2 was outstanding

    const m1 = await prisma.transaction.findUnique({ where: { id: inJune1.id } });
    const m2 = await prisma.transaction.findUnique({ where: { id: inJune2.id } });
    const m3 = await prisma.transaction.findUnique({ where: { id: inJuly.id } });
    expect(m1?.paymentDate?.toISOString().slice(0, 10)).toBe("2026-06-10"); // unchanged
    expect(m2?.status).toBe("LUNAS");
    expect(m3?.status).toBe("PIUTANG"); // July untouched
  });
});

d("bonus logic (worked scenario)", () => {
  it("threshold 10jt + paid 25jt => 2 available; granting 2 consumes 20jt, 5jt carryover", async () => {
    const c = await makeCustomer({ threshold: 10_000_000 });
    const p = await makeProduct({ base: 25_000_000, modal: 0, tipe: "BR" });
    const sale = await createTransaction({
      tanggal: "2026-06-01", nomorBon: "B-PAID", customerId: c.id, ongkir: 0,
      deskripsi: "", isBonus: false, bonusUnitsGranted: 0, lines: [{ productId: p.id, quantity: 1 }],
    });
    // Before settlement: not recognized => 0 bonuses.
    let e = await getCustomerBonusEligibility(c.id);
    expect(e.bonusesAvailable).toBe(0);

    await settleTransaction(sale.id, "2026-06-05");
    e = await getCustomerBonusEligibility(c.id);
    expect(e.accumulatedPaidOmzet.toNumber()).toBe(25_000_000);
    expect(e.bonusesAvailable).toBe(2);

    // Grant 2 in a bonus bon (free product).
    const bonus = await createTransaction({
      tanggal: "2026-06-06", nomorBon: "B-BONUS", customerId: c.id, ongkir: 5000,
      deskripsi: "", isBonus: true, bonusUnitsGranted: 2, lines: [{ productId: p.id, quantity: 1 }],
    });
    expect(bonus.omzetTotal).toBe(0);
    expect(bonus.amountOwed).toBe(0);
    expect(bonus.profitTotal).toBe(0);

    e = await getCustomerBonusEligibility(c.id);
    expect(e.bonusesAvailable).toBe(0);
    expect(e.consumedAmount.toNumber()).toBe(20_000_000);
    expect(e.carryOver.toNumber()).toBe(5_000_000);
  });

  it("prevents granting more bonuses than available", async () => {
    const c = await makeCustomer({ threshold: 10_000_000 });
    const p = await makeProduct({ base: 10_000_000, modal: 0, tipe: "BR" });
    const sale = await createTransaction({
      tanggal: "2026-06-01", nomorBon: "OG-1", customerId: c.id, ongkir: 0,
      deskripsi: "", isBonus: false, bonusUnitsGranted: 0, lines: [{ productId: p.id, quantity: 1 }],
    });
    await settleTransaction(sale.id, "2026-06-05"); // 1 bonus available
    await expect(
      createTransaction({
        tanggal: "2026-06-06", nomorBon: "OG-2", customerId: c.id, ongkir: 0,
        deskripsi: "", isBonus: true, bonusUnitsGranted: 2, lines: [{ productId: p.id, quantity: 1 }],
      })
    ).rejects.toThrow(/tersedia/);
  });

  it("bonus transaction is excluded from recaps and eligible-customer omzet", async () => {
    const c = await makeCustomer({ threshold: 10_000_000 });
    const p = await makeProduct({ base: 10_000_000, modal: 1_000_000, tipe: "BR" });
    const sale = await createTransaction({
      tanggal: "2026-06-01", nomorBon: "X-1", customerId: c.id, ongkir: 0,
      deskripsi: "", isBonus: false, bonusUnitsGranted: 0, lines: [{ productId: p.id, quantity: 1 }],
    });
    await settleTransaction(sale.id, "2026-06-05");
    await createTransaction({
      tanggal: "2026-06-06", nomorBon: "X-BONUS", customerId: c.id, ongkir: 0,
      deskripsi: "", isBonus: true, bonusUnitsGranted: 1, lines: [{ productId: p.id, quantity: 1 }],
    });
    const recap = await recapOverall({ year: 2026, month: 6 });
    expect(recap.recognizedOmzet).toBe(10_000_000); // bonus not added
    expect(recap.countBonus).toBe(1);
    expect(recap.countLunas).toBe(1);
  });
});

d("recap LM vs BR breakdown", () => {
  it("splits omzet/profit by product type for Lunas transactions", async () => {
    const c = await makeCustomer();
    const lm = await makeProduct({ nama: "LMx", tipe: "LM", base: 1000, modal: 400 });
    const br = await makeProduct({ nama: "BRx", tipe: "BR", base: 2000, modal: 800 });
    const t = await createTransaction({
      tanggal: "2026-06-01", nomorBon: "MIX-1", customerId: c.id, ongkir: 100,
      deskripsi: "", isBonus: false, bonusUnitsGranted: 0,
      lines: [
        { productId: lm.id, quantity: 2 }, // omzet 2000, profit 1200
        { productId: br.id, quantity: 1 }, // omzet 2000, profit 1200
      ],
    });
    await settleTransaction(t.id, "2026-06-05");
    const recap = await recapOverall({ year: 2026, month: 6 });
    expect(recap.omzetLM).toBe(2000);
    expect(recap.omzetBR).toBe(2000);
    expect(recap.profitLM).toBe(1200);
    expect(recap.profitBR).toBe(1200);
    expect(recap.recognizedOmzet).toBe(4000);
  });

  it("recapPerCustomer aggregates per customer", async () => {
    const c1 = await makeCustomer({ nama: "Alpha" });
    const c2 = await makeCustomer({ nama: "Beta" });
    const p = await makeProduct({ base: 1000, modal: 0 });
    const t1 = await createTransaction({
      tanggal: "2026-06-01", nomorBon: "PC-1", customerId: c1.id, ongkir: 0,
      deskripsi: "", isBonus: false, bonusUnitsGranted: 0, lines: [{ productId: p.id, quantity: 1 }],
    });
    await createTransaction({
      tanggal: "2026-06-01", nomorBon: "PC-2", customerId: c2.id, ongkir: 0,
      deskripsi: "", isBonus: false, bonusUnitsGranted: 0, lines: [{ productId: p.id, quantity: 5 }],
    });
    await settleTransaction(t1.id, "2026-06-05");
    const rows = await recapPerCustomer({ year: 2026, month: 6 });
    const alpha = rows.find((r) => r.customerName === "Alpha");
    const beta = rows.find((r) => r.customerName === "Beta");
    expect(alpha?.recognizedOmzet).toBe(1000);
    expect(beta?.recognizedOmzet).toBe(0); // still Piutang
    expect(beta?.totalOutstandingPiutang).toBe(5000);
  });
});

d("soft-delete on transactions", () => {
  it("excludes soft-deleted transactions from reports", async () => {
    const c = await makeCustomer();
    const p = await makeProduct({ base: 1000, modal: 0 });
    const t = await createTransaction({
      tanggal: "2026-06-01", nomorBon: "SD-1", customerId: c.id, ongkir: 0,
      deskripsi: "", isBonus: false, bonusUnitsGranted: 0, lines: [{ productId: p.id, quantity: 1 }],
    });
    await settleTransaction(t.id, "2026-06-05");
    await softDeleteTransaction(t.id);
    const recap = await recapOverall({ year: 2026, month: 6 });
    expect(recap.recognizedOmzet).toBe(0);
    const list = await getFilteredTransactions({ year: 2026, month: 6 });
    expect(list.length).toBe(0);
  });
});

d("eligible customers helper", () => {
  it("lists customers with available bonuses", async () => {
    const c = await makeCustomer({ nama: "Eligible", threshold: 10_000_000 });
    const p = await makeProduct({ base: 20_000_000, modal: 0, tipe: "BR" });
    const t = await createTransaction({
      tanggal: "2026-06-01", nomorBon: "EL-1", customerId: c.id, ongkir: 0,
      deskripsi: "", isBonus: false, bonusUnitsGranted: 0, lines: [{ productId: p.id, quantity: 1 }],
    });
    await settleTransaction(t.id, "2026-06-05");
    const eligible = await getEligibleCustomers();
    expect(eligible.find((e) => e.nama === "Eligible")?.bonusesAvailable).toBe(2);
  });
});
