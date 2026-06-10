/** Integration tests for the shared demo dataset (seed script + dashboard button). */
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { seedDemoData } from "@/lib/demo-data";

const RUN_DB = !!process.env.TEST_DATABASE_URL;
const d = RUN_DB ? describe : describe.skip;

d("seedDemoData", () => {
  beforeEach(async () => {
    await prisma.transactionLine.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.product.deleteMany();
    await prisma.customer.deleteMany();
  });

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

  it("refuses to run when customers already exist", async () => {
    await prisma.customer.create({ data: { nama: "Data Asli" } });

    const result = await seedDemoData(prisma);

    expect(result.seeded).toBe(false);
    expect(await prisma.customer.count()).toBe(1); // untouched
    expect(await prisma.transaction.count()).toBe(0);
  });
});
