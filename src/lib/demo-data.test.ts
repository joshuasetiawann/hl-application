/** Integration tests for the shared demo dataset (seed script + dashboard button). */
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { seedDemoData } from "@/lib/demo-data";

const RUN_DB = !!process.env.TEST_DATABASE_URL;
const d = RUN_DB ? describe : describe.skip;

async function wipe() {
  await prisma.transactionLine.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
}

d("seedDemoData", () => {
  beforeEach(wipe);

  it("fills an empty database with a coherent demo dataset", async () => {
    const result = await seedDemoData(prisma);

    expect(result).toMatchObject({ seeded: true, customers: 2, products: 4, transactions: 6 });
    expect(await prisma.customer.count()).toBe(2);
    expect(await prisma.product.count()).toBe(4);
    expect(await prisma.transaction.count()).toBe(6);

    // Mix of statuses the dashboard/reports rely on.
    expect(await prisma.transaction.count({ where: { status: "PIUTANG" } })).toBe(2);
    expect(await prisma.transaction.count({ where: { isBonus: true } })).toBe(1);

    // Money snapshots are persisted (non-zero omzet on a known bon).
    const bon = await prisma.transaction.findUnique({
      where: { nomorBon: "HL-1002" },
      include: { lines: true },
    });
    expect(bon?.omzetTotal).toBeGreaterThan(0);
    expect(bon?.lines.length).toBeGreaterThan(0);
  });

  it("is idempotent — a second run neither duplicates nor errors", async () => {
    await seedDemoData(prisma);
    const second = await seedDemoData(prisma);

    expect(second.seeded).toBe(false); // already complete
    expect(await prisma.customer.count()).toBe(2);
    expect(await prisma.product.count()).toBe(4);
    expect(await prisma.transaction.count()).toBe(6);
  });

  it("self-heals a partial seed (customers exist, no bons yet)", async () => {
    // Simulate an interrupted earlier seed: a leftover customer, zero bons.
    await prisma.customer.create({ data: { id: "demo-cust-a", nama: "Toko Maju Jaya" } });

    const result = await seedDemoData(prisma);

    expect(result.seeded).toBe(true);
    expect(await prisma.transaction.count()).toBe(6); // completed
  });

  it("clears cuid leftovers from an old seed (no duplicate-named clutter)", async () => {
    // Old buggy seed created same-named customers/products with cuid ids, no bons.
    await prisma.customer.create({ data: { nama: "Toko Maju Jaya" } });
    await prisma.customer.create({ data: { nama: "CV Sumber Rejeki" } });
    await prisma.product.create({
      data: { nama: "Panel LM Standar", tipe: "LM", hargaBase: 1, hargaModal: 1 },
    });

    const result = await seedDemoData(prisma);

    expect(result.seeded).toBe(true);
    // Orphans removed, demo seeded fresh: exactly the demo set, no duplicates.
    expect(await prisma.customer.count()).toBe(2);
    expect(await prisma.product.count()).toBe(4);
    expect(await prisma.transaction.count()).toBe(6);
  });

  it("refuses to run when REAL business data exists (a non-demo bon)", async () => {
    const c = await prisma.customer.create({ data: { nama: "Pelanggan Asli" } });
    const p = await prisma.product.create({
      data: { nama: "Produk Asli", tipe: "LM", hargaBase: 100, hargaModal: 40 },
    });
    await prisma.transaction.create({
      data: {
        nomorBon: "REAL-001",
        customerId: c.id,
        omzetTotal: 100,
        profitTotal: 60,
        amountOwed: 100,
        lines: {
          create: {
            productId: p.id,
            quantity: 1,
            productNameSnapshot: p.nama,
            productTypeSnapshot: "LM",
            hargaBaseSnapshot: 100,
            hargaModalSnapshot: 40,
            discountStepsSnapshot: "[]",
            discountedUnitPriceSnapshot: 100,
            lineOmzetSnapshot: 100,
            lineProfitSnapshot: 60,
          },
        },
      },
    });

    const result = await seedDemoData(prisma);

    expect(result.seeded).toBe(false);
    expect(await prisma.customer.count()).toBe(1); // untouched
    expect(await prisma.transaction.count()).toBe(1); // only the real bon
  });
});
