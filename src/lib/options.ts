import { prisma } from "@/lib/db";
import { parseDiscountArray } from "@/lib/serialize";
import type { ProductType } from "@/lib/calc";

/** Active customers shaped for the transaction form. */
export async function getActiveCustomerOptions() {
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    orderBy: { nama: "asc" },
  });
  return customers.map((c) => ({
    id: c.id,
    nama: c.nama,
    lmDiscounts: parseDiscountArray(c.lmDiscounts),
    brDiscounts: parseDiscountArray(c.brDiscounts),
    bonusThreshold: c.bonusThreshold,
  }));
}

/** Active products shaped for the transaction form. */
export async function getActiveProductOptions() {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: [{ tipe: "asc" }, { nama: "asc" }],
  });
  return products.map((p) => ({
    id: p.id,
    nama: p.nama,
    tipe: p.tipe as ProductType,
    hargaBase: p.hargaBase,
    hargaModal: p.hargaModal,
  }));
}
