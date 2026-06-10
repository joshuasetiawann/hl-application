/**
 * Seed the single admin user from environment variables (ADMIN_USERNAME, ADMIN_PASSWORD)
 * and — only when the database is empty — the demo dataset from
 * src/lib/demo-data.ts (customers, products, transactions) so the app is
 * immediately explorable. Set SEED_DEMO=false to skip the demo data.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedDemoData } from "../src/lib/demo-data";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";

  // Create the admin only if missing — re-running (e.g. on every Vercel deploy)
  // must NOT overwrite a password the user already changed via set-password.
  const existingAdmin = await prisma.user.findUnique({ where: { username } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { username, passwordHash } });
    console.log(`✔ Admin user created: ${username}`);
  } else {
    console.log(`• Admin user already exists: ${username} (password unchanged)`);
  }
  // Single-user app: drop any other accounts.
  await prisma.user.deleteMany({ where: { username: { not: username } } });

  // Demo data fills an EMPTY database only (seedDemoData refuses otherwise),
  // so a fresh deploy is demo-ready out of the box. Opt out with SEED_DEMO=false.
  if (process.env.SEED_DEMO === "false") {
    console.log("• Skipping demo data (SEED_DEMO=false).");
    return;
  }
  const result = await seedDemoData(prisma);
  if (result.seeded) {
    console.log(
      `✔ Seeded demo data: ${result.customers} customers, ${result.products} products, ${result.transactions} transactions`
    );
  } else {
    console.log("• Customers already exist — skipping demo data.");
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
