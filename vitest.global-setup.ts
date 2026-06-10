import { execSync } from "node:child_process";

/**
 * Prepares the integration-test database (Postgres — same engine as production).
 *
 * Set TEST_DATABASE_URL to a throwaway Postgres and this resets its schema with
 * `prisma db push --force-reset` so each full run starts clean. When it is not
 * set, the integration suite (src/lib/services/services.test.ts) skips itself and
 * only the pure unit tests run, so `npm test` stays green with no infrastructure.
 */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    console.warn(
      "[vitest] TEST_DATABASE_URL not set — skipping DB-backed integration tests. " +
        "Set it to a throwaway Postgres to run them (see vitest.config.ts)."
    );
    return;
  }
  execSync("npx prisma db push --force-reset --skip-generate", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "ignore",
  });
}
