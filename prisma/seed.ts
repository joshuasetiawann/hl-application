/**
 * Seed the single admin user from environment variables.
 *   ADMIN_USERNAME, ADMIN_PASSWORD
 * Re-running updates the password to match the env (idempotent). No demo data is required,
 * but a couple of example records are added only if the database is empty.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  });
  console.log(`✔ Admin user ready: ${username}`);

  // Ensure exactly one user: remove any other accounts (single-user app).
  await prisma.user.deleteMany({ where: { username: { not: username } } });

  const customerCount = await prisma.customer.count();
  if (customerCount === 0) {
    const cust = await prisma.customer.create({
      data: {
        nama: "Contoh Pelanggan A",
        lmDiscounts: JSON.stringify([20, 20, 10]),
        brDiscounts: JSON.stringify([15, 10]),
        bonusThreshold: 10_000_000,
      },
    });
    await prisma.product.createMany({
      data: [
        { nama: "Produk LM 1", tipe: "LM", hargaModal: 40_000, hargaBase: 100_000 },
        { nama: "Produk BR 1", tipe: "BR", hargaModal: 60_000, hargaBase: 120_000 },
      ],
    });
    console.log(`✔ Seeded example customer (${cust.nama}) and products`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
