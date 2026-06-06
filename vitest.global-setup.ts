import { execSync } from "node:child_process";

/**
 * Creates a fresh SQLite schema in the test database before the suite runs.
 * Uses `prisma db push --force-reset` so the test DB always matches schema.prisma
 * and is wiped clean between full test runs.
 */
export default function setup() {
  const env = {
    ...process.env,
    DATABASE_URL: "file:./test.db",
  };
  execSync("npx prisma db push --force-reset --skip-generate", {
    env,
    stdio: "ignore",
  });
}
