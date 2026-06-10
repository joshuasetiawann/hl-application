#!/usr/bin/env node
/**
 * Bake the session secret into src/lib/auth-secret.ts before a production build
 * so the app runs with ZERO configuration AND the value is identical in the Node
 * runtime and the Edge middleware bundle.
 *
 * Why bake instead of relying on process.env at runtime? Next.js inlines env vars
 * into the Edge (middleware) bundle at BUILD time. If a secret is only present at
 * runtime (e.g. a platform-generated value not available during `next build`), the
 * middleware would use a different value than the login route and silently reject
 * every session. Baking removes that whole class of bug.
 *
 *   - AUTH_SECRET set at build time  -> bake exactly that value.
 *   - AUTH_SECRET absent             -> bake a fresh per-build random value
 *                                       (sessions reset on each deploy; fine for a
 *                                        single-admin app).
 *
 * Runs from scripts/vercel-build.mjs and the "build" npm script. Safe + idempotent:
 * any failure logs a warning and exits 0 so the build never breaks here.
 */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const FILE = join(here, "..", "src", "lib", "auth-secret.ts");

try {
  const src = readFileSync(FILE, "utf8");
  if (!/const BAKED_SECRET = "[^"]*";/.test(src)) {
    console.warn("[gen-auth-secret] marker not found in auth-secret.ts — skipping.");
    process.exit(0);
  }

  const provided = process.env.AUTH_SECRET;
  const hasEnv = !!provided && provided.length >= 16;
  const secret = hasEnv ? provided : randomBytes(32).toString("hex");

  // Function replacement + JSON.stringify so any character in the secret (incl. $,
  // ", \) is escaped correctly and never interpreted as a regex back-reference.
  const literal = JSON.stringify(secret);
  writeFileSync(
    FILE,
    src.replace(/const BAKED_SECRET = "[^"]*";/, () => `const BAKED_SECRET = ${literal};`)
  );

  console.log(
    hasEnv
      ? "[gen-auth-secret] Baked the provided AUTH_SECRET (Edge middleware and Node now agree)."
      : "[gen-auth-secret] No AUTH_SECRET — baked a per-build random secret so login works out of the box."
  );
} catch (err) {
  console.warn(`[gen-auth-secret] skipped (${err?.message ?? err}).`);
  process.exit(0);
}
